import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { submitCommunityClaim, unclaimCommunity } from '@/src/lib/user-dal';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 10,
      windowMs: 60 * 1000,
      keyPrefix: 'claim_community',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many claim submissions. Please wait.', 10);
    }

    const auth = await resolveAuthContext(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Please log in to claim a community.' }, { status: 401 });
    }

    const body = await req.json();
    const { communityId, proofUrl, proofDetails } = body;

    if (!communityId) {
      return NextResponse.json({ success: false, error: 'Community ID is required.' }, { status: 400 });
    }

    const result = await submitCommunityClaim(auth.userId, communityId, proofUrl, proofDetails);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      claim: result.claim,
      message: 'Claim request submitted! Please add the verification code to your group bio or channel topic.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to submit claim' }, { status: 500 });
  }
}
