import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { runBatchImageHealthCheck } from '@/src/lib/groups-dal';
import { resolveAuthContext } from '@/src/lib/auth-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function verifyCronOrAdminAuth(req: NextRequest, authContext: any): boolean {
  // 1. Check CRON_SECRET if configured
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = (req.headers.get('x-cron-secret') || bearerToken).trim();

  if (cronSecret && headerSecret) {
    const givenBuf = Buffer.from(headerSecret);
    const expectedBuf = Buffer.from(cronSecret);
    if (givenBuf.length === expectedBuf.length && crypto.timingSafeEqual(givenBuf, expectedBuf)) {
      return true;
    }
  }

  // 2. Check if called by authenticated Admin
  if (authContext.isAdmin) {
    return true;
  }

  // 3. In development preview allow triggering for verification
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  try {
    const authContext = await resolveAuthContext(req);
    if (!verifyCronOrAdminAuth(req, authContext)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Valid CRON_SECRET or Admin Authorization required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);
    const autoFix = searchParams.get('fix') !== 'false';

    console.log(`[Cron Image Health] Starting daily image validation batch (limit: ${limit}, offset: ${offset}, autoFix: ${autoFix})...`);
    const result = await runBatchImageHealthCheck(limit, autoFix, offset);
    console.log(`[Cron Image Health] Completed: Checked ${result.totalChecked} groups, Valid: ${result.validCount}, Broken: ${result.brokenCount}, Fixed: ${result.fixedCount} in ${result.durationMs}ms`);

    return NextResponse.json({
      success: true,
      message: `Image validation check completed for ${result.totalChecked} communities.`,
      ...result,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[Cron Image Health Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Image health check failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
