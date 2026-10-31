import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { getPointsPackageById, calculateCustomPoints } from '@/src/utils/pointsPackages';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 10,
      windowMs: 60 * 1000,
      keyPrefix: 'points_create_order',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many order requests. Please wait.', 10);
    }

    const auth = await resolveAuthContext(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in to buy points.' },
        { status: 401 }
      );
    }

    const user = auth.user!;
    const body = await req.json();
    const {
      packageId,
      customAmount,
      customerPhone = '9999999999',
      customerEmail = 'user@grouplinks.app',
      customerName = 'Community Member',
    } = body;

    let price = 0;
    let basePoints = 0;
    let bonusPoints = 0;
    let totalPoints = 0;
    let packageName = 'Custom Points Pack';

    if (packageId) {
      const pack = getPointsPackageById(packageId);
      if (!pack) {
        return NextResponse.json(
          { success: false, error: 'Selected points package does not exist.' },
          { status: 400 }
        );
      }
      price = pack.price;
      basePoints = pack.points;
      bonusPoints = pack.bonusPoints;
      totalPoints = pack.points + pack.bonusPoints;
      packageName = pack.name;
    } else if (customAmount && Number(customAmount) >= 20) {
      const calc = calculateCustomPoints(Number(customAmount));
      price = Math.floor(Number(customAmount));
      basePoints = calc.points;
      bonusPoints = calc.bonusPoints;
      totalPoints = calc.totalPoints;
      packageName = `Custom Pack (${price} INR)`;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid points package or custom amount (minimum ₹20).' },
        { status: 400 }
      );
    }

    const orderId = `pts_${user.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(-8)}_${Date.now()}`;
    const cashfreeAppId = process.env.CASHFREE_APP_ID;
    const cashfreeSecretKey = process.env.CASHFREE_SECRET_KEY;
    const cashfreeEnv = process.env.CASHFREE_ENV || 'sandbox';

    const sanitizedPhone = customerPhone.replace(/\D/g, '').slice(-10) || '9999999999';
    const sanitizedEmail = (user.email || customerEmail).includes('@')
      ? (user.email || customerEmail).trim()
      : 'customer@grouplinks.app';
    const sanitizedName = (user.displayName || customerName || 'Community Member').trim();

    if (cashfreeAppId && cashfreeSecretKey) {
      try {
        const cashfreeBaseUrl =
          cashfreeEnv === 'production'
            ? 'https://api.cashfree.com/pg'
            : 'https://sandbox.cashfree.com/pg';

        const origin = req.nextUrl.origin || 'https://grouplinks.app';
        const cfPayload = {
          order_id: orderId,
          order_amount: price,
          order_currency: 'INR',
          customer_details: {
            customer_id: `cust_${user.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(-12)}`,
            customer_name: sanitizedName,
            customer_email: sanitizedEmail,
            customer_phone: sanitizedPhone,
          },
          order_meta: {
            return_url: `${origin}/?points_order_id={order_id}&status=success`,
            notify_url: `${origin}/api/cashfree/webhook`,
          },
          order_tags: {
            userId: user.id,
            planId: packageId || 'custom',
            type: 'points_purchase',
          },
          order_note: `GroupLinks Purchase: ${totalPoints} Points (${packageName}) for User ${user.displayName}`,
        };

        const cfResponse = await fetch(`${cashfreeBaseUrl}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-version': '2023-08-01',
            'x-client-id': cashfreeAppId,
            'x-client-secret': cashfreeSecretKey,
          },
          body: JSON.stringify(cfPayload),
        });

        if (cfResponse.ok) {
          const cfData: any = await cfResponse.json();
          return NextResponse.json({
            success: true,
            mode: 'live_cashfree',
            environment: cashfreeEnv,
            orderId: cfData.order_id || orderId,
            paymentSessionId: cfData.payment_session_id,
            cfOrderId: cfData.cf_order_id,
            price,
            basePoints,
            bonusPoints,
            totalPoints,
            packageName,
            user: {
              id: user.id,
              displayName: user.displayName,
              creditsBalance: user.creditsBalance,
            },
          });
        } else {
          const errData = await cfResponse.json().catch(() => ({}));
          return NextResponse.json({
            success: false,
            error: errData.message || 'Payment gateway order creation failed.',
          }, { status: 400 });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `Payment service unavailable: ${err.message}`,
        }, { status: 503 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Payment gateway not configured correctly. Please contact support.',
    }, { status: 501 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Points order creation failed.' },
      { status: 500 }
    );
  }
}
