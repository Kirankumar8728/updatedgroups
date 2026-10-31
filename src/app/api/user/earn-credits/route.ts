import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { recordCreditTransaction } from '@/src/lib/user-dal';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';
import { getPool } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 15,
      windowMs: 60 * 1000,
      keyPrefix: 'earn_credits',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many requests. Please wait.', 15);
    }

    const auth = await resolveAuthContext(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Please log in to earn credits.' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json();
    const { taskType, groupTitle, groupId } = body;

    if (!taskType) {
      return NextResponse.json({ success: false, error: 'Task type is required.' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // 1. Check if user already claimed this specific task recently
    const pool = getPool();
    if (pool) {
      try {
        let duplicateCheckSql = 'SELECT id FROM credit_ledger WHERE user_id = ? AND type = "REWARD" AND reason LIKE ?';
        let duplicateParams = [auth.userId, `%${taskType}%`];

        if (groupId) {
          duplicateCheckSql += ' AND reference_id = ?';
          duplicateParams.push(groupId);
        } else if (taskType === 'daily_checkin') {
          duplicateCheckSql += ' AND created_at >= NOW() - INTERVAL 1 DAY';
        }

        const [existing]: any = await pool.query(duplicateCheckSql, duplicateParams);
        if (Array.isArray(existing) && existing.length > 0) {
          return NextResponse.json({ 
            success: false, 
            error: `You have already claimed the reward for this ${taskType.replace('_', ' ')} task.` 
          }, { status: 400, headers: NO_CACHE_HEADERS });
        }
      } catch (err) {
        console.warn('[EARN CREDITS API] Duplicate check error:', err);
      }
    }

    let amount = 0;
    let reason = '';
    let type = 'REWARD';

    if (taskType === 'daily_checkin') {
      amount = 5;
      reason = `Daily check-in loyalty credit reward [${taskType}]`;
    } else if (taskType === 'join_group') {
      amount = 2;
      reason = `Bonus credits for joining community: "${groupTitle || 'Partner Group'}" [${taskType}]`;
    } else if (taskType === 'rate_group') {
      amount = 3;
      reason = `Rating contribution review credits for group: "${groupTitle || 'Directory Partner'}" [${taskType}]`;
    } else if (taskType === 'share_social') {
      amount = 8;
      reason = `Affiliate credit bonus: Shared group directory link on social media [${taskType}]`;
    } else if (taskType === 'report_link') {
      amount = 4;
      reason = `Directory quality assurance credit for reporting invalid spam group links [${taskType}]`;
    } else if (taskType === 'review_platform') {
      amount = 15;
      reason = `Premium review credit: Contributed feedback & rated GroupLinks platform [${taskType}]`;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid task type.' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Call user data access layer to reward credits atomically
    const result = await recordCreditTransaction(
      auth.userId,
      type,
      amount,
      reason,
      groupId || undefined
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to record credits.' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      message: `Successfully credited +${amount} credits to your ledger! 🎉`,
    }, { headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to process reward' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
