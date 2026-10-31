import { NextRequest, NextResponse } from 'next/server';
import { trackGroupShare, logGroupAction } from '@/src/lib/groups-dal';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { recordCreditTransaction, getPlatformRewardSettings } from '@/src/lib/user-dal';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';
import { getClientIp } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';
    const auth = await resolveAuthContext(req);

    // Log share action into MySQL group_actions table
    await logGroupAction({
      groupId: id,
      actionType: 'share',
      ipAddress: ip,
      userAgent,
      userId: auth.userId,
    });

    const updated = await trackGroupShare(id);
    if (!updated) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404, headers: REALTIME_NO_CACHE_HEADERS });
    }

    if (auth.userId) {
      try {
        const rewardSettings = getPlatformRewardSettings();
        const shareReward = rewardSettings.shareReward !== undefined ? Number(rewardSettings.shareReward) : 1;
        if (shareReward > 0) {
          await recordCreditTransaction(
            auth.userId,
            'SHARE_REWARD',
            shareReward,
            'Community share reward',
            id,
            { groupTitle: updated.title }
          );
        }
      } catch {}
    }

    return NextResponse.json(
      {
        success: true,
        shares: updated.shares,
        clicks: updated.clicks,
        upvotes: updated.upvotes,
        group: updated,
      },
      { headers: REALTIME_NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
  }
}
