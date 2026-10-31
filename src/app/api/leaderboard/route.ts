import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboardData } from '@/src/lib/groups-dal';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const leaderboard = await getLeaderboardData(category);
  return NextResponse.json(
    { leaderboard },
    {
      headers: REALTIME_NO_CACHE_HEADERS,
    }
  );
}
