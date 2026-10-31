import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { runBatchLinkHealthCheck } from '@/src/lib/link-health';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  if (!cronSecret) return false;

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = (req.headers.get('x-cron-secret') || bearerToken).trim();

  if (!headerSecret) return false;

  const givenBuf = Buffer.from(headerSecret);
  const expectedBuf = Buffer.from(cronSecret);

  return (
    givenBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(givenBuf, expectedBuf)
  );
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized cron trigger. Valid CRON_SECRET Bearer token required.' },
      { status: 401 }
    );
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

    const result = await runBatchLinkHealthCheck(limit);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Link health check failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

