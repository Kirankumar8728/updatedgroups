'use server';

import { createGroup, getGroupById, getGroupBySlug, updateGroup } from '@/src/lib/groups-dal';
import { sanitizeInput } from '@/src/lib/security';
import { validateGroupUrl, generateSlug, checkDuplicateCommunity, categoryToSlug, isGenericGroupTitle } from '@/src/utils/helpers';
import { checkGroupRestrictedContent } from '@/src/utils/moderation';
import { checkGroupLinkHealth } from '@/src/lib/link-health';
import { getGroupsDatabase } from '@/src/lib/groups-store';
import { resolveValidGroupImage } from '@/src/utils/categoryImages';
import { scrapeGroupMetadataDirect, normalizePlatformUrl } from '@/src/lib/metadata-scraper';
import { Group, Platform } from '@/src/types';
import { revalidatePath } from 'next/cache';
import { isAdultContentHidden, isUserGroupUpdatesAllowed, getUserUpdateCooldownMs } from '@/src/lib/content-settings';
import { uploadImageToR2 } from '@/src/lib/r2-storage';
import { analyzeImageUrlHeuristics } from '@/src/utils/imageHeuristics';

export interface SubmitGroupInput {
  title: string;
  url: string;
  description?: string;
  platform?: Platform;
  category?: string;
  language?: string;
  region?: string;
  customTags?: string[];
  imageUrl?: string;
  bannerUrl?: string;
  memberCount?: number;
  authorName?: string;
  authorEmail?: string;
  rulesSummary?: string;
  isNsfw?: boolean;
  rankKeywords?: string[];
  existingGroupId?: string;
  updateExisting?: boolean;
  forceUpdate?: boolean;
  bypassCooldown?: boolean;
  isAdmin?: boolean;
}

export interface SubmitGroupResult {
  success: boolean;
  group?: Group;
  error?: string;
  isDuplicate?: boolean;
  updated?: boolean;
  isUpdate?: boolean;
  matchedGroup?: Partial<Group>;
  diagnosticStep?: string;
  retryAfterHours?: number;
}

// Client-side submission throttling map to prevent rapid duplicate requests
const SUBMISSION_COOLDOWN_MS = 2000;
const CLIENT_SUBMISSION_MAP = new Map<string, number>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of CLIENT_SUBMISSION_MAP.entries()) {
      if (now - timestamp > 60000) {
        CLIENT_SUBMISSION_MAP.delete(key);
      }
    }
  }, 60000);
}

/**
 * Server Action for safe, validated, and logged community submissions.
 * Validates against database schema and platform policies.
 */
export async function submitGroupAction(input: SubmitGroupInput): Promise<SubmitGroupResult> {
  const timestamp = new Date().toISOString();
  console.log(`[SubmitGroupAction][${timestamp}] --- New Submission Attempt Initiated ---`);

  // Client-side submission debouncing / throttling
  const throttleKey = (input.url || '').trim().toLowerCase();
  if (throttleKey) {
    const lastTime = CLIENT_SUBMISSION_MAP.get(throttleKey);
    const now = Date.now();
    if (lastTime && (now - lastTime) < SUBMISSION_COOLDOWN_MS) {
      console.warn(`[SubmitGroupAction] Throttled: Submission attempted too rapidly (${now - lastTime}ms).`);
      return {
        success: false,
        error: '⏳ Submission request received too rapidly. Please wait a moment before trying again.',
        diagnosticStep: 'SUBMISSION_THROTTLED',
      };
    }
    CLIENT_SUBMISSION_MAP.set(throttleKey, now);
  }

  try {
    console.log(`[SubmitGroupAction] Input received:`, {
      title: input.title,
      url: input.url,
      platform: input.platform,
      category: input.category,
      memberCount: input.memberCount,
      updateExisting: input.updateExisting,
    });

    // Step 1: Validate Required Fields
    if (!input.url || typeof input.url !== 'string' || !input.url.trim()) {
      console.warn(`[SubmitGroupAction] Failed at Step 1: Missing invite URL.`);
      return {
        success: false,
        error: 'Group invite URL is required.',
        diagnosticStep: 'VALIDATE_REQUIRED_URL',
      };
    }

  // Reject adult submissions when AdSense Safe Mode is active
  if (isAdultContentHidden() && (input.isNsfw || input.category === 'Adult / 18+')) {
    return {
      success: false,
      error: 'Adult communities cannot be submitted at this time while AdSense compliance mode is active.',
      diagnosticStep: 'ADSENSE_SAFE_MODE_GATE',
    };
  }

  const rawUrl = input.url.trim();
  const norm = normalizePlatformUrl(rawUrl);
  const normalizedUrl = norm.normalizedUrl;

  // Step 2: Validate URL syntax and domain whitelist
  console.log(`[SubmitGroupAction] Step 2: Validating URL pattern for "${normalizedUrl}"`);
  const urlValidation = validateGroupUrl(normalizedUrl);
  if (!urlValidation.isValid) {
    console.warn(`[SubmitGroupAction] Failed at Step 2: Invalid URL domain or format:`, urlValidation.errorMessage);
    return {
      success: false,
      error: urlValidation.errorMessage || 'Invalid group invite URL format.',
      diagnosticStep: 'VALIDATE_URL_SYNTAX',
    };
  }

  const detectedPlatform = urlValidation.platform !== 'other'
    ? urlValidation.platform
    : (input.platform || norm.platform || 'other');

  // Step 3: Fetch Fresh Live Metadata before saving
  let fetchedMetadata: any = null;
  try {
    fetchedMetadata = await scrapeGroupMetadataDirect(normalizedUrl, detectedPlatform);
  } catch (scErr: any) {
    console.warn('[SubmitGroupAction] Live scrape notice:', scErr?.message);
  }

  if (fetchedMetadata?.isExpired) {
    return {
      success: false,
      error: 'This invite link got expired add other active link',
      diagnosticStep: 'LINK_EXPIRED',
    };
  }

  // Required Debug Log: Before save
  console.log('Fetched metadata', fetchedMetadata);

  // Determine Title: If user provided a real title, use it. But if user title is an unreadable invite hash or generic, prioritize the authentic scraped title!
  let rawTitle = '';
  const userProvidedTitle = input.title && typeof input.title === 'string' ? input.title.trim() : '';
  const userTitleIsGenericOrHash = !userProvidedTitle || isGenericGroupTitle(userProvidedTitle);
  const isBareHandle = Boolean(norm.platformHandle && userProvidedTitle.toLowerCase() === norm.platformHandle.toLowerCase());

  if (fetchedMetadata && fetchedMetadata.title && !isGenericGroupTitle(fetchedMetadata.title) && (userTitleIsGenericOrHash || isBareHandle)) {
    rawTitle = fetchedMetadata.title;
  } else if (userProvidedTitle && !userTitleIsGenericOrHash) {
    rawTitle = userProvidedTitle;
  } else if (fetchedMetadata && fetchedMetadata.title && !isGenericGroupTitle(fetchedMetadata.title)) {
    rawTitle = fetchedMetadata.title;
  } else if (userProvidedTitle) {
    rawTitle = userProvidedTitle;
  } else if (fetchedMetadata?.title) {
    rawTitle = fetchedMetadata.title;
  }

  const isInviteCode = !rawTitle || rawTitle.length < 2 || isGenericGroupTitle(rawTitle);
  let cleanTitle = '';
  if (!isInviteCode) {
    cleanTitle = sanitizeInput(rawTitle).slice(0, 255);
  } else {
    const platLabel = detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1);
    cleanTitle = `${platLabel} Community Group (${fetchedMetadata?.suggestedCategory || input.category || 'General'})`;
  }

  if (cleanTitle.length < 2) {
    console.warn(`[SubmitGroupAction] Failed at Step 3: Title length too short (${cleanTitle.length} chars).`);
    return {
      success: false,
      error: 'Community title must be at least 2 characters long.',
      diagnosticStep: 'VALIDATE_TITLE_LENGTH',
    };
  }

  // Description (user explicit input takes highest priority)
  let cleanDescription = '';
  if (input.description && typeof input.description === 'string' && input.description.trim()) {
    cleanDescription = sanitizeInput(input.description.trim()).slice(0, 5000);
  } else if (fetchedMetadata && fetchedMetadata.description && !fetchedMetadata.fallbackMetadata) {
    cleanDescription = sanitizeInput(fetchedMetadata.description).slice(0, 5000);
  } else if (fetchedMetadata?.description) {
    cleanDescription = sanitizeInput(fetchedMetadata.description).slice(0, 5000);
  } else {
    cleanDescription = `Official ${detectedPlatform} community for ${cleanTitle}. Connect with active members now.`;
  }

  const cleanRules = sanitizeInput((input.rulesSummary || fetchedMetadata?.rulesSummary || '').trim()).slice(0, 500);
  let cleanCategory = input.isNsfw ? 'Adult / 18+' : (input.category || fetchedMetadata?.suggestedCategory || 'General');
  if ((!cleanCategory || cleanCategory === 'Tech & Programming' || cleanCategory === 'General') && fetchedMetadata?.suggestedCategory && fetchedMetadata.suggestedCategory !== 'General') {
    cleanCategory = fetchedMetadata.suggestedCategory;
  }
  const cleanLanguage = input.language || fetchedMetadata?.suggestedLanguage || 'English';
  const cleanRegion = input.region || 'Global';

  // Images: Process custom uploaded base64 image (or manual file) to local WebP at grouplinks.app/image/{platform}/upload/{title}.webp
  let rawCustomImage = (input.imageUrl || input.bannerUrl || '').trim();
  if (rawCustomImage.startsWith('data:image/')) {
    try {
      const { processAndStoreImageLocally } = await import('@/src/lib/local-image-processor');
      const isAdultCheck = Boolean(input.isNsfw || cleanCategory === 'Adult / 18+');
      const stored = await processAndStoreImageLocally(rawCustomImage, detectedPlatform, cleanTitle, isAdultCheck);
      if (stored.success && stored.imageUrl) {
        rawCustomImage = stored.imageUrl;
      }
    } catch (imgErr) {
      console.warn('[SubmitGroupAction] Base64 image store error:', imgErr);
    }
  }

  let finalImageUrl = rawCustomImage;
  if (!finalImageUrl && fetchedMetadata && fetchedMetadata.imageUrl && !fetchedMetadata.fallbackMetadata) {
    finalImageUrl = fetchedMetadata.imageUrl;
  } else if (!finalImageUrl && fetchedMetadata?.imageUrl) {
    finalImageUrl = fetchedMetadata.imageUrl;
  }

  // Unify banner and icon to the single authoritative image source
  let finalBannerUrl = finalImageUrl;

  // Zero-Cost Image & Mislabeled Title Heuristic Quarantine Check
  const heuristicCheck = analyzeImageUrlHeuristics(finalImageUrl, cleanTitle, cleanDescription);
  if (heuristicCheck.isAdult || input.isNsfw) {
    cleanCategory = 'Adult / 18+';
    input.isNsfw = true;
  }

  // Member Count (Live scraped subscribers take priority if memberCount was left as default 100)
  let cleanMemberCount: number | undefined = undefined;
  if (input.memberCount && Number(input.memberCount) > 0 && Number(input.memberCount) !== 100) {
    cleanMemberCount = Math.min(500000000, Math.max(1, Number(input.memberCount)));
  } else if (typeof fetchedMetadata?.memberCount === 'number' && fetchedMetadata.memberCount > 0) {
    cleanMemberCount = fetchedMetadata.memberCount;
  } else if (input.memberCount && Number(input.memberCount) > 0) {
    cleanMemberCount = Math.min(500000000, Math.max(1, Number(input.memberCount)));
  }

  const cleanAuthor = sanitizeInput((input.authorName || '').trim()).slice(0, 60) || 'Community Member';

  // Step 4: Zero-tolerance restricted keyword check
  console.log(`[SubmitGroupAction] Step 4: Checking zero-tolerance safety policies...`);
  const restrictedCheck = checkGroupRestrictedContent({
    title: cleanTitle,
    description: cleanDescription,
    customTags: input.customTags,
    url: normalizedUrl,
    rulesSummary: cleanRules,
  });

  if (restrictedCheck.isRestricted) {
    console.warn(`[SubmitGroupAction] Blocked at Step 4: Prohibited keyword detected:`, restrictedCheck.matchedKeyword);
    return {
      success: false,
      error: `🚫 Submission Blocked: Your group ${restrictedCheck.matchedField || 'content'} contains strictly prohibited term "${restrictedCheck.matchedKeyword}".`,
      diagnosticStep: 'RESTRICTED_CONTENT_FILTER',
    };
  }

  // Step 5: Check if updating an existing group or if duplicate link exists
  console.log(`[SubmitGroupAction] Step 5: Checking for existing community record...`);
  let targetGroup: Group | null = null;
  if (input.existingGroupId) {
    targetGroup = await getGroupById(input.existingGroupId);
  }
  if (!targetGroup && norm.platformHandle) {
    const handleSlug = `${detectedPlatform === 'telegram' ? 'tg-' : ''}${norm.platformHandle.toLowerCase()}`;
    targetGroup = await getGroupBySlug(handleSlug) || await getGroupBySlug(norm.platformHandle);
  }
  if (!targetGroup) {
    const localDb = await getGroupsDatabase();
    const dupCheck = checkDuplicateCommunity(
      {
        url: normalizedUrl,
        title: cleanTitle,
        platform: detectedPlatform,
      },
      localDb
    );
    if (dupCheck.isDuplicate && dupCheck.matchedGroup) {
      targetGroup = dupCheck.matchedGroup;
    }
  }

  if (targetGroup) {
    const isBypass = Boolean(input.bypassCooldown || input.forceUpdate || input.isAdmin);

    // 1. Master admin disable check: ensure updates from users/visitors are currently allowed
    if (!isBypass) {
      if (!isUserGroupUpdatesAllowed() || targetGroup.allowUserUpdates === false || targetGroup.isUpdateLocked) {
        return {
          success: false,
          error: '🔒 Community updates by visitors or members are currently disabled by administration.',
          diagnosticStep: 'USER_UPDATES_DISABLED',
          group: targetGroup,
        };
      }
    }

    // 2. 1-Week (7-day) Group Update Restriction Rule:
    // When a user has updated any group, allow it to be updated again after 1 week only.
    const cooldownMs = getUserUpdateCooldownMs(); // Defaults to 7 days
    const lastUserUpdatedTime = targetGroup.lastUserUpdatedAt
      ? new Date(targetGroup.lastUserUpdatedAt).getTime()
      : (targetGroup.updatedAt ? new Date(targetGroup.updatedAt).getTime() : 0);
    const timeSinceLastUpdate = Date.now() - lastUserUpdatedTime;

    if (!isBypass && lastUserUpdatedTime > 0 && timeSinceLastUpdate < cooldownMs) {
      const remainingMs = cooldownMs - timeSinceLastUpdate;
      const daysRemaining = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
      const hoursRemaining = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutesRemaining = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

      let timeStr = '';
      if (daysRemaining > 0) {
        timeStr = `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} and ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}`;
      } else if (hoursRemaining > 0) {
        timeStr = `${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} and ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}`;
      } else {
        timeStr = `${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}`;
      }

      console.warn(`[SubmitGroupAction] Group ${targetGroup.id} was updated ${Math.round(timeSinceLastUpdate / 60000)} mins ago. 1-week cooldown active.`);
      return {
        success: false,
        error: `⏳ Update Cooldown Active: Listed communities can only be updated 1 time per week. Next available update in ${timeStr}.`,
        diagnosticStep: '1_WEEK_UPDATE_COOLDOWN',
        retryAfterHours: Math.ceil(remainingMs / (60 * 60 * 1000)),
        group: targetGroup,
      };
    }

    // Required Debug Log: During update
    console.log('Updating existing group', targetGroup.id, fetchedMetadata);

    const finalUpdateTitle = (cleanTitle && !isGenericGroupTitle(cleanTitle))
      ? cleanTitle
      : (targetGroup.title && !isGenericGroupTitle(targetGroup.title) ? targetGroup.title : cleanTitle);

    const isAdultGroup = input.isNsfw || cleanCategory === 'Adult / 18+' || Boolean(targetGroup?.isNsfw || targetGroup?.category === 'Adult / 18+');

    let r2ImageUrl = finalImageUrl || targetGroup.imageUrl;
    if (!isAdultGroup && r2ImageUrl && !r2ImageUrl.includes('cdn.grouplinks.app') && !r2ImageUrl.startsWith('data:image/')) {
      try {
        const r2Res = await uploadImageToR2(r2ImageUrl, finalUpdateTitle || 'group-icon');
        if (r2Res.success && r2Res.r2Url) {
          r2ImageUrl = r2Res.r2Url;
        }
      } catch {}
    }

    const updated = await updateGroup(targetGroup.id, {
      title: finalUpdateTitle,
      description: cleanDescription || targetGroup.description,
      category: cleanCategory,
      language: cleanLanguage,
      region: cleanRegion,
      customTags: Array.isArray(input.customTags) && input.customTags.length > 0 ? input.customTags : (fetchedMetadata?.suggestedTags || targetGroup.customTags),
      imageUrl: r2ImageUrl,
      bannerUrl: r2ImageUrl,
      memberCount: cleanMemberCount || targetGroup.memberCount,
      onlineCount: fetchedMetadata?.onlineCount || targetGroup.onlineCount,
      rulesSummary: cleanRules || targetGroup.rulesSummary,
      metadataSource: fetchedMetadata?.metadataSource || targetGroup.metadataSource || 'telegram',
      fallbackMetadata: Boolean(fetchedMetadata?.fallbackMetadata),
      lastMetadataFetchAt: fetchedMetadata?.lastMetadataFetchAt || new Date().toISOString(),
      ...(fetchedMetadata?.metadataFetchError ? { metadataFetchError: fetchedMetadata.metadataFetchError } : {}),
      normalizedUrl,
      platformHandle: norm.platformHandle || targetGroup.platformHandle,
      lastUserUpdatedAt: input.isAdmin ? targetGroup.lastUserUpdatedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const savedGroup = updated || targetGroup;

    // Required Debug Log: After save
    console.log('Saved group', savedGroup);

    try {
      revalidatePath('/');
      revalidatePath('/telegram');
      revalidatePath('/telegram-groups');
      revalidatePath(`/${detectedPlatform}`);
      revalidatePath(`/${detectedPlatform}-groups`);
      revalidatePath('/group/tg-anilsiriti');
      if (targetGroup.slug) revalidatePath(`/group/${targetGroup.slug}`);
      if (savedGroup.slug && savedGroup.slug !== targetGroup.slug) revalidatePath(`/group/${savedGroup.slug}`);
      if (targetGroup.id) revalidatePath(`/group/${targetGroup.id}`);
      revalidatePath(`/category/${categoryToSlug(cleanCategory)}`);
    } catch (revErr) {
      console.warn('[SubmitGroupAction] Revalidation notice:', revErr);
    }

    return {
      success: true,
      updated: true,
      isUpdate: true,
      group: savedGroup,
      diagnosticStep: 'UPDATED_EXISTING_RECORD',
    };
  }

  // Step 6: Real-time Link Health Verification
  console.log(`[SubmitGroupAction] Step 6: Verifying link health...`);
  try {
    const health = await checkGroupLinkHealth({
      id: 'sub_action_temp',
      url: normalizedUrl,
      platform: detectedPlatform,
    } as any);

    if (
      !health.isActive && 
      (health.status === 'expired' || health.status === 'revoked' || health.status === 'dead') &&
      detectedPlatform !== 'snapchat' &&
      detectedPlatform !== 'signal' &&
      detectedPlatform !== 'facebook' &&
      detectedPlatform !== 'other'
    ) {
      console.warn(`[SubmitGroupAction] Blocked at Step 6: Link health check failed:`, health.reason);
      return {
        success: false,
        error: `🚫 Submission Blocked: This invite link is expired or revoked. Reason: ${health.reason || 'Link unresponsive'}.`,
        diagnosticStep: 'LINK_HEALTH_CHECK',
      };
    }
  } catch (healthErr: any) {
    console.warn(`[SubmitGroupAction] Notice: Non-fatal link health warning:`, healthErr?.message);
  }

  // Step 7: Construct Schema-compliant Group Record
  const newId = `grp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const slug = generateSlug(cleanTitle) || newId;

  // Upload image to Cloudflare R2 (cdn.grouplinks.app) UNLESS it's an adult group
  const isNewAdultGroup = input.isNsfw || cleanCategory === 'Adult / 18+';

  let r2NewImageUrl = finalImageUrl;
  if (!isNewAdultGroup && r2NewImageUrl && !r2NewImageUrl.includes('cdn.grouplinks.app') && !r2NewImageUrl.startsWith('data:image/')) {
    try {
      const r2Res = await uploadImageToR2(r2NewImageUrl, cleanTitle || 'group-icon');
      if (r2Res.success && r2Res.r2Url) {
        if (r2Res.r2Url.startsWith('https://cdn.grouplinks.app') || !finalImageUrl.startsWith('http')) {
          r2NewImageUrl = r2Res.r2Url;
        }
      }
    } catch (r2Err) {
      console.warn('[SubmitGroupAction] R2 upload notice for new group:', r2Err);
    }
  }

  const validImageUrl = resolveValidGroupImage(r2NewImageUrl, cleanCategory, cleanTitle, false);
  const validBannerUrl = validImageUrl;

  const groupRecord: Partial<Group> = {
    id: newId,
    slug,
    title: cleanTitle,
    description: cleanDescription,
    url: rawUrl, // Preserve exact user-pasted invite link as-is
    originalUrl: rawUrl,
    normalizedUrl,
    platformHandle: norm.platformHandle,
    platform: detectedPlatform,
    category: cleanCategory,
    language: cleanLanguage,
    region: cleanRegion,
    customTags: Array.isArray(input.customTags) && input.customTags.length > 0
      ? input.customTags.slice(0, 10).map((t) => sanitizeInput(String(t).trim()).slice(0, 30))
      : (fetchedMetadata?.suggestedTags || [`#${detectedPlatform}`, `#${cleanCategory.toLowerCase().replace(/[^a-z0-9]/g, '')}`]),
    imageUrl: validImageUrl,
    bannerUrl: validBannerUrl,
    memberCount: cleanMemberCount || 100,
    onlineCount: fetchedMetadata?.onlineCount,
    metadataSource: fetchedMetadata?.metadataSource || 'fallback',
    fallbackMetadata: Boolean(fetchedMetadata?.fallbackMetadata),
    lastMetadataFetchAt: fetchedMetadata?.lastMetadataFetchAt || new Date().toISOString(),
    ...(fetchedMetadata?.metadataFetchError ? { metadataFetchError: fetchedMetadata.metadataFetchError } : {}),
    growthRate: 0,
    clicks: 0,
    upvotes: 0,
    shares: 0,
    bookmarks: 0,
    rating: 0,
    ratingCount: 0,
    verified: Boolean(fetchedMetadata?.isVerified),
    featured: false,
    isNsfw: input.isNsfw || cleanCategory === 'Adult / 18+',
    isSticky: false,
    safetyScore: 96,
    rankScore: 85,
    rankGrade: 'A',
    rankKeywords: Array.isArray(input.rankKeywords) && input.rankKeywords.length > 0
      ? input.rankKeywords
      : [`${detectedPlatform} invite link`, cleanTitle.toLowerCase(), cleanCategory.toLowerCase()],
    authorName: cleanAuthor,
    authorEmail: input.authorEmail || undefined,
    rulesSummary: cleanRules || 'Be kind and respect community guidelines.',
    status: 'approved',
    isActive: true,
    is_active: true,
    createdAt: timestamp,
    publishedAt: timestamp,
    updatedAt: timestamp,
    lastActive: 'Just now',
  };

  console.log(`[SubmitGroupAction] Step 7: Writing group to database layer with schema ID: ${groupRecord.id}`);

  try {
    const saved = await createGroup(groupRecord);

    // Required Debug Log: After save
    console.log('Saved group', saved);

    // Revalidate public directory routes
    try {
      revalidatePath('/');
      revalidatePath(`/${detectedPlatform}`);
      revalidatePath(`/${detectedPlatform}-groups`);
      if (saved.slug) revalidatePath(`/group/${saved.slug}`);
      if (saved.id) revalidatePath(`/group/${saved.id}`);
      revalidatePath(`/category/${categoryToSlug(cleanCategory)}`);
    } catch (revErr) {
      console.warn('[SubmitGroupAction] Revalidation notice:', revErr);
    }

    return {
      success: true,
      group: saved,
      diagnosticStep: 'COMPLETED_SUCCESSFULLY',
    };
  } catch (dbErr: any) {
    console.error(`[SubmitGroupAction ERROR] Database write failure:`, dbErr?.message, dbErr?.stack);
    return {
      success: false,
      error: dbErr?.message || 'Database error while saving community. Please try again.',
      diagnosticStep: 'DB_WRITE_EXCEPTION',
    };
  }
  } catch (unhandledErr: any) {
    console.error(`[SubmitGroupAction FATAL] Unexpected unhandled error:`, unhandledErr?.message, unhandledErr?.stack);
    return {
      success: false,
      error: unhandledErr?.message || 'Server error while processing community submission. Please try again.',
      diagnosticStep: 'ACTION_UNHANDLED_EXCEPTION',
    };
  }
}
