import { NextRequest, NextResponse } from 'next/server';
import { findDuplicateGroupInDb, getGroupsDatabase } from '@/src/lib/groups-dal';
import { checkDuplicateCommunity } from '@/src/utils/helpers';
import { Platform } from '@/src/types';
import { isUserGroupUpdatesAllowed, getUserUpdateCooldownMs } from '@/src/lib/content-settings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url') || '';
    const title = searchParams.get('title') || '';
    const platform = (searchParams.get('platform') as Platform) || undefined;
    const currentId = searchParams.get('id') || undefined;

    if (!url && !title) {
      return NextResponse.json({ isDuplicate: false });
    }

    const cleanUrl = url && !url.includes(' ') && url.length < 500 ? url : '';
    const cleanTitle = title && title.length < 300 ? title : '';

    if (!cleanUrl && !cleanTitle) {
      return NextResponse.json({ isDuplicate: false });
    }

    const userUpdatesAllowed = isUserGroupUpdatesAllowed();
    const cooldownMs = getUserUpdateCooldownMs();

    const computeUpdateStatus = (g: any) => {
      const isLocked = Boolean(g.isUpdateLocked || g.allowUserUpdates === false || !userUpdatesAllowed);
      const lastUserUpdatedTime = g.lastUserUpdatedAt
        ? new Date(g.lastUserUpdatedAt).getTime()
        : (g.updatedAt ? new Date(g.updatedAt).getTime() : 0);
      const timeSinceLastUpdate = Date.now() - lastUserUpdatedTime;
      const isUnderCooldown = lastUserUpdatedTime > 0 && timeSinceLastUpdate < cooldownMs;

      let updateBlockedReason: string | null = null;
      if (isLocked) {
        updateBlockedReason = '🔒 Community updates by visitors or members are currently disabled by administration.';
      } else if (isUnderCooldown) {
        const remainingMs = cooldownMs - timeSinceLastUpdate;
        const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const timeStr = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
        updateBlockedReason = `⏳ Update Cooldown Active: Community updates are limited to 1 time per week. Next update available in ${timeStr}.`;
      }

      return {
        canUserUpdate: !isLocked && !isUnderCooldown,
        isUpdateLocked: isLocked,
        isUnderCooldown,
        updateBlockedReason,
        lastUserUpdatedAt: g.lastUserUpdatedAt || g.updatedAt,
      };
    };

    // 1. Fast direct MySQL query for exact URL/title match (0ms latency, zero cache overhead)
    const directMatch = await findDuplicateGroupInDb(cleanUrl, cleanTitle, currentId);
    if (directMatch) {
      const status = computeUpdateStatus(directMatch);
      return NextResponse.json({
        isDuplicate: true,
        reason: `This community invite link is already listed as "${directMatch.title}".`,
        canUserUpdate: status.canUserUpdate,
        isUpdateLocked: status.isUpdateLocked,
        updateBlockedReason: status.updateBlockedReason,
        matchedGroup: {
          id: directMatch.id,
          title: directMatch.title,
          slug: directMatch.slug,
          platform: directMatch.platform,
          category: directMatch.category,
          language: directMatch.language,
          region: directMatch.region,
          url: directMatch.url,
          imageUrl: directMatch.imageUrl,
          bannerUrl: directMatch.bannerUrl,
          description: directMatch.description,
          rulesSummary: directMatch.rulesSummary,
          memberCount: directMatch.memberCount,
          customTags: directMatch.customTags,
          updatedAt: directMatch.updatedAt,
          lastUserUpdatedAt: directMatch.lastUserUpdatedAt,
          isUpdateLocked: directMatch.isUpdateLocked,
          canUserUpdate: status.canUserUpdate,
          updateBlockedReason: status.updateBlockedReason,
        },
      });
    }

    // 2. Fallback check against in-memory store without triggering Next.js 2MB unstable_cache
    const localDb = getGroupsDatabase();
    const result = checkDuplicateCommunity(
      { url: cleanUrl, title: cleanTitle, platform, id: currentId },
      localDb
    );

    if (result.isDuplicate && result.matchedGroup) {
      const g = result.matchedGroup;
      const status = computeUpdateStatus(g);
      return NextResponse.json({
        isDuplicate: true,
        reason: result.reason,
        canUserUpdate: status.canUserUpdate,
        isUpdateLocked: status.isUpdateLocked,
        updateBlockedReason: status.updateBlockedReason,
        matchedGroup: {
          id: g.id,
          title: g.title,
          slug: g.slug,
          platform: g.platform,
          category: g.category,
          language: g.language,
          region: g.region,
          url: g.url,
          imageUrl: g.imageUrl,
          bannerUrl: g.bannerUrl,
          description: g.description,
          rulesSummary: g.rulesSummary,
          memberCount: g.memberCount,
          customTags: g.customTags,
          updatedAt: g.updatedAt,
          lastUserUpdatedAt: g.lastUserUpdatedAt,
          isUpdateLocked: g.isUpdateLocked,
          canUserUpdate: status.canUserUpdate,
          updateBlockedReason: status.updateBlockedReason,
        },
      });
    }

    return NextResponse.json({ isDuplicate: false });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, isDuplicate: false, error: error.message },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'CDN-Cache-Control': 'no-store',
        },
      }
    );
  }
}
