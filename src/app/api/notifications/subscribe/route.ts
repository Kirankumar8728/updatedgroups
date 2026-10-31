import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { savePushSubscription } from '@/src/lib/push-notifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    const body = await req.json();
    const { subscription, platform } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ success: false, error: 'Invalid subscription payload. Endpoint and keys are required.' }, { status: 400 });
    }

    await savePushSubscription({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userId: auth.userId || null,
      platform: platform || 'web'
    });

    return NextResponse.json({ success: true, message: 'Push subscription registered successfully' });
  } catch (error: any) {
    console.error('Subscription error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
