import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { submitPromotionVerification } from '@/src/lib/user-dal';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 10,
      windowMs: 60 * 1000,
      keyPrefix: 'promotions_claim_reward',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many requests. Please wait.', 10);
    }

    const auth = await resolveAuthContext(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Please log in to submit promotion proof.' }, { status: 401 });
    }

    const body = await req.json();
    const { channelOrGroupUrl, platform, proofUrl, screenshotUrl, notes, trackingCode } = body;

    if (!channelOrGroupUrl || !channelOrGroupUrl.trim()) {
      return NextResponse.json({ success: false, error: 'Channel, group, or post URL is required.' }, { status: 400 });
    }

    submitPromotionVerification({
      userId: auth.userId,
      trackingCode: trackingCode || 'general',
      channelOrGroupUrl: channelOrGroupUrl.trim(),
      platform: platform || 'website',
      proofUrl: proofUrl || undefined,
      screenshotUrl: screenshotUrl || undefined,
      notes: notes || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Promotion proof submitted! Once verified by our verification bot or moderator, reward credits will be deposited into your ledger.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to submit promotion proof' }, { status: 500 });
  }
}
