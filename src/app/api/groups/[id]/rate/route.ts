import { NextRequest, NextResponse } from 'next/server';
import { getGroupById, rateGroup, logGroupAction } from '@/src/lib/groups-dal';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { recordCreditTransaction, getPlatformRewardSettings } from '@/src/lib/user-dal';
import { checkRateLimitAsync, rateLimitResponse, getClientIp } from '@/src/lib/rate-limit';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 30,
      windowMs: 60 * 1000,
      keyPrefix: 'rate_group',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many rating requests. Please slow down.', 30);
    }

    const { id } = await context.params;
    const body = await req.json();
    const rating = Number(body.rating);

    if (isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be a number between 1 and 5' },
        { status: 400, headers: REALTIME_NO_CACHE_HEADERS }
      );
    }

    const group = await getGroupById(id);
    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404, headers: REALTIME_NO_CACHE_HEADERS });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';
    const auth = await resolveAuthContext(req);

    // Log rating action into MySQL group_actions table
    await logGroupAction({
      groupId: group.id,
      actionType: 'rating',
      ipAddress: ip,
      userAgent,
      userId: auth.userId,
    });

    const result = await rateGroup(group.id, rating);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Failed to record rating' }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
    }

    let creditReward: { awarded: boolean; credits?: number; message?: string } = { awarded: false };
    if (auth.userId) {
      try {
        const rewardSettings = getPlatformRewardSettings();
        const ratingReward = rewardSettings.ratingReward !== undefined ? Number(rewardSettings.ratingReward) : 1;
        if (ratingReward > 0) {
          const ledgerRes = await recordCreditTransaction(
            auth.userId,
            'RATING_REWARD',
            ratingReward,
            `Community rating reward (${rating} stars)`,
            group.id,
            { groupTitle: group.title }
          );

          if (ledgerRes.success) {
            creditReward = {
              awarded: true,
              credits: ratingReward,
              message: `You earned +${ratingReward} credit${ratingReward > 1 ? 's' : ''} for rating this community!`,
            };
          }
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      rating: result.rating,
      ratingCount: result.ratingCount,
      group: result,
      creditReward,
      message: 'Rating submitted successfully!',
    }, { headers: REALTIME_NO_CACHE_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
  }
}
