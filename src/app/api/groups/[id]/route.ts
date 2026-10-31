import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getGroupById, updateGroup, deleteGroup } from '@/src/lib/groups-dal';
import { sanitizeHtml, sanitizeInput } from '@/src/lib/security';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { isUserGroupUpdatesAllowed, getUserUpdateCooldownMs } from '@/src/lib/content-settings';
import { uploadImageToR2 } from '@/src/lib/r2-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const group = await getGroupById(id);
    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await resolveAuthContext(req);

    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to update this group.' },
        { status: 401 }
      );
    }

    const existing = await getGroupById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Group not found.' }, { status: 404 });
    }

    const isOwner = auth.userId && (existing.claimedByUserId === auth.userId || (existing as any).owner_id === auth.userId);
    if (!auth.isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to edit this community.' },
        { status: 403 }
      );
    }

    // Master admin disable check for non-admin users
    if (!auth.isAdmin) {
      if (!isUserGroupUpdatesAllowed() || existing.allowUserUpdates === false || existing.isUpdateLocked) {
        return NextResponse.json(
          { success: false, error: '🔒 Community updates by visitors or members are currently disabled by administration.' },
          { status: 403 }
        );
      }

      // 1-Week (7-day) update cooldown check
      const cooldownMs = getUserUpdateCooldownMs();
      const lastUserUpdatedTime = existing.lastUserUpdatedAt
        ? new Date(existing.lastUserUpdatedAt).getTime()
        : (existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0);
      const timeSinceLastUpdate = Date.now() - lastUserUpdatedTime;

      if (lastUserUpdatedTime > 0 && timeSinceLastUpdate < cooldownMs) {
        const remainingMs = cooldownMs - timeSinceLastUpdate;
        const daysRemaining = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const hoursRemaining = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const timeStr = daysRemaining > 0
          ? `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} and ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}`
          : `${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}`;

        return NextResponse.json(
          {
            success: false,
            error: `⏳ Update Cooldown Active: Communities can only be updated 1 time per week. Next available update in ${timeStr}.`,
            retryAfterHours: Math.ceil(remainingMs / (60 * 60 * 1000)),
          },
          { status: 429 }
        );
      }
    }

    const body = await req.json();

    // Whitelist only safe, user-editable fields unless user is an admin
    const updatePayload: Record<string, any> = {};

    if (body.title !== undefined) updatePayload.title = sanitizeInput(body.title);
    if (body.description !== undefined) updatePayload.description = sanitizeHtml(body.description);
    if (body.rulesSummary !== undefined) updatePayload.rulesSummary = sanitizeInput(body.rulesSummary);
    if (body.category !== undefined) updatePayload.category = sanitizeInput(body.category);
    if (body.language !== undefined) updatePayload.language = sanitizeInput(body.language);
    if (body.region !== undefined) updatePayload.region = sanitizeInput(body.region);
    if (body.customTags !== undefined && Array.isArray(body.customTags)) {
      updatePayload.customTags = body.customTags.map((t: string) => sanitizeInput(t).slice(0, 30));
    }
    if (body.url !== undefined && typeof body.url === 'string' && body.url.trim()) {
      updatePayload.url = body.url.trim();
    }
    if (body.platform !== undefined && typeof body.platform === 'string') {
      updatePayload.platform = body.platform;
    }
    if (body.memberCount !== undefined) {
      updatePayload.memberCount = Number(body.memberCount) || 0;
    }
    if (body.imageUrl !== undefined) {
      if (body.imageUrl === null) {
        updatePayload.imageUrl = null;
      } else if (typeof body.imageUrl === 'string') {
        let finalImg = body.imageUrl.trim();
        // If admin updates image, upload to R2 / cdn.grouplinks.app
        if (auth.isAdmin && finalImg && !finalImg.includes('cdn.grouplinks.app')) {
          try {
            const r2Res = await uploadImageToR2(finalImg, body.title || existing.title || 'group-icon');
            if (r2Res.success && r2Res.r2Url) {
              finalImg = r2Res.r2Url;
            }
          } catch {}
        }
        updatePayload.imageUrl = finalImg;
      }
    }
    if (body.bannerUrl !== undefined && typeof body.bannerUrl === 'string') {
      updatePayload.bannerUrl = body.bannerUrl.trim();
    }

    if (!auth.isAdmin) {
      updatePayload.lastUserUpdatedAt = new Date().toISOString();
    }

    // Only administrators can toggle verification, promotion, featured, sticky, update locks, or status
    if (auth.isAdmin) {
      if (body.verified !== undefined) updatePayload.verified = Boolean(body.verified);
      if (body.featured !== undefined) updatePayload.featured = Boolean(body.featured);
      if (body.isSticky !== undefined) updatePayload.isSticky = Boolean(body.isSticky);
      if (body.stickyUntil !== undefined) updatePayload.stickyUntil = body.stickyUntil;
      if (body.stickyOrder !== undefined) updatePayload.stickyOrder = Number(body.stickyOrder);
      if (body.isPromoted !== undefined) updatePayload.isPromoted = Boolean(body.isPromoted);
      if (body.status !== undefined) updatePayload.status = body.status;
      if (body.isUpdateLocked !== undefined) updatePayload.isUpdateLocked = Boolean(body.isUpdateLocked);
      if (body.allowUserUpdates !== undefined) updatePayload.allowUserUpdates = Boolean(body.allowUserUpdates);
    }

    const updated = await updateGroup(id, updatePayload);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Failed to update group.' }, { status: 500 });
    }

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return NextResponse.json({ success: true, group: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await resolveAuthContext(req);

    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to delete this group.' },
        { status: 401 }
      );
    }

    const existing = await getGroupById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Group not found.' }, { status: 404 });
    }

    const isOwner = auth.userId && (existing.claimedByUserId === auth.userId || (existing as any).owner_id === auth.userId);
    if (!auth.isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to delete this community.' },
        { status: 403 }
      );
    }

    const deleted = await deleteGroup(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Failed to delete group.' }, { status: 500 });
    }

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return NextResponse.json({ success: true, message: 'Group deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
