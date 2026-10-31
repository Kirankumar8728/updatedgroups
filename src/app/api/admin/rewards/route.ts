import { NextRequest, NextResponse } from 'next/server';
import { getPlatformRewardSettings, updatePlatformRewardSettings } from '@/src/lib/user-dal';
import { requireAdmin } from '@/src/lib/admin-auth';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const settings = getPlatformRewardSettings();
    return NextResponse.json({ success: true, settings }, { headers: REALTIME_NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json();
    const updated = updatePlatformRewardSettings({
      signupBonus: body.signupBonus !== undefined ? Number(body.signupBonus) : undefined,
      upvoteReward: body.upvoteReward !== undefined ? Number(body.upvoteReward) : undefined,
      shareReward: body.shareReward !== undefined ? Number(body.shareReward) : undefined,
      ratingReward: body.ratingReward !== undefined ? Number(body.ratingReward) : undefined,
      commentReward: body.commentReward !== undefined ? Number(body.commentReward) : undefined,
      referralReward: body.referralReward !== undefined ? Number(body.referralReward) : undefined,
    });

    return NextResponse.json({
      success: true,
      settings: updated,
      message: 'Reward settings updated successfully!',
    }, { headers: REALTIME_NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
  }
}
