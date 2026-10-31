import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { verifySameOrigin } from '@/src/lib/security';
import { getGroups } from '@/src/lib/groups-dal';
import { deleteGroupComment } from '@/src/lib/groups-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

async function fetchAllComments() {
  const { groups } = await getGroups({ limit: 1000 });
  const allComments: any[] = [];
  for (const g of groups) {
    if (Array.isArray(g.comments)) {
      for (const c of g.comments) {
        allComments.push({
          id: c.id || `comm-${Math.random()}`,
          groupId: g.id,
          groupTitle: g.title || 'Community',
          groupPlatform: g.platform || 'whatsapp',
          name: typeof c.name === 'string' ? c.name : 'Anonymous User',
          email: typeof c.email === 'string' ? c.email : '',
          maskedEmail: typeof c.maskedEmail === 'string' ? c.maskedEmail : '',
          comment: typeof c.comment === 'string' ? c.comment : (typeof c === 'string' ? c : ''),
          createdAt: c.createdAt || new Date().toISOString(),
        });
      }
    }
  }
  return allComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const comments = await fetchAllComments();
    return NextResponse.json({ success: true, comments }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load comments' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const originCheck = verifySameOrigin(req);
  if (!originCheck.valid) {
    return originCheck.response!;
  }

  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const searchParams = req.nextUrl.searchParams;
    const rawCommentId = body.commentId || searchParams.get('commentId') || '';
    const rawGroupId = body.groupId || searchParams.get('groupId') || '';

    let commentId = String(rawCommentId).trim();
    let groupId = String(rawGroupId).trim();

    try {
      commentId = decodeURIComponent(commentId);
    } catch {}
    try {
      groupId = decodeURIComponent(groupId);
    } catch {}

    if (!commentId) {
      return NextResponse.json({ success: false, error: 'commentId is required' }, { status: 400 });
    }

    if (groupId) {
      deleteGroupComment(groupId, commentId);
    } else {
      // Find group containing comment
      const { groups } = await getGroups({ limit: 1000 });
      for (const g of groups) {
        if (g.comments?.some(c => c.id === commentId)) {
          deleteGroupComment(g.id, commentId);
          break;
        }
      }
    }

    const updatedComments = await fetchAllComments();
    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
      comments: updatedComments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
