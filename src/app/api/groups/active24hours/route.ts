import { NextRequest, NextResponse } from 'next/server';
import { get24HourTrending } from '@/src/lib/groups-dal';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const data = await get24HourTrending(platform, limit);

    return NextResponse.json(
      {
        success: true,
        ...data,
      },
      {
        headers: REALTIME_NO_CACHE_HEADERS,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: REALTIME_NO_CACHE_HEADERS }
    );
  }
}
