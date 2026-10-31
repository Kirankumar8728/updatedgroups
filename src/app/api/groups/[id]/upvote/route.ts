import { NextRequest, NextResponse } from 'next/server';
import { upvoteGroup, getGroupById, logGroupAction } from '@/src/lib/groups-dal';
import { getPool } from '@/src/lib/db';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

const activeUpvoteLocks = new Map<string, number>();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await resolveAuthContext(req);
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';

    // Rate limit: 60 upvote actions per minute per IP
    const rateCheck = checkRateLimit(req, {
      limit: 60,
      windowMs: 60 * 1000,
      route: 'groups_upvote',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many voting requests. Please slow down.');
    }

    const group = await getGroupById(id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404, headers: REALTIME_NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action === 'remove' ? 'remove' : 'add';

    // Anti-rapid click cooldown (3 seconds) with in-memory lock & DB check
    if (action === 'add') {
      const lockKey = `${group.id}_${auth.userId || ip}`;
      const lastAttempt = activeUpvoteLocks.get(lockKey) || 0;
      if (Date.now() - lastAttempt < 3000) {
        return NextResponse.json(
          { success: true, upvotes: group.upvotes, group, message: 'Upvote already processed' },
          { headers: REALTIME_NO_CACHE_HEADERS }
        );
      }
      activeUpvoteLocks.set(lockKey, Date.now());

      const pool = await getPool();
      if (pool) {
        try {
          const [recent]: any = await pool.query(
            `SELECT createdAt FROM group_actions WHERE groupId = ? AND actionType = 'upvote' AND (ipAddress = ? OR userId = ?) ORDER BY createdAt DESC LIMIT 1`,
            [group.id, ip, auth.userId || 'none']
          );
          if (recent && recent.length > 0) {
            const lastTime = new Date(recent[0].createdAt).getTime();
            if (Date.now() - lastTime < 3000) {
              return NextResponse.json(
                { success: true, upvotes: group.upvotes, group, message: 'Upvote processed' },
                { headers: REALTIME_NO_CACHE_HEADERS }
              );
            }
          }
        } catch {}
      }

      await logGroupAction({
        groupId: group.id,
        actionType: 'upvote',
        ipAddress: ip,
        userAgent,
        userId: auth.userId,
      });
    }

    const updated = await upvoteGroup(group.id, action);
    if (!updated) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404, headers: REALTIME_NO_CACHE_HEADERS });
    }

    return NextResponse.json(
      { success: true, upvotes: updated.upvotes, group: updated },
      { headers: REALTIME_NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
  }
}
