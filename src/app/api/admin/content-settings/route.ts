import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { getContentSettings, updateContentSettings } from '@/src/lib/content-settings';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const settings = getContentSettings();
    return NextResponse.json({
      success: true,
      settings,
    }, { headers: REALTIME_NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: REALTIME_NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json();
    const partialUpdates: any = { updatedBy: 'admin' };

    if (typeof body.hideAdultContent === 'boolean') {
      partialUpdates.hideAdultContent = body.hideAdultContent;
    }

    if (typeof body.allowUserGroupUpdates === 'boolean') {
      partialUpdates.allowUserGroupUpdates = body.allowUserGroupUpdates;
    }

    if (typeof body.userUpdateCooldownDays === 'number') {
      partialUpdates.userUpdateCooldownDays = Math.max(1, Math.min(365, Math.floor(body.userUpdateCooldownDays)));
    }

    if (body.substitutionCategory && typeof body.substitutionCategory === 'string') {
      partialUpdates.substitutionCategory = body.substitutionCategory.trim();
    }

    if (Object.keys(partialUpdates).length <= 1) {
      return NextResponse.json(
        { success: false, error: 'At least one valid setting property must be provided' },
        { status: 400, headers: REALTIME_NO_CACHE_HEADERS }
      );
    }

    const updated = updateContentSettings(partialUpdates);

    try {
      revalidatePath('/');
      revalidatePath('/adult-groups');
      revalidatePath('/categories');
      revalidatePath('/categories/adult-18');
      revalidatePath('/tags');
      revalidatePath('/submit');
    } catch (revalidateErr) {
      console.warn('[ADMIN CONTENT SETTINGS] Revalidation notice:', revalidateErr);
    }

    let message = 'Content settings updated successfully.';
    if (partialUpdates.allowUserGroupUpdates !== undefined) {
      message = partialUpdates.allowUserGroupUpdates
        ? '✅ User group updates ENABLED: Visitors and community members can update groups (subject to 1 update/week cooldown).'
        : '🔒 User group updates DISABLED: Only master admins can edit or refetch group details.';
    } else if (partialUpdates.hideAdultContent !== undefined) {
      message = updated.hideAdultContent
        ? 'AdSense Safe Mode ACTIVE: Adult groups and keywords are now hidden site-wide.'
        : 'Adult content visibility ENABLED: Adult 18+ groups are visible.';
    }

    return NextResponse.json({
      success: true,
      settings: updated,
      message,
    }, { headers: REALTIME_NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: REALTIME_NO_CACHE_HEADERS }
    );
  }
}
