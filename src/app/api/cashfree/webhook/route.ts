import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getGroupById, updateGroup } from '@/src/lib/groups-dal';
import { getBoostPlanById } from '@/src/utils/boostPlans';
import { recordCreditTransaction } from '@/src/lib/user-dal';

export const dynamic = 'force-dynamic';

function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secretKey: string
): boolean {
  if (!signature || !timestamp || !secretKey) return false;

  try {
    // Replay attack protection: ensure timestamp is within 5 minutes
    const tsNumber = Number(timestamp);
    if (!isNaN(tsNumber)) {
      const nowMs = Date.now();
      const webhookMs = tsNumber > 1e11 ? tsNumber : tsNumber * 1000;
      const differenceMs = Math.abs(nowMs - webhookMs);
      if (differenceMs > 5 * 60 * 1000) {
        console.warn('[Cashfree Webhook] Rejected expired webhook timestamp (potential replay attack)');
        return false;
      }
    }

    const dataToSign = `${timestamp}${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(dataToSign)
      .digest('base64');

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    if (!secretKey) {
      console.error('[Cashfree Webhook] CASHFREE_SECRET_KEY is not configured. Failing closed.');
      return NextResponse.json(
        { success: false, error: 'Payment gateway configuration missing. Webhook rejected.' },
        { status: 503 }
      );
    }

    if (!verifyCashfreeWebhookSignature(rawBody, timestamp, signature, secretKey)) {
      console.warn('[Cashfree Webhook] Webhook signature verification failed');
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature.' },
        { status: 401 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload in webhook body.' },
        { status: 400 }
      );
    }

    const eventType = payload.type || payload.event_type;
    const orderData = payload.data?.order || payload.order || {};
    const paymentData = payload.data?.payment || payload.payment || {};
    const orderId: string = orderData.order_id || payload.order_id || '';
    const paymentId: string = paymentData.payment_id || paymentData.cf_payment_id || '';
    const paymentStatus: string = (paymentData.payment_status || orderData.order_status || '').toUpperCase();
    const orderAmount = Number(orderData.order_amount || paymentData.payment_amount || 0);
    const orderCurrency = orderData.order_currency || paymentData.payment_currency || 'INR';

    if (!orderId) {
      return NextResponse.json({ success: true, message: 'No order_id present in webhook payload.' });
    }

    const isPaid =
      paymentStatus === 'SUCCESS' ||
      paymentStatus === 'PAID' ||
      eventType === 'PAYMENT_SUCCESS_WEBHOOK' ||
      eventType === 'ORDER_PAID_WEBHOOK';

    if (!isPaid) {
      return NextResponse.json({
        success: true,
        message: `Acknowledged payment status: ${paymentStatus}`
      });
    }

    // Webhook Idempotency Check: prevent duplicate awards or multiple extensions
    const eventKey = `cf_webhook_${paymentId || orderId}`;
    const globalStore = globalThis as unknown as { _processedWebhookEvents?: Set<string> };
    if (!globalStore._processedWebhookEvents) {
      globalStore._processedWebhookEvents = new Set();
    }

    if (globalStore._processedWebhookEvents.has(eventKey)) {
      return NextResponse.json({
        success: true,
        message: `Webhook event ${eventKey} was already processed (idempotent).`,
      });
    }
    globalStore._processedWebhookEvents.add(eventKey);

    // 1. Process Boost Order
    if (orderId.startsWith('boost_')) {
      const parts = orderId.split('_');
      const groupId = orderData.order_tags?.groupId || parts[1];
      const planId = orderData.order_tags?.planId || payload.data?.order?.order_tags?.planId || 'boost_1w';

      const plan = getBoostPlanById(planId);
      if (plan && groupId) {
        const group = await getGroupById(groupId);
        if (group) {
          const currentExpiry =
            group.isSticky && group.stickyUntil && new Date(group.stickyUntil).getTime() > Date.now()
              ? new Date(group.stickyUntil).getTime()
              : Date.now();
          const newExpiry = new Date(currentExpiry + plan.durationMs).toISOString();

          await updateGroup(group.id, {
            isSticky: true,
            isPromoted: true,
            stickyUntil: newExpiry,
            stickyOrder: 1,
            featured: true,
          } as any);
        }
      }
    }

    // 2. Process Points Purchase Order
    if (orderId.startsWith('pts_')) {
      const userId = orderData.order_tags?.userId || orderData.customer_details?.customer_id?.replace(/^cust_/, '');

      if (userId && orderAmount > 0) {
        const pointsAwarded = Math.floor(orderAmount * 10);
        await recordCreditTransaction(
          userId,
          'PURCHASED_CREDITS',
          pointsAwarded,
          `Cashfree Payment: Purchased ${pointsAwarded} credits (Order: ${orderId})`,
          orderId,
          {
            orderId,
            paymentId,
            amountPaid: orderAmount,
            currency: orderCurrency,
            provider: 'cashfree',
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Authoritative Cashfree payment verified and recorded.'
    });
  } catch (err: any) {
    console.error('[Cashfree Webhook] Error processing webhook:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}
