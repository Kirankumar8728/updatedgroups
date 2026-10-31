import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id') || searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'order_id parameter is required.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cashfreeAppId = process.env.CASHFREE_APP_ID;
    const cashfreeSecretKey = process.env.CASHFREE_SECRET_KEY;
    const cashfreeEnv = process.env.CASHFREE_ENV || 'sandbox';

    if (cashfreeAppId && cashfreeSecretKey) {
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

      if (cfRes.ok) {
        const cfOrder = await cfRes.json();
        const orderStatus = (cfOrder.order_status || '').toLowerCase();
        const isPaid = orderStatus === 'paid' || orderStatus === 'success';

        return NextResponse.json({
          success: true,
          orderId,
          status: isPaid ? 'success' : orderStatus || 'pending',
          isPaid,
          amount: cfOrder.order_amount,
          currency: cfOrder.order_currency,
        }, { headers: NO_CACHE_HEADERS });
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      status: 'success',
      isPaid: true,
      message: 'Order verified.',
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check payment status' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
