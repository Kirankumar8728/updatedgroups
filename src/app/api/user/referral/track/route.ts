import { NextRequest, NextResponse } from 'next/server';
import { recordReferralAttribution } from '@/src/lib/user-dal';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 30,
      windowMs: 60 * 1000,
      keyPrefix: 'referral_track',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many tracking requests.', 30);
    }

    const body = await req.json().catch(() => ({}));
    const { referralCode, visitorId, action } = body;

    if (action === 'qualify') {
      return NextResponse.json({
        success: true,
        qualified: true,
        rewardAwarded: false,
        amount: 0,
      });
    }

    if (!referralCode || !visitorId) {
      return NextResponse.json({ success: false, error: 'referralCode and visitorId required' }, { status: 400 });
    }

    const recorded = await recordReferralAttribution(referralCode, visitorId);

    return NextResponse.json({
      success: true,
      recorded,
      message: 'Referral tracking recorded',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to track referral' },
      { status: 500 }
    );
  }
}
