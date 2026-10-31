import { NextResponse } from 'next/server';
import { getNetworkStats } from '@/src/lib/groups-dal';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const stats = await getNetworkStats();
  return NextResponse.json(stats, {
    headers: REALTIME_NO_CACHE_HEADERS,
  });
}
