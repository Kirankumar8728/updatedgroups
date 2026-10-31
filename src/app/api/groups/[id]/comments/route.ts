import { NextRequest, NextResponse } from 'next/server';
import { addGroupComment, getGroupComments, getGroupById, logGroupAction } from '@/src/lib/groups-dal';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { recordCreditTransaction, getPlatformRewardSettings } from '@/src/lib/user-dal';
import { checkRateLimitAsync, rateLimitResponse, getClientIp } from '@/src/lib/rate-limit';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';
import { GroupComment } from '@/src/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const comments = getGroupComments(id) || [];
    return NextResponse.json({ success: true, comments }, { headers: REALTIME_NO_CACHE_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch comments' },
      { status: 500, headers: REALTIME_NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 25,
      windowMs: 60 * 1000,
      keyPrefix: 'comments_post',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many comments posted. Please wait.', 25);
    }

    const { id } = await context.params;
    const body = await req.json();
    const { name, email, comment } = body;

    const auth = await resolveAuthContext(req);
    const authorName = auth.user?.displayName || name;
    const authorEmail = auth.user?.email || email;

    if (!authorName || !authorName.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400, headers: REALTIME_NO_CACHE_HEADERS });
    }
    if (!authorEmail || !authorEmail.trim() || !authorEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid email address is required' }, { status: 400, headers: REALTIME_NO_CACHE_HEADERS });
    }
    if (!comment || !comment.trim()) {
      return NextResponse.json({ success: false, error: 'Comment message is required' }, { status: 400, headers: REALTIME_NO_CACHE_HEADERS });
    }

    const group = await getGroupById(id);
    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404, headers: REALTIME_NO_CACHE_HEADERS });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';

    // Log comment action into MySQL group_actions table
    await logGroupAction({
      groupId: group.id,
      actionType: 'comment',
      ipAddress: ip,
      userAgent,
      userId: auth.userId,
    });

    const newComment = await addGroupComment(group.id, authorName.trim(), comment.trim(), authorEmail.trim());
    if (!newComment) {
      return NextResponse.json({ success: false, error: 'Failed to add comment' }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
    }

    let creditReward: { awarded: boolean; credits?: number; message?: string } = { awarded: false };
    if (auth.userId) {
      try {
        const rewardSettings = getPlatformRewardSettings();
        const commentReward = rewardSettings.commentReward !== undefined ? Number(rewardSettings.commentReward) : 1;
        if (commentReward > 0) {
          const ledgerRes = await recordCreditTransaction(
            auth.userId,
            'COMMENT_REWARD',
            commentReward,
            'Community discussion comment reward',
            group.id,
            { groupTitle: group.title }
          );

          if (ledgerRes.success) {
            creditReward = {
              awarded: true,
              credits: commentReward,
              message: `You earned +${commentReward} credit${commentReward > 1 ? 's' : ''} for your comment!`,
            };
          }
        }
      } catch {}
    }

    const allComments = getGroupComments(group.id) || [newComment];

    return NextResponse.json({
      success: true,
      comment: newComment,
      comments: allComments,
      commentsCount: allComments.length,
      creditReward,
      message: 'Comment posted successfully!',
    }, { headers: REALTIME_NO_CACHE_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
  }
}
