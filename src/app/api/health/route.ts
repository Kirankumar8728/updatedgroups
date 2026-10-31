import { NextResponse } from 'next/server';
import { isMySQLConfigured, pingDatabase } from '@/src/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const isDbConfigured = isMySQLConfigured();
  let dbStatus = 'not_configured';

  if (isDbConfigured) {
    const isAlive = await pingDatabase();
    dbStatus = isAlive ? 'connected' : 'unreachable';
  }

  return NextResponse.json(
    {
      status: 'ok',
      service: 'GroupLinks',
      database: dbStatus,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
      'X-Health-Status': 'ok',
    },
  });
}
