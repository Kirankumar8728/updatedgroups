import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPool, executeDml } from '@/src/lib/db';
import { loadGroupsFromDisk, saveGroupsToDiskSync } from '@/src/lib/groups-persistence';

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
    let mysqlDeletedCount = 0;
    const pool = getPool();
    
    if (pool) {
      try {
        // Delete groups where isExpired = 1 and last updated/created over 30 days ago
        const [result]: any = await executeDml(
          `DELETE FROM groups_dir WHERE isExpired = 1 AND (updatedAt < NOW() - INTERVAL 30 DAY OR created_at < NOW() - INTERVAL 30 DAY)`
        );
        mysqlDeletedCount = result?.affectedRows || 0;
      } catch (dbErr) {
        console.warn('[CleanupExpired Cron] MySQL cleanup notice:', dbErr);
      }
    }

    // Clean up local disk JSON store as well if present
    let diskDeletedCount = 0;
    try {
      const diskGroups = loadGroupsFromDisk();
      if (Array.isArray(diskGroups) && diskGroups.length > 0) {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const freshGroups = diskGroups.filter(g => {
          if (!g.isExpired) return true;
          const groupTime = new Date(g.updatedAt || g.createdAt || Date.now()).getTime();
          const isOlderThan30Days = groupTime < thirtyDaysAgo;
          if (isOlderThan30Days) {
            diskDeletedCount++;
            return false;
          }
          return true;
        });

        if (diskDeletedCount > 0) {
          saveGroupsToDiskSync(freshGroups);
        }
      }
    } catch (diskErr) {
      console.warn('[CleanupExpired Cron] Disk store cleanup notice:', diskErr);
    }

    const totalCleaned = mysqlDeletedCount + diskDeletedCount;
    console.log(`[CleanupExpired Cron] Successfully cleaned up ${totalCleaned} expired groups (MySQL: ${mysqlDeletedCount}, Disk: ${diskDeletedCount}) older than 30 days.`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      mysqlDeletedCount,
      diskDeletedCount,
      totalCleaned,
      message: `Successfully cleaned up ${totalCleaned} expired groups older than 30 days.`,
    });
  } catch (err: any) {
    console.error('[CleanupExpired Cron Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Expired groups cleanup failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
