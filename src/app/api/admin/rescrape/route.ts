import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin, logAdminAction, ADMIN_EMAIL } from '@/src/lib/admin-auth';
import { getGroupBySlug, updateGroup, clearGroupsDalCache } from '@/src/lib/groups-dal';
import { scrapeGroupMetadataDirect } from '@/src/lib/metadata-scraper';
import { clearGroupsFromRam } from '@/src/lib/groups-store';
import { checkRateLimit, rateLimitResponse } from '@/src/lib/rate-limit';
import { categoryToSlug } from '@/src/utils/helpers';
import { uploadImageToR2 } from '@/src/lib/r2-storage';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce strict admin authentication
    const auth = requireAdmin(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    // 2. Rate limit administrative metadata re-scrape requests
    const rateCheck = checkRateLimit(req, {
      limit: 30,
      windowMs: 60 * 1000,
      route: 'admin_rescrape_metadata',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many metadata re-scrape requests. Please wait.');
    }

    // 3. Extract target groupId / id / slug & requested action
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body parsing fallback
    }

    let groupId = body.groupId || body.id || body.slug || '';
    if (!groupId) {
      const url = new URL(req.url);
      groupId = url.searchParams.get('groupId') || url.searchParams.get('id') || url.searchParams.get('slug') || '';
    }

    const action = body.action || req.nextUrl?.searchParams?.get('action') || 'rescrape';

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: groupId, id, or slug.' },
        { status: 400 }
      );
    }

    // 4. Retrieve existing group record
    const existingGroup = await getGroupBySlug(groupId);
    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: `Group with ID/slug "${groupId}" was not found.` },
        { status: 404 }
      );
    }

    // A. Handle Toggle Lock (Disable / Enable updates from visitors or users)
    if (action === 'toggle_lock') {
      const newLock = typeof body.isUpdateLocked === 'boolean'
        ? body.isUpdateLocked
        : !Boolean(existingGroup.isUpdateLocked);

      const updates = {
        isUpdateLocked: newLock,
        allowUserUpdates: !newLock,
        updatedAt: new Date().toISOString(),
      };

      const updatedGroup = await updateGroup(existingGroup.id, updates);
      try {
        clearGroupsFromRam();
        clearGroupsDalCache();
        revalidatePath('/', 'layout');
        revalidatePath('/');
        if (existingGroup.platform) revalidatePath(`/${existingGroup.platform}`);
        if (existingGroup.slug) revalidatePath(`/group/${existingGroup.slug}`);
      } catch {}

      logAdminAction(
        ADMIN_EMAIL || 'admin',
        'TOGGLE_GROUP_LOCK',
        'group',
        existingGroup.id,
        { previousLocked: existingGroup.isUpdateLocked, newLock },
        req
      );

      return NextResponse.json({
        success: true,
        message: newLock ? '🔒 Community updates disabled for visitors' : '🔓 Community updates enabled for visitors',
        groupId: existingGroup.id,
        isUpdateLocked: newLock,
        updatedGroup: updatedGroup || { ...existingGroup, ...updates },
      });
    }

    // B. Handle Change Image (Custom image URL or base64 upload to Cloudflare R2 / cdn.grouplinks.app)
    if (action === 'change_image') {
      const newImageUrl = (body.newImageUrl || body.imageUrl || '').trim();
      if (!newImageUrl) {
        return NextResponse.json(
          { success: false, error: 'New image URL or data payload is required.' },
          { status: 400 }
        );
      }

      let finalImg = newImageUrl;
      const isAdultGroup = Boolean(existingGroup.isNsfw || existingGroup.category === 'Adult / 18+');
      if (!isAdultGroup) {
        try {
          const { processAndStoreImageLocally } = await import('@/src/lib/local-image-processor');
          const localRes = await processAndStoreImageLocally(newImageUrl, existingGroup.platform || 'whatsapp', existingGroup.title || 'group-icon', false);
          if (localRes.success && localRes.imageUrl) {
            finalImg = localRes.imageUrl;
          }
        } catch (err) {
          console.warn('[ADMIN CHANGE IMAGE] Local storage processing notice:', err);
        }
      }

      const updates = {
        imageUrl: finalImg,
        bannerUrl: finalImg,
        updatedAt: new Date().toISOString(),
      };

      console.log(`[ADMIN CHANGE IMAGE] Updating group ${existingGroup.id} - updates:`, JSON.stringify(updates));
      const updatedGroup = await updateGroup(existingGroup.id, updates);
      console.log(`[ADMIN CHANGE IMAGE] Database update result for group ${existingGroup.id}:`, updatedGroup ? 'success' : 'failed');
      try {
        clearGroupsFromRam();
        clearGroupsDalCache();
        revalidatePath('/', 'layout');
        revalidatePath('/');
        if (existingGroup.platform) revalidatePath(`/${existingGroup.platform}`);
        if (existingGroup.slug) revalidatePath(`/group/${existingGroup.slug}`);
      } catch {}

      logAdminAction(
        ADMIN_EMAIL || 'admin',
        'ADMIN_CHANGE_IMAGE',
        'group',
        existingGroup.id,
        { oldImage: existingGroup.imageUrl, newImage: finalImg },
        req
      );

      return NextResponse.json({
        success: true,
        message: `Group image updated & uploaded to ${finalImg.includes('cdn.grouplinks.app') ? 'cdn.grouplinks.app' : 'storage'}.`,
        groupId: existingGroup.id,
        imageUrl: finalImg,
        updatedGroup: updatedGroup || { ...existingGroup, ...updates },
      });
    }

    // C. Handle Live Re-fetch Details (Scrape fresh metadata & icon)
    if (!existingGroup.url) {
      return NextResponse.json(
        { success: false, error: 'Target group does not have a valid invite URL to re-scrape.' },
        { status: 400 }
      );
    }

    // 5. Trigger live forced re-scrape of group metadata (icon, title, status, members)
    const scraped = await scrapeGroupMetadataDirect(existingGroup.url);

    if (!scraped) {
      return NextResponse.json(
        { success: false, error: 'Failed to scrape metadata from group URL.' },
        { status: 502 }
      );
    }

    // 6. Capture original metadata snapshot
    const oldMeta = {
      title: existingGroup.title,
      description: existingGroup.description,
      imageUrl: existingGroup.imageUrl,
      memberCount: existingGroup.memberCount,
      isExpired: Boolean(existingGroup.isExpired),
      status: existingGroup.status,
    };

    // 7. Prepare update parameters
    const updates: any = {};

    if (scraped.title && scraped.title.trim()) {
      updates.title = scraped.title.trim();
    }
    if (scraped.description && scraped.description.trim()) {
      updates.description = scraped.description.trim();
    }
    if (scraped.imageUrl && scraped.imageUrl.trim()) {
      const isAdultGroup = Boolean(existingGroup.isNsfw || existingGroup.category === 'Adult / 18+' || scraped.suggestedCategory === 'Adult / 18+');
      let finalImg = scraped.imageUrl;
      if (!isAdultGroup) {
        try {
          console.log(`[ADMIN RESCRAPE] Processing icon for group ${existingGroup.id}: ${scraped.imageUrl}`);
          const { processAndStoreImageLocally } = await import('@/src/lib/local-image-processor');
          const localRes = await processAndStoreImageLocally(scraped.imageUrl, existingGroup.platform || 'whatsapp', existingGroup.title || 'group-icon', false);
          if (localRes.success && localRes.imageUrl) {
            console.log(`[ADMIN RESCRAPE] Successfully processed icon: ${localRes.imageUrl}`);
            finalImg = localRes.imageUrl;
          } else {
            console.warn(`[ADMIN RESCRAPE] Failed to process icon: ${localRes.error}`);
          }
        } catch (err) {
          console.error('[ADMIN RESCRAPE] Error processing icon:', err);
        }
      }

      updates.imageUrl = finalImg;
      // Synchronize group background / banner with re-scraped icon
      // Only update banner if it was identical to the old icon URL, 
      // to avoid overwriting a custom banner with the new icon.
      updates.bannerUrl = existingGroup.bannerUrl === existingGroup.imageUrl ? finalImg : existingGroup.bannerUrl;
    }
    if (scraped.memberCount && Number(scraped.memberCount) > 0) {
      updates.memberCount = Number(scraped.memberCount);
    }

    if (scraped.isExpired) {
      updates.isExpired = true;
      updates.status = 'archived';
      updates.isActive = false;
    } else {
      updates.isExpired = false;
      if (existingGroup.status === 'archived' || !existingGroup.isActive) {
        updates.status = 'approved';
        updates.isActive = true;
      }
    }

    if (scraped.suggestedCategory && scraped.suggestedCategory !== existingGroup.category) {
      updates.category = scraped.suggestedCategory;
    }
    if (scraped.suggestedLanguage && scraped.suggestedLanguage !== existingGroup.language) {
      updates.language = scraped.suggestedLanguage;
    }

    updates.updatedAt = new Date().toISOString();
    // Mark as explicit administrative action so validator/protection shields do not block fresh metadata
    updates.isUserSubmission = true;
    updates.isManualEdit = true;

    // 8. Commit changes to database and memory
    const updatedGroup = await updateGroup(existingGroup.id, updates);

    // 9. Purge cache for immediate propagation across all server and client views
    try {
      clearGroupsFromRam();
      clearGroupsDalCache();
    } catch {}

    // 10. Next.js cache revalidation for immediate live propagation to all users
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/');
      if (existingGroup.platform) {
        revalidatePath(`/${existingGroup.platform}`);
        revalidatePath(`/${existingGroup.platform}-groups`);
      }
      if (existingGroup.slug) {
        revalidatePath(`/group/${existingGroup.slug}`);
      }
      if (existingGroup.id) {
        revalidatePath(`/group/${existingGroup.id}`);
      }
      if (existingGroup.category) {
        revalidatePath(`/category/${categoryToSlug(existingGroup.category)}`);
      }
      if (updates.category && updates.category !== existingGroup.category) {
        revalidatePath(`/category/${categoryToSlug(updates.category)}`);
      }
    } catch (revErr) {
      console.warn('[ADMIN RESCRAPE] Cache revalidation notice:', revErr);
    }

    // 11. Record administrative audit log
    logAdminAction(
      ADMIN_EMAIL || 'admin',
      'FORCE_RESCRAPE_METADATA',
      'group',
      existingGroup.id,
      { oldMeta, updates },
      req
    );

    return NextResponse.json({
      success: true,
      message: scraped.isExpired
        ? `Re-scraped group successfully. Invite link is expired: ${scraped.expiredReason || 'Link invalid'}`
        : 'Group metadata & icon re-scraped and updated live.',
      groupId: existingGroup.id,
      scraped,
      oldMeta,
      updates,
      updatedGroup: updatedGroup || { ...existingGroup, ...updates },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to re-scrape group metadata.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
