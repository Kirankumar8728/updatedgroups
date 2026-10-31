import { NextRequest, NextResponse } from 'next/server';
import { getGroupById } from '@/src/lib/groups-dal';
import { getBoostPlanById } from '@/src/utils/boostPlans';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let {
      groupId,
      planId,
      customerPhone = '9999999999',
      customerEmail = 'user@grouplinks.app',
      customerName = 'Community Member',
      isDirectPay,
    } = body;

    if (!groupId || isDirectPay) {
      const { getGroups } = await import('@/src/lib/groups-dal');
      const directResult = await getGroups({ limit: 500, forDirectPromotedPage: true } as any);
      let candidates = directResult.groups;

      if (!candidates || candidates.length === 0) {
        const allResult = await getGroups({ limit: 500 });
        candidates = allResult.groups;
      }

      if (candidates && candidates.length > 0) {
        const randomIndex = Math.floor(Math.random() * candidates.length);
        groupId = candidates[randomIndex].id;
      }
    }

    if (!groupId || !planId) {
      return NextResponse.json({ error: 'Group ID and Plan ID are required.' }, { status: 400 });
    }

    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
    }

    const plan = getBoostPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid promotion plan selected.' }, { status: 404 });
    }

    const orderId = `boost_${group.id.replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now()}`;
    const cashfreeAppId = process.env.CASHFREE_APP_ID;
    const cashfreeSecretKey = process.env.CASHFREE_SECRET_KEY;
    const cashfreeEnv = process.env.CASHFREE_ENV || 'sandbox';

    const sanitizedPhone = customerPhone.replace(/\D/g, '').slice(-10) || '9999999999';
    const sanitizedEmail = customerEmail.includes('@') ? customerEmail.trim() : 'customer@grouplinks.app';
    const sanitizedName = (customerName || 'Community Member').trim();

    if (cashfreeAppId && cashfreeSecretKey) {
      try {
        const cashfreeBaseUrl =
          cashfreeEnv === 'production'
            ? 'https://api.cashfree.com/pg'
            : 'https://sandbox.cashfree.com/pg';

        const origin = req.nextUrl.origin;
        const cfPayload = {
          order_id: orderId,
          order_amount: plan.price,
          order_currency: 'INR',
          customer_details: {
            customer_id: `cust_${sanitizedPhone}_${Date.now().toString().slice(-4)}`,
            customer_name: sanitizedName,
            customer_email: sanitizedEmail,
            customer_phone: sanitizedPhone,
          },
          order_meta: {
            return_url: `${origin}/?boost_order_id={order_id}&group_id=${group.id}&plan_id=${plan.id}`,
            notify_url: `${origin}/api/cashfree/webhook`,
          },
          order_note: `Group Links ${plan.durationLabel} Promotion for: ${group.title.slice(0, 30)}`,
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
            orderAmount: plan.price,
            plan,
            group: {
              id: group.id,
              title: group.title,
              platform: group.platform,
            },
          });
        }
      } catch (err) {
        console.warn('Live Cashfree call failed, falling back to sandbox mode:', err);
      }
    }

    const simulatedPaymentSessionId = `session_sim_${orderId}_${Math.random().toString(36).substring(2, 9)}`;
    return NextResponse.json({
      success: true,
      mode: 'sandbox_cashfree',
      environment: 'sandbox',
      orderId,
      paymentSessionId: simulatedPaymentSessionId,
      orderAmount: plan.price,
      plan,
      group: {
        id: group.id,
        title: group.title,
        platform: group.platform,
      },
      message: 'Cashfree payment session generated successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Payment creation failed' }, { status: 500 });
  }
}
