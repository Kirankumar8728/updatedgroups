import { NextRequest, NextResponse } from 'next/server';
import { getGroupById, updateGroup, getGroups } from '@/src/lib/groups-dal';
import { getBoostPlanById } from '@/src/utils/boostPlans';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Centralized rate limiting
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 10,
      windowMs: 60 * 1000,
      keyPrefix: 'cf_verify_payment',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many payment verification attempts. Please wait.', 10);
    }

    const auth = await resolveAuthContext(req);
    if (!auth.user || !auth.user.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to verify payment and activate community promotion.' },
        { status: 401 }
      );
    }
    const userId = auth.user.id;

    const body = await req.json();
    const { orderId, groupId, planId, isDirectPay } = body;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid Order ID is required to verify payment.' },
        { status: 400 }
      );
    }

    if (!planId || typeof planId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Boost Plan ID is required.' },
        { status: 400 }
      );
    }

    // Authoritative plan catalog lookup - do not trust client pricing
    const plan = getBoostPlanById(planId);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Invalid boost plan specified.' },
        { status: 400 }
      );
    }

    let targetGroupId = groupId;

    // Direct pay handling
    if (isDirectPay || !targetGroupId) {
      const directPromotedResult = await getGroups({ limit: 500 });
      const candidates = directPromotedResult.groups;
      if (candidates && candidates.length > 0) {
        const randomIndex = Math.floor(Math.random() * candidates.length);
        targetGroupId = candidates[randomIndex].id;
      }
    }

    if (!targetGroupId) {
      return NextResponse.json(
        { success: false, error: 'Target community could not be identified.' },
        { status: 400 }
      );
    }

    const group = await getGroupById(targetGroupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Target community was not found.' },
        { status: 404 }
      );
    }

    // Authorization check: User must be owner, claimed manager, or platform administrator
    const isOwner =
      auth.isAdmin ||
      !(group as any).ownerId || // Unclaimed group permitted for direct sponsor promotion
      (group as any).ownerId === userId ||
      (group as any).claimedByUserId === userId;

    if (!isOwner && !isDirectPay) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You are not authorized to manage promotion for this community.' },
        { status: 403 }
      );
    }

    let isPaymentVerified = false;
    let verifiedPaymentId: string | null = null;
    let paymentMetadata: any = {};

    const cashfreeAppId = process.env.CASHFREE_APP_ID;
    const cashfreeSecretKey = process.env.CASHFREE_SECRET_KEY;
    const cashfreeEnv = process.env.CASHFREE_ENV || 'sandbox';

    if (!cashfreeAppId || !cashfreeSecretKey) {
      return NextResponse.json(
        { success: false, error: 'Payment gateway configuration missing. Automatic payment verification is unavailable.' },
        { status: 503 }
      );
    }

    const cashfreeBaseUrl =
      cashfreeEnv === 'production'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';

    const cfRes = await fetch(`${cashfreeBaseUrl}/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': cashfreeAppId,
        'x-client-secret': cashfreeSecretKey,
      },
    });

    if (!cfRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve payment order details from Cashfree gateway.' },
        { status: 400 }
      );
    }

    const cfOrder: any = await cfRes.json();
    const orderStatus = (cfOrder.order_status || '').toUpperCase();

    if (orderStatus !== 'PAID' && orderStatus !== 'SUCCESS') {
      return NextResponse.json(
        { success: false, error: `Payment is not completed. Current order status: ${orderStatus}.` },
        { status: 400 }
      );
    }

    // Verify user identity on order tags
    const orderUserId = cfOrder.order_tags?.userId || cfOrder.customer_details?.customer_id?.replace(/^cust_/, '');
    if (orderUserId && orderUserId !== userId && !auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Payment order was created by a different user.' },
        { status: 403 }
      );
    }

    // Verify amount and currency authoritatively against plan pricing
    const orderAmount = Number(cfOrder.order_amount || 0);
    const orderCurrency = (cfOrder.order_currency || 'INR').toUpperCase();

    if (orderAmount < plan.price || orderCurrency !== 'INR') {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount or currency mismatch. Expected INR ${plan.price}, received ${orderCurrency} ${orderAmount}.`,
        },
        { status: 400 }
      );
    }

    isPaymentVerified = true;
    paymentMetadata = cfOrder;
    verifiedPaymentId = cfOrder.cf_order_id || orderId;

    if (!isPaymentVerified) {
      return NextResponse.json(
        { success: false, error: 'Payment could not be verified. Promotion cannot be activated.' },
        { status: 402 }
      );
    }

    // Order idempotency: Check if this order was already processed to prevent duplicate extensions
    const globalStore = globalThis as unknown as { _processedBoostOrders?: Set<string> };
    if (!globalStore._processedBoostOrders) {
      globalStore._processedBoostOrders = new Set();
    }

    if (globalStore._processedBoostOrders.has(orderId)) {
      return NextResponse.json({
        success: true,
        orderId,
        plan,
        group,
        stickyUntil: group.stickyUntil,
        message: `Order ${orderId} was already processed and community promotion is active (idempotent).`,
      });
    }
    globalStore._processedBoostOrders.add(orderId);

    const currentExpiry =
      group.isSticky && group.stickyUntil && new Date(group.stickyUntil).getTime() > Date.now()
        ? new Date(group.stickyUntil).getTime()
        : Date.now();
    const newExpiry = new Date(currentExpiry + plan.durationMs).toISOString();

    const updatedGroup = await updateGroup(group.id, {
      isSticky: true,
      isPromoted: true,
      isDirectPromoted: Boolean(isDirectPay),
      showInDirectPromoted: Boolean(isDirectPay) ? true : (group as any).showInDirectPromoted,
      stickyUntil: newExpiry,
      stickyOrder: 1,
      featured: true,
      lastActive: 'Just now',
    } as any);

    return NextResponse.json({
      success: true,
      orderId,
      plan,
      group: updatedGroup || group,
      stickyUntil: newExpiry,
      message: `Congratulations! ${group.title} has been successfully promoted for ${plan.durationLabel} and pinned to the top.`,
    });
  } catch (error: any) {
    console.error('[Cashfree Verify-Payment] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Payment verification failed.' },
      { status: 500 }
    );
  }
}
