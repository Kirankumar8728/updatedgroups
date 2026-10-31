import { NextRequest, NextResponse } from 'next/server';
import { getKeepAliveStatus, executeHeartbeatTick, startKeepAlive } from '@/src/lib/keepalive';

export const dynamic = 'force-dynamic';

export async function GET() {
  startKeepAlive();
  const status = getKeepAliveStatus();
  return NextResponse.json(
    {
      status: 'active',
      keepAlive: status,
      uptimeSeconds: process.uptime ? Math.floor(process.uptime()) : 0,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  startKeepAlive();
  const result = await executeHeartbeatTick();
  return NextResponse.json({
    success: true,
    message: 'Manual keep-alive heartbeat tick executed. Next scheduled wake in 4.50 minutes.',
    keepAlive: result,
  });
}
