import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Track process start time for accurate server uptime calculation
const startTime = Date.now();

import { getGroupsDatabase } from '@/src/lib/groups-store';

export async function GET() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memoryUsage = process.memoryUsage();
  const groups = getGroupsDatabase();

  return NextResponse.json(
    {
      status: 'ok',
      message: 'pong',
      uptime: `${uptimeSeconds}s`,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      groupCount: groups.length,
      memory: {
        rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Response-Time': `${Date.now() - Date.now()}ms`,
      },
    }
  );
}

// Support HEAD requests for lightweight uptime monitors (UptimeRobot, BetterStack, Cloudflare)
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'X-Uptime-Status': 'online',
    },
  });
}
