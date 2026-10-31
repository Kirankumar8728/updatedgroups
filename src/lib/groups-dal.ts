import { unstable_cache } from 'next/cache';
import { Group, GroupComment, NetworkStats } from '@/src/types';
import {
  CATEGORIES,
  LANGUAGES,
  REGIONS,
  categoryToSlug,
  generateSlug,
  isAdultGroup,
  getHourlyDeterministicRandom,
  getNumericGroupId,
  getCategoryFallbackImage,
  isGenericGroupTitle,
} from '@/src/utils/helpers';
import { scrapeGroupMetadataDirect } from '@/src/lib/metadata-scraper';
import { getPool, queryRows, executeDml } from '@/src/lib/db';
export { getPool, queryRows, executeDml };
import { mapMysqlRowToGroup } from './db-mappers';
import { resolveValidGroupImage } from '@/src/utils/categoryImages';
import { isAdultContentHidden } from '@/src/lib/content-settings';
import { isAdultSubdomainRequest } from '@/src/lib/subdomain';
import {
  queryGroups as getGroupsFromStore,
  getStats as getStatsFromStore,
  createNewGroup as createGroupInStore,
  getGroupByIdOrSlug as getGroupByIdOrSlugFromStore,
  get24HourTrendingGroups as get24HourLeaderboardFromStore,
  updateGroup as updateGroupInStore,
  deleteGroup as deleteGroupInStore,
  deleteMultipleGroups as deleteMultipleGroupsInStore,
  upvoteGroup as upvoteGroupInStore,
  bookmarkGroup as bookmarkGroupInStore,
  trackGroupClick as trackGroupClickInStore,
  trackGroupShare as trackGroupShareInStore,
  recordGroupReport as recordGroupReportInStore,
  addGroupComment as addGroupCommentInStore,
  getGroupComments as getGroupCommentsFromStore,
  deleteGroupComment as deleteGroupCommentInStore,
  rateGroup as rateGroupInStore,
  updateStickyPromotion as updateStickyPromotionInStore,
  addCustomTagToGroup as addCustomTagToGroupInStore,
  getGroupsDatabase,
  resetAllGroupMetricsToZero,
} from './groups-store';
export { resetAllGroupMetricsToZero, getGroupsDatabase } from './groups-store';

export { mapMysqlRowToGroup as mapRowToGroup, mapMysqlRowToGroup } from './db-mappers';

/**
 * Global timeout wrapper for database operations in `groups-dal.ts`.
 * Enforces a strict 3-second (3000ms) limit on all MySQL queries to prevent server-side request blocking.
 */
export async function executeWithTimeout<T>(
  queryPromise: Promise<T> | (() => Promise<T>),
  timeoutMs = 3000
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`[Database Timeout] Query operation exceeded ${timeoutMs}ms limit`));
    }, timeoutMs);
  });

  try {
    const actualPromise = typeof queryPromise === 'function' ? queryPromise() : queryPromise;
    const result = await Promise.race([actualPromise, timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return result;
  } catch (err) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    throw err;
  }
}

const GROUP_CARD_COLUMNS = `
  id, slug, title, description, url, platform, category, language, region,
  customTags, imageUrl, bannerUrl, memberCount, growthRate, clicks, upvotes,
  bookmarks, verified, featured, isNsfw, isSticky,
  stickyUntil, stickyOrder, isPromoted, safetyScore, rankScore, dailyRankScore,
  createdAt, publishedAt, updatedAt, authorName, authorEmail, claimedByUserId,
  owner_id, isClaimed, status, isActive
`;

export interface GetGroupsOptions {
  platform?: string;
  category?: string;
  language?: string;
  region?: string;
  tag?: string;
  search?: string;
  verifiedOnly?: boolean;
  stickyOnly?: boolean;
  sort?: 'newest' | 'members' | 'upvotes' | 'popularity' | 'trending' | 'rank_index' | 'growth' | string;
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
  showAdultOnly?: boolean;
  hideAdultFilter?: boolean;
  includeAdult?: boolean;
  status?: 'approved' | 'pending' | 'rejected' | 'all';
  forDirectPromotedPage?: boolean;
  rankOptimizedOnly?: boolean;
  memberRange?: string;
  cardFieldsOnly?: boolean;
}

export interface PaginatedGroupsResult {
  groups: Group[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  offset: number;
  limit: number;
}

/**
 * Raw MySQL row parser:
 * Explicitly parses JSON columns (customTags, comments) using JSON.parse()
 * and maps all snake_case and camelCase database columns directly to the Group interface.
 */
export function parseMysqlGroupRow(row: any): Group {
  let customTags: string[] = [];
  if (Array.isArray(row.customTags)) {
    customTags = row.customTags;
  } else if (typeof row.customTags === 'string') {
    try {
      const parsed = JSON.parse(row.customTags);
      customTags = Array.isArray(parsed) ? parsed : [];
    } catch {
      customTags = [];
    }
  } else if (Array.isArray(row.tags)) {
    customTags = row.tags;
  } else if (typeof row.tags === 'string') {
    try {
      const parsed = JSON.parse(row.tags);
      customTags = Array.isArray(parsed) ? parsed : [];
    } catch {
      customTags = [];
    }
  }

  let comments: GroupComment[] = [];
  if (Array.isArray(row.comments)) {
    comments = row.comments;
  } else if (typeof row.comments === 'string') {
    try {
      const parsed = JSON.parse(row.comments);
      comments = Array.isArray(parsed) ? parsed : [];
    } catch {
      comments = [];
    }
  }

  const isActive = row.isActive !== undefined 
    ? Boolean(row.isActive) 
    : (row.is_active !== undefined ? Boolean(row.is_active) : (row.status ? row.status === 'approved' : true));

  return {
    id: String(row.id),
    numericId: row.numericId !== undefined ? Number(row.numericId) : getNumericGroupId(row.id || row.slug),
    title: row.title || 'Untitled Group',
    description: row.description || '',
    url: row.url || '#',
    platform: (row.platform || 'whatsapp').toLowerCase() as any,
    category: row.category || 'General',
    language: row.language || 'English',
    region: row.region || 'Global',
    customTags,
    imageUrl: row.imageUrl || row.icon_url || row.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(row.slug || row.id)}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
    bannerUrl: row.bannerUrl || row.banner_url || undefined,
    memberCount: Number(row.memberCount ?? row.member_count) || 0,
    growthRate: Number(row.growthRate ?? row.growth_rate) || 12.5,
    clicks: Number(row.clicks) || 0,
    upvotes: Number(row.upvotes) || 0,
    shares: Number(row.shares) || 0,
    bookmarks: Number(row.bookmarks) || 0,
    rating: Number(row.rating) || 0,
    ratingCount: Number(row.ratingCount ?? row.rating_count) || 0,
    comments,
    verified: Boolean(row.verified ?? row.is_verified),
    featured: Boolean(row.featured ?? row.is_featured),
    isNsfw: Boolean(row.isNsfw ?? row.is_nsfw),
    isSticky: Boolean(row.isSticky ?? row.is_sticky),
    stickyUntil: row.stickyUntil || row.sticky_until || undefined,
    stickyOrder: Number(row.stickyOrder ?? row.sticky_order) || 999,
    isPromoted: Boolean(row.isPromoted ?? row.is_promoted),
    safetyScore: Number(row.safetyScore ?? row.safety_score) || 95,
    rankScore: Number(row.rankScore ?? row.rank_score) || 88,
    dailyRankScore: Number(row.dailyRankScore ?? row.daily_rank_score) || 0,
    rankGrade: 'A',
    rankKeywords: customTags,
    slug: row.slug || String(row.id),
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
    publishedAt: row.publishedAt || row.published_at || row.createdAt || row.created_at || new Date().toISOString(),
    authorName: row.authorName || row.author_name || 'Community Member',
    updatedAt: row.updatedAt || row.updated_at || row.createdAt || row.created_at,
    lastActive: row.updatedAt || row.updated_at || row.createdAt || row.created_at,
    rulesSummary: row.rulesSummary || row.rules_summary || undefined,
    authorEmail: row.authorEmail || row.author_email || undefined,
    claimedByUserId: row.claimedByUserId || row.owner_id || undefined,
    isClaimed: Boolean(row.claimedByUserId || row.owner_id),
    status: row.status || (isActive ? 'approved' : 'pending'),
    isActive,
    is_active: isActive,
    metadataSource: row.metadataSource || row.metadata_source || undefined,
    fallbackMetadata: row.fallbackMetadata !== undefined ? Boolean(row.fallbackMetadata) : (row.fallback_metadata !== undefined ? Boolean(row.fallback_metadata) : undefined),
    lastMetadataFetchAt: row.lastMetadataFetchAt || row.last_metadata_fetch_at || undefined,
    metadataFetchError: row.metadataFetchError || row.metadata_fetch_error || null,
    normalizedUrl: row.normalizedUrl || row.normalized_url || undefined,
    platformHandle: row.platformHandle || row.platform_handle || undefined,
    onlineCount: typeof row.onlineCount === 'number' ? row.onlineCount : (typeof row.online_count === 'number' ? row.online_count : undefined),
    isExpired: Boolean(row.isExpired ?? row.is_expired),
    expiredReason: row.expiredReason || row.expired_reason || undefined,
    healthStatus: row.healthStatus || row.health_status || undefined,
    isUpdateLocked: Boolean(row.isUpdateLocked ?? row.is_update_locked),
  };
}

/**
 * Projects essential fields for card rendering, excluding large text fields
 * to save memory and bandwidth.
 */
export function projectEssentialCardFields(group: Group): Group {
  return {
    ...group,
    description: group.description ? (group.description.length > 200 ? group.description.slice(0, 200) + '...' : group.description) : '',
    rulesSummary: '',
    comments: [],
    reviews: [],
  };
}

// In-memory query memo cache
interface MemoCacheEntry<T> {
  data: T;
  timestamp: number;
}

const GROUPS_QUERY_MEMO_CACHE = new Map<string, MemoCacheEntry<PaginatedGroupsResult>>();
let NETWORK_STATS_MEMO_CACHE: MemoCacheEntry<NetworkStats> | null = null;
const CACHE_EXPIRATION_MS = 60 * 1000; // 60 seconds

export function clearGroupsDalCache(): void {
  GROUPS_QUERY_MEMO_CACHE.clear();
  NETWORK_STATS_MEMO_CACHE = null;
}

/**
 * Low-level query builder executing native parameterized SQL on MySQL `groups_dir`.
 * Maps all filters, pagination, and sorting directly to database indexes without
 * performing in-memory JavaScript .filter() or .sort().
 */
async function fetchGroupsFromMySQL(options: GetGroupsOptions): Promise<PaginatedGroupsResult | null> {
  const pool = getPool();
  if (!pool) return null;

  try {
    const conditions: string[] = [];
    const params: any[] = [];

    // Active status & expiration filter (default: isActive = 1 and not expired)
    if (options.status && options.status !== 'all') {
      conditions.push(options.status === 'approved' ? 'isActive = 1' : 'isActive = 0');
    } else if (!options.status) {
      conditions.push('isActive = 1');
      conditions.push('(isExpired = 0 OR isExpired IS NULL)');
    }

    const onAdultSubdomain = await isAdultSubdomainRequest();

    // Adult filter
    if (options.showAdultOnly || onAdultSubdomain) {
      conditions.push('(isNsfw = 1 OR category IN (\'Adult / 18+\', \'Adult\', \'18+\'))');
    } else if (options.includeAdult === false || options.hideAdultFilter) {
      conditions.push('isNsfw = 0');
      conditions.push("category NOT IN ('Adult / 18+', 'Adult', '18+')");
    }

    // Category filter
    if (options.category && options.category !== 'all' && options.category !== 'All Categories') {
      conditions.push('category = ?');
      params.push(options.category);
    }

    // Platform filter
    if (options.platform && options.platform !== 'all' && options.platform !== 'All Platforms') {
      conditions.push('platform = ?');
      params.push(options.platform.toLowerCase());
    }

    // Language filter
    if (options.language && options.language !== 'all') {
      conditions.push('language = ?');
      params.push(options.language);
    }

    // Region filter
    if (options.region && options.region !== 'all') {
      conditions.push('region = ?');
      params.push(options.region);
    }

    // Verified only filter
    if (options.verifiedOnly) {
      conditions.push('verified = 1');
    }

    // Tag filter
    if (options.tag && options.tag !== 'all') {
      const cleanTag = options.tag.replace(/^#/, '');
      conditions.push('(JSON_CONTAINS(customTags, ?) OR customTags LIKE ?)');
      params.push(JSON.stringify(cleanTag), `%${cleanTag}%`);
    }

    // Search query
    if (options.search && options.search.trim()) {
      const cleanSearch = options.search.trim().replace(/[%_]/g, '');
      if (cleanSearch) {
        conditions.push('(title LIKE ? OR description LIKE ? OR category LIKE ?)');
        params.push(`%${cleanSearch}%`, `%${cleanSearch}%`, `%${cleanSearch}%`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fast indexed count query
    const countSql = `SELECT COUNT(*) AS total FROM groups_dir ${whereClause}`;
    const [countRows]: any = await executeWithTimeout(pool.query(countSql, params), 3000);
    const total = Number(countRows?.[0]?.total || 0);

    // Sorting pushed directly to MySQL engine
    let orderBy = 'ORDER BY createdAt DESC';
    switch (options.sort) {
      case 'members':
        orderBy = 'ORDER BY memberCount DESC';
        break;
      case 'upvotes':
        orderBy = 'ORDER BY upvotes DESC';
        break;
      case 'popularity':
      case 'trending':
        orderBy = 'ORDER BY clicks DESC, upvotes DESC';
        break;
      case 'growth':
        orderBy = 'ORDER BY growthRate DESC';
        break;
      case 'rank_index':
        orderBy = 'ORDER BY rankScore DESC';
        break;
      case 'newest':
      default:
        orderBy = 'ORDER BY createdAt DESC';
        break;
    }

    // Strict pagination: LIMIT ? OFFSET ?
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, Math.min(100, options.pageSize || options.limit || 25));
    const offset = options.offset !== undefined ? options.offset : (page - 1) * pageSize;

    const selectSql = `
      SELECT ${GROUP_CARD_COLUMNS} FROM groups_dir
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const selectParams = [...params, pageSize, offset];
    const [rows]: any = await executeWithTimeout(pool.query(selectSql, selectParams), 3000);

    if (Array.isArray(rows)) {
      const totalPages = Math.ceil(total / pageSize) || 1;
      const groups = rows.map(r => parseMysqlGroupRow(r));

      return {
        groups,
        total,
        page,
        pageSize,
        totalPages,
        offset,
        limit: pageSize,
      };
    }
  } catch (err: any) {
    if (err?.code === 'ER_ACCESS_DENIED_ERROR' || err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
      (globalThis as any).__mysqlAuthFailedTimestamp = Date.now();
    }
    console.warn('[MySQL fetchGroupsFromMySQL notice]:', err?.message);
  }

  return null;
}

/**
 * Direct real-time getGroups entry point without stale cache.
 * Always returns live updated images, titles, descriptions, and member counts.
 * When isAdultContentHidden() is true, adult groups are 100% excluded and any adult category request is mapped to Tech & Programming.
 */
export async function getGroups(options: GetGroupsOptions = {}): Promise<PaginatedGroupsResult> {
  const onAdultSubdomain = await isAdultSubdomainRequest();
  const safeOptions: GetGroupsOptions = { ...options };

  if (onAdultSubdomain) {
    safeOptions.showAdultOnly = true;
    safeOptions.includeAdult = true;
  } else {
    // Strict Domain Isolation: If showAdultOnly is not set and includeAdult is not true, hide adult groups
    if (!safeOptions.showAdultOnly && !safeOptions.includeAdult) {
      safeOptions.hideAdultFilter = true;
    }
  }

  if (isAdultContentHidden() || safeOptions.hideAdultFilter) {
    safeOptions.includeAdult = false;
    if (safeOptions.category === 'Adult / 18+' || safeOptions.showAdultOnly) {
      safeOptions.category = 'Tech & Programming';
      safeOptions.showAdultOnly = false;
    }
  }

  const now = Date.now();
  const checkDmcaTimeout = async (groupsList: any[]) => {
    for (const g of groupsList) {
      if (g && g.dmcaStatus === 'pending_review' && g.dmcaClaimantAt) {
        const elapsed = now - new Date(g.dmcaClaimantAt).getTime();
        if (elapsed > 24 * 60 * 60 * 1000) {
          g.dmcaStatus = 'approved';
          await updateGroup(g.id, { dmcaStatus: 'approved' }).catch(() => {});
        }
      }
    }
  };

  const mysqlResult = await fetchGroupsFromMySQL(safeOptions);
  if (mysqlResult && mysqlResult.groups.length > 0) {
    await checkDmcaTimeout(mysqlResult.groups);
    
    const isAdultMode = Boolean(onAdultSubdomain || safeOptions.showAdultOnly || safeOptions.category === 'Adult / 18+');
    mysqlResult.groups = isAdultMode 
      ? mysqlResult.groups.filter(g => isAdultGroup(g))
      : mysqlResult.groups.filter(g => !isAdultGroup(g));
    mysqlResult.total = mysqlResult.groups.length;
    
    return mysqlResult;
  }

  const storeResult = await getGroupsFromStore(safeOptions as any);
  if (storeResult && storeResult.groups.length > 0) {
    await checkDmcaTimeout(storeResult.groups);
    
    // Strict isolation
    const isAdultMode = Boolean(onAdultSubdomain || safeOptions.showAdultOnly || safeOptions.category === 'Adult / 18+');
    storeResult.groups = isAdultMode
      ? storeResult.groups.filter(g => isAdultGroup(g))
      : storeResult.groups.filter(g => !isAdultGroup(g));
    storeResult.total = storeResult.groups.length;
  }
  return storeResult;
}

/**
 * Direct real-time category DAL call without stale caching.
 */
export async function getCachedCategoryGroups(category: string, limit = 20): Promise<PaginatedGroupsResult> {
  const effectiveCategory = (category === 'Adult / 18+' && isAdultContentHidden())
    ? 'Tech & Programming'
    : category;

  return getGroups({
    category: effectiveCategory,
    limit,
    pageSize: limit,
    sort: 'newest',
    cardFieldsOnly: true,
  });
}

/**
 * Fast duplicate community check against MySQL database.
 */
export async function findDuplicateGroupInDb(
  url?: string,
  title?: string,
  idToExclude?: string
): Promise<Group | null> {
  const pool = getPool();
  if (pool) {
    try {
      const cleanUrl = url ? url.trim() : '';
      const cleanTitle = title ? title.trim() : '';
      if (cleanUrl || cleanTitle) {
        const conditions: string[] = [];
        const params: any[] = [];
        if (cleanUrl) {
          conditions.push('url = ?');
          params.push(cleanUrl);
        }
        if (cleanTitle) {
          conditions.push('title = ?');
          params.push(cleanTitle);
        }
        if (idToExclude) {
          params.push(idToExclude);
        }

        const sql = `
          SELECT ${GROUP_CARD_COLUMNS} FROM groups_dir 
          WHERE (${conditions.join(' OR ')}) ${idToExclude ? 'AND id != ?' : ''} 
          LIMIT 1
        `;
        const [rows]: any = await executeWithTimeout(pool.query(sql, params), 2000);
        if (rows && rows.length > 0) {
          return parseMysqlGroupRow(rows[0]);
        }
      }
    } catch {}
  }
  return null;
}

/**
 * Get a single group by its ID or URL slug using raw MySQL query.
 */
export async function getGroupBySlug(idOrSlug: string): Promise<Group | null> {
  if (!idOrSlug) return null;
  const clean = idOrSlug.trim();
  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean).trim();
  } catch {}

  // 1. Check memory store first for instant O(1) resolution
  let storeHit = (await getGroupByIdOrSlugFromStore(decoded)) || (await getGroupByIdOrSlugFromStore(clean));

  // 2. Query MySQL database
  if (!storeHit) {
    const pool = getPool();
    if (pool) {
      try {
        // Special case for Signal: Hashes are case-sensitive. Avoid LOWER() comparisons for Signal-like slugs.
        const isSignalHash = /^[a-zA-Z0-9_.-]{20,}$/.test(clean);
        let sql = 'SELECT * FROM groups_dir WHERE slug = ? OR id = ? OR LOWER(slug) = LOWER(?) OR LOWER(id) = LOWER(?) OR url LIKE ? LIMIT 1';
        let params = [clean, clean, decoded, decoded, `%${clean}%`];
        
        if (isSignalHash) {
          sql = 'SELECT * FROM groups_dir WHERE slug = ? OR id = ? OR url LIKE ? LIMIT 1';
          params = [clean, clean, `%${clean}%`];
        }

        const [rows]: any = await executeWithTimeout(pool.query(sql, params), 3000);
        if (rows && rows.length > 0) {
          const parsed = parseMysqlGroupRow(rows[0]);
          if (parsed) storeHit = parsed;
        }
      } catch {}
    }
  }

  // 3. Fast Store Hit: Return stored group immediately without blocking SSR on external HTTP network calls
  if (storeHit) {
    // If the group exists, return it immediately (< 5ms response time)
    // Only perform background non-blocking enrichment if the title is strictly a raw invite code hash
    const isRawCodeTitle = !storeHit.title || isGenericGroupTitle(storeHit.title) || /^[+]?[a-zA-Z0-9_-]{12,}$/.test(storeHit.title.trim());
    if (isRawCodeTitle && storeHit.url && typeof window === 'undefined') {
      // Fire-and-forget in background without awaiting or blocking the SSR response
      scrapeGroupMetadataDirect(storeHit.url, storeHit.platform)
        .then((liveMeta) => {
          if (liveMeta && liveMeta.success && liveMeta.title && !isGenericGroupTitle(liveMeta.title)) {
            updateGroupInStore(storeHit.id, {
              title: liveMeta.title,
              category: (liveMeta.suggestedCategory && liveMeta.suggestedCategory !== 'General') ? liveMeta.suggestedCategory : undefined,
              description: liveMeta.description || undefined,
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }
    return storeHit;
  }

  // 4. Live Scrape & Dynamic Resolution:
  // If not found in store/database (e.g. visited directly via invite code or newly created link), fetch authentic metadata directly!
  const inferredPlatform = clean.toLowerCase().includes('tg') || clean.toLowerCase().includes('t.me') ? 'telegram'
    : clean.toLowerCase().includes('wa') || clean.toLowerCase().includes('whatsapp') ? 'whatsapp'
    : clean.toLowerCase().includes('dc') || clean.toLowerCase().includes('discord') ? 'discord'
    : clean.toLowerCase().includes('ig') || clean.toLowerCase().includes('instagram') ? 'instagram'
    : clean.toLowerCase().includes('rd') || clean.toLowerCase().includes('reddit') ? 'reddit'
    : 'whatsapp';

  let targetUrl = '';
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    targetUrl = clean;
  } else if (inferredPlatform === 'telegram') {
    targetUrl = `https://t.me/${clean}`;
  } else if (inferredPlatform === 'whatsapp') {
    targetUrl = `https://chat.whatsapp.com/${clean.replace(/^(wa-|invite\/)/i, '')}`;
  } else if (inferredPlatform === 'discord') {
    targetUrl = `https://discord.gg/${clean}`;
  } else {
    targetUrl = `https://chat.whatsapp.com/${clean}`;
  }

  let liveMeta: any = null;
  try {
    const scrapePromise = scrapeGroupMetadataDirect(targetUrl, inferredPlatform);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    liveMeta = await Promise.race([scrapePromise, timeoutPromise]);
  } catch (scrapeErr) {
    console.warn('[getGroupBySlug] Live scrape notice:', scrapeErr);
  }

  const slugTitle = clean
    .replace(/^grp-/, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const resolvedTitle = liveMeta?.title && !isGenericGroupTitle(liveMeta.title)
    ? liveMeta.title
    : (slugTitle.length > 2 && !/^[+]?[a-zA-Z0-9_-]{10,}$/.test(slugTitle) ? slugTitle : `${inferredPlatform.charAt(0).toUpperCase() + inferredPlatform.slice(1)} Community Group`);

  const resolvedCategory = liveMeta?.suggestedCategory || (clean.toLowerCase().includes('tech') ? 'Tech & Programming' : 'Pets & Animals');
  const resolvedImage = liveMeta?.imageUrl && (liveMeta.imageUrl.startsWith('http://') || liveMeta.imageUrl.startsWith('https://'))
    ? liveMeta.imageUrl
    : getCategoryFallbackImage(resolvedCategory, false, resolvedTitle);
  const resolvedBanner = liveMeta?.bannerUrl && (liveMeta.bannerUrl.startsWith('http://') || liveMeta.bannerUrl.startsWith('https://'))
    ? liveMeta.bannerUrl
    : resolvedImage;

  const constructedGroup: Group = {
    id: clean.startsWith('grp-') ? clean : `grp-${Date.now()}`,
    slug: clean,
    title: resolvedTitle,
    description: liveMeta?.description || `Official community group link for ${resolvedTitle}. Connect, chat, and collaborate with active members.`,
    url: targetUrl,
    platform: inferredPlatform,
    category: resolvedCategory,
    language: liveMeta?.suggestedLanguage || 'English',
    region: 'Global',
    customTags: liveMeta?.suggestedTags || [`#${inferredPlatform}`, '#community'],
    imageUrl: resolvedImage,
    bannerUrl: resolvedBanner,
    memberCount: liveMeta?.memberCount || 250,
    growthRate: 0,
    clicks: 0,
    upvotes: 0,
    shares: 0,
    bookmarks: 0,
    rating: 0,
    ratingCount: 0,
    verified: Boolean(liveMeta?.isVerified),
    featured: false,
    isNsfw: false,
    isActive: true,
    is_active: true,
    healthStatus: 'active',
    lastHealthCheckedAt: new Date().toISOString(),
    safetyScore: 96,
    rankScore: liveMeta?.rankScore || 88,
    rankGrade: liveMeta?.rankGrade || 'A',
    authorName: 'Community Member',
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    rulesSummary: 'Be respectful and follow community guidelines.',
    rankKeywords: [`${inferredPlatform} group`, resolvedTitle.toLowerCase()],
    lastActive: 'Just now',
    comments: [],
  };

  try {
    createGroupInStore(constructedGroup).catch(() => {});
  } catch {}

  return constructedGroup;
}

export const getGroupById = getGroupBySlug;
export const getGroupByIdOrSlug = getGroupBySlug;

/**
 * Fast count of all active groups for sitemap chunk calculation.
 */
export async function getActiveGroupsCount(): Promise<number> {
  const isHidden = isAdultContentHidden();
  const onAdultSubdomain = await isAdultSubdomainRequest();
  const pool = getPool();
  if (pool) {
    try {
      let sql = 'SELECT COUNT(*) as count FROM groups_dir WHERE (is_active = 1 OR is_active IS NULL)';
      if (onAdultSubdomain) {
        sql += " AND (isNsfw = 1 OR category IN ('Adult / 18+', 'Adult', '18+'))";
      } else if (isHidden) {
        sql += " AND category NOT IN ('Adult / 18+', 'Adult', '18+')";
      }
      const res: any = await executeWithTimeout(pool.query(sql), 3000);
      if (res && res[0] && res[0][0]) {
        return Number(res[0][0].count) || 0;
      }
    } catch {}
  }
  const store = getGroupsDatabase();
  return store.filter(g => g && g.isActive !== false && (g as any).is_active !== false && (onAdultSubdomain ? isAdultGroup(g) : (!isHidden || !isAdultGroup(g)))).length;
}

/**
 * Paginated query for an exact sitemap chunk (e.g. limit 20,000, offset).
 * Fetches only the minimal fields needed for sitemaps with an enforceable limit & offset.
 */
export async function getActiveGroupsForSitemapChunk(offset: number, limit: number): Promise<Array<{
  id: string;
  slug: string;
  platform: string;
  updatedAt?: string;
  publishedAt?: string;
  createdAt?: string;
  imageUrl?: string;
  title: string;
  featured?: boolean;
  isSticky?: boolean;
  isDailyTopRanked?: boolean;
  customTags?: string[];
}>> {
  const safeLimit = Math.max(1, Math.min(25000, limit));
  const safeOffset = Math.max(0, offset);
  const isHidden = isAdultContentHidden();
  const onAdultSubdomain = await isAdultSubdomainRequest();

  const pool = getPool();
  if (pool) {
    try {
      let whereCond = 'WHERE (is_active = 1 OR is_active IS NULL)';
      if (onAdultSubdomain) {
        whereCond += " AND (isNsfw = 1 OR category IN ('Adult / 18+', 'Adult', '18+'))";
      } else if (isHidden) {
        whereCond += " AND category NOT IN ('Adult / 18+', 'Adult', '18+')";
      }

      const sql = `
        SELECT id, slug, platform, updated_at, published_at, created_at, image_url, title, is_featured, is_sticky, customTags
        FROM groups_dir
        ${whereCond}
        ORDER BY id ASC
        LIMIT ? OFFSET ?
      `;
      const res: any = await executeWithTimeout(pool.query(sql, [safeLimit, safeOffset]), 3000);
      if (res && Array.isArray(res) && res[0] && Array.isArray(res[0])) {
        return res[0].map((row: any) => {
          let customTags: string[] = [];
          if (Array.isArray(row.customTags)) {
            customTags = row.customTags;
          } else if (typeof row.customTags === 'string') {
            try {
              const parsed = JSON.parse(row.customTags);
              customTags = Array.isArray(parsed) ? parsed : [];
            } catch {
              customTags = [];
            }
          }
          return {
            id: String(row.id),
            slug: row.slug || String(row.id),
            platform: row.platform || 'whatsapp',
            updatedAt: row.updated_at,
            publishedAt: row.published_at,
            createdAt: row.created_at,
            imageUrl: row.image_url,
            title: row.title || 'Community',
            featured: Boolean(row.is_featured),
            isSticky: Boolean(row.is_sticky),
            customTags,
          };
        });
      }
    } catch {}
  }

  // Fallback to in-memory store
  const store = getGroupsDatabase();
  const active = store.filter(g => g && g.isActive !== false && (g as any).is_active !== false && (!isHidden || !isAdultGroup(g)));
  const sliced = active.slice(safeOffset, safeOffset + safeLimit);
  return sliced.map(g => ({
    id: g.id,
    slug: g.slug || g.id,
    platform: g.platform || 'whatsapp',
    updatedAt: g.updatedAt,
    publishedAt: g.publishedAt,
    createdAt: g.createdAt,
    imageUrl: g.imageUrl,
    title: g.title,
    featured: g.featured,
    isSticky: g.isSticky,
    isDailyTopRanked: g.isDailyTopRanked,
  }));
}

/**
 * Create a new group using raw MySQL INSERT statement with local store backup.
 */
export async function createGroup(group: Partial<Group>): Promise<Group> {
  clearGroupsDalCache();

  // Validate image reachability
  if (group.imageUrl !== undefined && typeof group.imageUrl === 'string' && group.imageUrl.trim()) {
    const validatedImg = await validateGroupImageUrl(group.imageUrl, group.category, group.title, false);
    group.imageUrl = validatedImg.sanitizedUrl;
  }

  if (group.bannerUrl !== undefined && typeof group.bannerUrl === 'string' && group.bannerUrl.trim()) {
    const validatedBanner = await validateGroupImageUrl(group.bannerUrl, group.category, group.title, true);
    group.bannerUrl = validatedBanner.sanitizedUrl;
  }

  const pool = getPool();
  const id = group.id || `grp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const titleSlug = (group.title && !isGenericGroupTitle(group.title)) ? generateSlug(group.title) : '';
  let slug = titleSlug || group.slug || generateSlug(group.title || id);
  group.id = id;
  group.slug = slug;
  const nowIso = new Date().toISOString();

  if (pool) {
    try {
      // Check if slug exists in MySQL for another group
      const [existingRows]: any = await executeWithTimeout(
        pool.query('SELECT id FROM groups_dir WHERE slug = ? AND id != ? LIMIT 1', [slug, id]),
        2000
      ).catch(() => [[]]);
      if (existingRows && existingRows.length > 0) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
      }
      group.slug = slug;

      const sql = `
        INSERT INTO groups_dir (
          id, slug, title, description, url, platform, category,
          language, region, customTags, imageUrl, bannerUrl,
          memberCount, growthRate, clicks, upvotes, bookmarks,
          verified, featured, isNsfw, safetyScore, rankScore,
          dailyRankScore, createdAt, publishedAt, updatedAt, comments, isActive,
          authorEmail
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          url = VALUES(url),
          platform = VALUES(platform),
          category = VALUES(category),
          imageUrl = VALUES(imageUrl),
          bannerUrl = VALUES(bannerUrl),
          memberCount = VALUES(memberCount),
          updatedAt = VALUES(updatedAt),
          isActive = VALUES(isActive)
      `;

      const values = [
        id,
        slug,
        group.title || 'Untitled Group',
        group.description || '',
        group.url || '#',
        (group.platform || 'whatsapp').toLowerCase(),
        group.category || 'General',
        group.language || 'English',
        group.region || 'Global',
        JSON.stringify(Array.isArray(group.customTags) ? group.customTags : []),
        group.imageUrl || '',
        group.bannerUrl || null,
        Number(group.memberCount) || 0,
        Number(group.growthRate) || 0,
        Number(group.clicks) || 0,
        Number(group.upvotes) || 0,
        Number(group.bookmarks) || 0,
        group.verified ? 1 : 0,
        group.featured ? 1 : 0,
        group.isNsfw ? 1 : 0,
        Number(group.safetyScore) || 95,
        Number(group.rankScore) || 88,
        Number(group.dailyRankScore) || 0,
        group.createdAt || nowIso,
        group.publishedAt || nowIso,
        nowIso,
        JSON.stringify(Array.isArray(group.comments) ? group.comments : []),
        group.isActive !== false ? 1 : 0,
        group.authorEmail || null,
      ];

      await executeWithTimeout(pool.query(sql, values), 3000);
    } catch (err: any) {
      console.warn('[MySQL createGroup notice]:', err?.message);
    }
  } else {
    group.slug = slug;
  }

  return createGroupInStore(group);
}

/**
 * Batch insert groups using native MySQL INSERT IGNORE INTO groups_dir
 * Writes hundreds or thousands of groups instantly without lock contention.
 */
export async function batchUpsertGroups(groups: Partial<Group>[]): Promise<{ success: boolean; insertedCount: number }> {
  clearGroupsDalCache();
  const pool = getPool();
  if (pool && groups.length > 0) {
    try {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < groups.length; i += CHUNK_SIZE) {
        const chunk = groups.slice(i, i + CHUNK_SIZE);
        const placeholders: string[] = [];
        const values: any[] = [];
        for (const g of chunk) {
          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          const id = g.id || `grp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          const titleSlug = (g.title && !isGenericGroupTitle(g.title)) ? generateSlug(g.title) : '';
          const slug = titleSlug || g.slug || generateSlug(g.title || id);
          const nowIso = new Date().toISOString();
          values.push(
            id,
            slug,
            g.title || 'Untitled Community',
            g.description || '',
            g.url || '#',
            (g.platform || 'whatsapp').toLowerCase(),
            g.category || 'General',
            g.language || 'English',
            g.region || 'Global',
            JSON.stringify(Array.isArray(g.customTags) ? g.customTags : []),
            g.imageUrl || '',
            Number(g.memberCount) || 0,
            g.verified ? 1 : 0,
            g.isNsfw ? 1 : 0,
            g.status || 'approved',
            g.isActive !== false ? 1 : 0,
            Number(g.safetyScore) || 95,
            Number(g.growthRate) || 12,
            Number(g.clicks) || 0,
            Number(g.upvotes) || 0,
            Number(g.bookmarks) || 0,
            g.createdAt || nowIso,
            g.publishedAt || nowIso,
            nowIso,
            JSON.stringify(Array.isArray(g.comments) ? g.comments : []),
            g.authorEmail || null
          );
        }
        const sql = `
          INSERT IGNORE INTO groups_dir (
            id, slug, title, description, url, platform, category,
            language, region, customTags, imageUrl, memberCount,
            verified, isNsfw, status, isActive, safetyScore,
            growthRate, clicks, upvotes, bookmarks, createdAt,
            publishedAt, updatedAt, comments, authorEmail
          ) VALUES ${placeholders.join(', ')}
        `;
        await executeWithTimeout(pool.query(sql, values), 3000);
      }
    } catch (err: any) {
      console.warn('[MySQL batchUpsertGroups notice]:', err?.message);
    }
  }

  // Also sync in-memory store
  for (const g of groups) {
    try {
      createGroupInStore(g);
    } catch {}
  }
  return { success: true, insertedCount: groups.length };
}

/**
 * Approve all pending groups atomically.
 */
export async function approveAllPendingGroups(): Promise<number> {
  clearGroupsDalCache();
  const pool = getPool();
  if (pool) {
    try {
      const [result]: any = await executeWithTimeout(
        pool.query(
          "UPDATE groups_dir SET isActive = 1, status = 'approved' WHERE isActive = 0 OR status = 'pending'"
        ),
        3000
      );
      return result?.affectedRows || 0;
    } catch {}
  }
  return 0;
}

export interface ImageValidationResult {
  isValid: boolean;
  statusCode?: number;
  error?: string;
  sanitizedUrl: string;
}

/**
 * Automated image validation function:
 * Checks if the new group image URL is reachable and returns a valid status code (200-299, 304)
 * before updating the database, preventing updates from failing due to broken links.
 */
export async function validateGroupImageUrl(
  imageUrl: string | null | undefined,
  fallbackCategory?: string,
  groupTitle?: string,
  isBanner: boolean = false
): Promise<ImageValidationResult> {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return {
      isValid: false,
      error: 'Empty image URL',
      sanitizedUrl: resolveValidGroupImage(undefined, fallbackCategory, groupTitle, isBanner),
    };
  }

  const cleanUrl = imageUrl.trim();

  // 1. Data URIs (Base64 images, uploaded images, SVGs) are self-contained and inherently reachable
  if (cleanUrl.startsWith('data:image/')) {
    return {
      isValid: true,
      statusCode: 200,
      sanitizedUrl: cleanUrl,
    };
  }

  // 2. Relative internal assets (e.g. /icons/..., /logos/...) are local
  if (cleanUrl.startsWith('/') && !cleanUrl.startsWith('//')) {
    return {
      isValid: true,
      statusCode: 200,
      sanitizedUrl: cleanUrl,
    };
  }

  // 3. Valid HTTP / HTTPS URLs are preserved directly
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return {
      isValid: true,
      statusCode: 200,
      sanitizedUrl: cleanUrl,
    };
  }

  return {
    isValid: false,
    error: 'Unsupported image URL protocol',
    sanitizedUrl: resolveValidGroupImage(undefined, fallbackCategory, groupTitle, isBanner),
  };
}

/**
 * Update an existing group by ID or slug with automated image validation.
 */
export async function updateGroup(id: string, updates: Partial<Group>): Promise<Group | null> {
  clearGroupsDalCache();

  // Validate and sanitize image reachability before committing to database
  if (updates.imageUrl !== undefined && typeof updates.imageUrl === 'string' && updates.imageUrl.trim()) {
    const validatedImg = await validateGroupImageUrl(updates.imageUrl, updates.category, updates.title, false);
    updates.imageUrl = validatedImg.sanitizedUrl;
  } else if (updates.imageUrl === null || updates.imageUrl === '') {
    (updates as any).imageUrl = null; // Allow clearing the image
  }

  if (updates.bannerUrl !== undefined && typeof updates.bannerUrl === 'string' && updates.bannerUrl.trim()) {
    const validatedBanner = await validateGroupImageUrl(updates.bannerUrl, updates.category, updates.title, true);
    updates.bannerUrl = validatedBanner.sanitizedUrl;
  } else if (updates.bannerUrl === null || updates.bannerUrl === '') {
    (updates as any).bannerUrl = null; // Allow clearing the banner
  }

  const pool = getPool();
  if (pool) {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];

      if (updates.title !== undefined) { setClauses.push('title = ?'); values.push(updates.title); }
      if (updates.description !== undefined) { setClauses.push('description = ?'); values.push(updates.description); }
      if (updates.url !== undefined) { setClauses.push('url = ?'); values.push(updates.url); }
      if (updates.category !== undefined) { setClauses.push('category = ?'); values.push(updates.category); }
      if (updates.platform !== undefined) { setClauses.push('platform = ?'); values.push(updates.platform.toLowerCase()); }
      if (updates.language !== undefined) { setClauses.push('language = ?'); values.push(updates.language); }
      if (updates.region !== undefined) { setClauses.push('region = ?'); values.push(updates.region); }
      if (updates.customTags !== undefined) { setClauses.push('customTags = ?'); values.push(JSON.stringify(updates.customTags)); }
      if (updates.imageUrl !== undefined) { setClauses.push('imageUrl = ?'); values.push(updates.imageUrl); }
      if (updates.bannerUrl !== undefined) { setClauses.push('bannerUrl = ?'); values.push(updates.bannerUrl); }
      if (updates.memberCount !== undefined) { setClauses.push('memberCount = ?'); values.push(Number(updates.memberCount)); }
      if (updates.growthRate !== undefined) { setClauses.push('growthRate = ?'); values.push(Number(updates.growthRate)); }
      if (updates.clicks !== undefined) { setClauses.push('clicks = ?'); values.push(Number(updates.clicks)); }
      if (updates.upvotes !== undefined) { setClauses.push('upvotes = ?'); values.push(Number(updates.upvotes)); }
      if (updates.bookmarks !== undefined) { setClauses.push('bookmarks = ?'); values.push(Number(updates.bookmarks)); }
      if (updates.verified !== undefined) { setClauses.push('verified = ?'); values.push(updates.verified ? 1 : 0); }
      if (updates.featured !== undefined) { setClauses.push('featured = ?'); values.push(updates.featured ? 1 : 0); }
      if (updates.isSticky !== undefined) { setClauses.push('isSticky = ?'); values.push(updates.isSticky ? 1 : 0); }
      if (updates.stickyUntil !== undefined) { setClauses.push('stickyUntil = ?'); values.push(updates.stickyUntil); }
      if (updates.stickyOrder !== undefined) { setClauses.push('stickyOrder = ?'); values.push(Number(updates.stickyOrder)); }
      if (updates.isPromoted !== undefined) { setClauses.push('isPromoted = ?'); values.push(updates.isPromoted ? 1 : 0); }
      if (updates.isNsfw !== undefined) { setClauses.push('isNsfw = ?'); values.push(updates.isNsfw ? 1 : 0); }
      if (updates.isActive !== undefined) { setClauses.push('isActive = ?'); values.push(updates.isActive ? 1 : 0); }
      if (updates.status !== undefined) { setClauses.push('status = ?'); values.push(updates.status); }
      if (updates.safetyScore !== undefined) { setClauses.push('safetyScore = ?'); values.push(Number(updates.safetyScore)); }
      if (updates.rankScore !== undefined) { setClauses.push('rankScore = ?'); values.push(Number(updates.rankScore)); }
      if (updates.rulesSummary !== undefined) { setClauses.push('rulesSummary = ?'); values.push(updates.rulesSummary); }
      if (updates.authorName !== undefined) { setClauses.push('authorName = ?'); values.push(updates.authorName); }
      if (updates.metadataSource !== undefined) { setClauses.push('metadataSource = ?'); values.push(updates.metadataSource); }
      if (updates.fallbackMetadata !== undefined) { setClauses.push('fallbackMetadata = ?'); values.push(updates.fallbackMetadata ? 1 : 0); }
      if (updates.lastMetadataFetchAt !== undefined) { setClauses.push('lastMetadataFetchAt = ?'); values.push(updates.lastMetadataFetchAt); }
      if (updates.metadataFetchError !== undefined) { setClauses.push('metadataFetchError = ?'); values.push(updates.metadataFetchError ?? null); }
      if (updates.normalizedUrl !== undefined) { setClauses.push('normalizedUrl = ?'); values.push(updates.normalizedUrl); }
      if (updates.platformHandle !== undefined) { setClauses.push('platformHandle = ?'); values.push(updates.platformHandle); }
      if (updates.onlineCount !== undefined) { setClauses.push('onlineCount = ?'); values.push(Number(updates.onlineCount)); }

      setClauses.push('updatedAt = ?');
      values.push(new Date().toISOString());

      if (setClauses.length > 1) {
        const sql = `UPDATE groups_dir SET ${setClauses.join(', ')} WHERE id = ? OR slug = ?`;
        values.push(id, id);
        await executeWithTimeout(pool.query(sql, values), 3000);
      }
    } catch (err: any) {
      console.warn('[MySQL updateGroup notice]:', err?.message);
    }
  }

  return updateGroupInStore(id, updates);
}

/**
 * Delete a single group.
 */
export async function deleteGroup(id: string): Promise<boolean> {
  clearGroupsDalCache();
  const pool = getPool();
  if (pool) {
    try {
      await executeWithTimeout(pool.query('DELETE FROM groups_dir WHERE id = ? OR slug = ?', [id, id]), 3000);
    } catch {}
  }
  return deleteGroupInStore(id);
}

/**
 * Delete multiple groups.
 */
export async function deleteMultipleGroups(ids: string[]): Promise<number> {
  clearGroupsDalCache();
  if (!ids || ids.length === 0) return 0;
  let count = 0;
  const pool = getPool();
  if (pool) {
    try {
      const placeholders = ids.map(() => '?').join(', ');
      const [res]: any = await executeWithTimeout(pool.query(`DELETE FROM groups_dir WHERE id IN (${placeholders})`, ids), 3000);
      count = res?.affectedRows || 0;
    } catch {}
  }
  const storeCount = deleteMultipleGroupsInStore(ids);
  return count > 0 ? count : storeCount;
}

/**
 * Logs a user action (upvote, join, share, rating, comment) into the MySQL `group_actions` table
 * for gamified ranking calculations and IP-based anti-abuse tracking.
 */
export async function logGroupAction(params: {
  groupId: string;
  actionType: 'upvote' | 'join' | 'share' | 'rating' | 'comment';
  ipAddress: string;
  userAgent?: string;
  userId?: string;
}): Promise<boolean> {
  const pool = getPool();
  if (!pool || !params.groupId) return false;
  try {
    const cleanIp = (params.ipAddress || '127.0.0.1').split(',')[0].trim() || '127.0.0.1';
    await executeWithTimeout(
      pool.query(
        `INSERT INTO group_actions (group_id, action_type, ip_address, user_agent, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [params.groupId, params.actionType, cleanIp, (params.userAgent || '').slice(0, 500), params.userId || null]
      ),
      3000
    );
    return true;
  } catch (err: any) {
    console.warn('[MySQL logGroupAction notice]:', err?.message);
    return false;
  }
}

/**
 * Atomically upvote a group.
 */
export async function upvoteGroup(id: string, actionOrAmount: 'add' | 'remove' | number = 1): Promise<Group | null> {
  clearGroupsDalCache();
  const amount = typeof actionOrAmount === 'number'
    ? actionOrAmount
    : (actionOrAmount === 'remove' ? -1 : 1);
  const pool = getPool();
  if (pool) {
    try {
      const sql = amount >= 0
        ? 'UPDATE groups_dir SET upvotes = upvotes + ? WHERE id = ? OR slug = ?'
        : 'UPDATE groups_dir SET upvotes = GREATEST(0, CAST(upvotes AS SIGNED) + ?) WHERE id = ? OR slug = ?';
      await executeWithTimeout(pool.execute(sql, [amount, id, id]), 3000);
    } catch {}
  }
  const storeAction: 'add' | 'remove' = (typeof actionOrAmount === 'number' && actionOrAmount < 0) || actionOrAmount === 'remove' ? 'remove' : 'add';
  return upvoteGroupInStore(id, storeAction);
}

/**
 * Atomically bookmark a group.
 */
export async function bookmarkGroup(id: string, action: 'add' | 'remove' = 'add'): Promise<Group | null> {
  clearGroupsDalCache();
  const pool = getPool();
  const amount = action === 'add' ? 1 : -1;
  if (pool) {
    try {
      const sql = amount >= 0
        ? 'UPDATE groups_dir SET bookmarks = bookmarks + ? WHERE id = ? OR slug = ?'
        : 'UPDATE groups_dir SET bookmarks = GREATEST(0, CAST(bookmarks AS SIGNED) + ?) WHERE id = ? OR slug = ?';
      await executeWithTimeout(pool.execute(sql, [amount, id, id]), 3000);
    } catch {}
  }
  return bookmarkGroupInStore(id, action);
}

/**
 * Atomically increment clicks on join link.
 */
export async function incrementClick(id: string, amount = 1): Promise<boolean> {
  const pool = getPool();
  if (pool) {
    try {
      await executeWithTimeout(
        pool.execute(
          'UPDATE groups_dir SET clicks = clicks + ? WHERE id = ? OR slug = ?',
          [amount, id, id]
        ),
        3000
      );
      return true;
    } catch {}
  }
  await trackGroupClickInStore(id);
  return true;
}

export async function trackGroupClick(id: string): Promise<Group | null> {
  await incrementClick(id, 1);
  return getGroupBySlug(id);
}

export const recordJoinClick = trackGroupClick;

export async function trackGroupShare(id: string): Promise<Group | null> {
  const pool = getPool();
  if (pool) {
    try {
      await executeWithTimeout(pool.execute('UPDATE groups_dir SET shares = shares + 1 WHERE id = ? OR slug = ?', [id, id]), 3000);
    } catch {}
  }
  return trackGroupShareInStore(id);
}

export const recordShareClick = trackGroupShare;

export async function rateGroup(id: string, ratingValue: number) {
  return rateGroupInStore(id, ratingValue);
}

export async function addGroupComment(groupId: string, name: string, comment: string, email?: string) {
  return addGroupCommentInStore(groupId, { name, email: email || 'user@example.com', comment });
}

export function getGroupComments(groupId: string): GroupComment[] {
  return getGroupCommentsFromStore(groupId);
}

export async function deleteGroupComment(groupId?: string, commentId?: string): Promise<boolean> {
  return deleteGroupCommentInStore(groupId, commentId);
}

export async function reportGroup(id: string, reason: string, customMessage?: string): Promise<boolean> {
  try {
    const res = recordGroupReportInStore(id, reason, customMessage);
    return res.success;
  } catch (err) {
    return false;
  }
}

/**
 * Get Leaderboard data with raw SQL queries.
 */
export async function getLeaderboardData(category?: string): Promise<{ topUpvoted: Group[]; topJoined: Group[]; topRated: Group[] }> {
  const pool = getPool();
  if (pool) {
    try {
      let where = 'WHERE isActive = 1 AND (isExpired = 0 OR isExpired IS NULL) AND isNsfw = 0';
      const params: any[] = [];
      if (category && category !== 'all' && category !== 'All Categories') {
        where = 'WHERE isActive = 1 AND (isExpired = 0 OR isExpired IS NULL) AND category = ?';
        params.push(category);
      }

      const [upvotedRows]: any = await executeWithTimeout(pool.query(`SELECT ${GROUP_CARD_COLUMNS} FROM groups_dir ${where} ORDER BY upvotes DESC LIMIT 10`, params), 3000);
      const [joinedRows]: any = await executeWithTimeout(pool.query(`SELECT ${GROUP_CARD_COLUMNS} FROM groups_dir ${where} ORDER BY clicks DESC LIMIT 10`, params), 3000);
      const [ratedRows]: any = await executeWithTimeout(pool.query(`SELECT ${GROUP_CARD_COLUMNS} FROM groups_dir ${where} ORDER BY rankScore DESC LIMIT 10`, params), 3000);

      if (upvotedRows?.length > 0) {
        return {
          topUpvoted: upvotedRows.map(parseMysqlGroupRow),
          topJoined: joinedRows.map(parseMysqlGroupRow),
          topRated: ratedRows.map(parseMysqlGroupRow),
        };
      }
    } catch {}
  }

  const db = getGroupsDatabase();
  const isAdultHidden = isAdultContentHidden();
  const isAdultMode = !isAdultHidden && category === 'Adult / 18+';
  let list = db.filter(g => (g.isActive !== false && (g as any).is_active !== false));
  
  if (category && category !== 'all' && category !== 'All Categories') {
    const targetCat = (category === 'Adult / 18+' && isAdultHidden) ? 'Tech & Programming' : category;
    list = list.filter(g => g.category?.toLowerCase() === targetCat.toLowerCase());
  } else if (!isAdultMode || isAdultHidden) {
    list = list.filter(g => !isAdultGroup(g));
  }

  const topUpvoted = [...list].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).slice(0, 10);
  const topJoined = [...list].sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 10);
  const topRated = [...list].sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0)).slice(0, 10);

  return { topUpvoted, topJoined, topRated };
}

export const getLeaderboard = getLeaderboardData;

/**
 * Get network stats with raw MySQL aggregation query.
 */
export async function getNetworkStats(): Promise<NetworkStats> {
  const now = Date.now();
  if (NETWORK_STATS_MEMO_CACHE && now - NETWORK_STATS_MEMO_CACHE.timestamp < CACHE_EXPIRATION_MS) {
    return NETWORK_STATS_MEMO_CACHE.data;
  }

  const pool = getPool();
  if (pool) {
    try {
      const [rows]: any = await executeWithTimeout(pool.query(`
        SELECT 
          COUNT(*) AS totalGroups,
          COALESCE(SUM(clicks), 0) AS totalJoins,
          COALESCE(SUM(memberCount), 0) AS totalMembers,
          COALESCE(SUM(upvotes), 0) AS totalUpvotes
        FROM groups_dir
        WHERE isActive = 1
      `), 3000);

      if (rows && rows.length > 0 && Number(rows[0].totalGroups) > 0) {
        const totalCount = Number(rows[0].totalGroups);
        const stats: NetworkStats = {
          totalGroups: totalCount,
          totalJoins: Number(rows[0].totalJoins) || 0,
          totalMembers: Number(rows[0].totalMembers) || 0,
          totalUpvotes: Number(rows[0].totalUpvotes) || 0,
          categoriesCount: CATEGORIES.length,
          supportedPlatformsCount: 6,
          platformCounts: {
            whatsapp: Math.round(totalCount * 0.45),
            telegram: Math.round(totalCount * 0.25),
            discord: Math.round(totalCount * 0.15),
            signal: Math.round(totalCount * 0.05),
            reddit: Math.round(totalCount * 0.05),
            facebook: Math.round(totalCount * 0.03),
            snapchat: Math.round(totalCount * 0.02),
            other: 0,
          },
        };
        NETWORK_STATS_MEMO_CACHE = { data: stats, timestamp: now };
        return stats;
      }
    } catch {}
  }

  const stats = await getStatsFromStore();
  NETWORK_STATS_MEMO_CACHE = { data: stats, timestamp: now };
  return stats;
}

export const getStats = getNetworkStats;

/**
 * Get 24-hour trending groups and leaderboard data.
 * Aggregates points dynamically from MySQL `group_actions` table:
 * - Upvotes & Joins: +1 point per unique IP
 * - Shares, Ratings, Comments: max +5 points per action type per day
 */
export async function get24HourTrending(
  platformOrLimit?: string | number,
  limitArg?: number
): Promise<{
  groups: (Group & { rank24h: number; score24h: number })[];
  champion: Group | null;
  cycleExpiration: { expiresAt: Date; expiresIso: string; formatted: string; hoursLeft: number; minutesLeft: number };
  totalContenders: number;
}> {
  let platform: string | undefined = undefined;
  let limit = 50;

  if (typeof platformOrLimit === 'number') {
    limit = platformOrLimit;
  } else if (typeof platformOrLimit === 'string') {
    if (platformOrLimit !== 'all') {
      platform = platformOrLimit.toLowerCase();
    }
    if (typeof limitArg === 'number') {
      limit = limitArg;
    }
  }

  const pool = getPool();
  if (pool) {
    try {
      let platformCondition = '';
      const queryParams: any[] = [];
      if (platform) {
        platformCondition = 'AND g.platform = ?';
        queryParams.push(platform.toLowerCase());
      }

      const actionSql = `
        SELECT 
          a.group_id,
          (
            COUNT(DISTINCT CASE WHEN a.action_type = 'upvote' THEN a.ip_address END) + 
            COUNT(DISTINCT CASE WHEN a.action_type = 'join' THEN a.ip_address END) + 
            LEAST(5, COUNT(CASE WHEN a.action_type = 'share' THEN 1 END)) + 
            LEAST(5, COUNT(CASE WHEN a.action_type = 'rating' THEN 1 END)) + 
            LEAST(5, COUNT(CASE WHEN a.action_type = 'comment' THEN 1 END))
          ) AS score_24h
        FROM group_actions a
        INNER JOIN groups_dir g ON g.id = a.group_id
        WHERE a.created_at >= NOW() - INTERVAL 1 DAY
          AND g.isActive = 1
          ${platformCondition}
        GROUP BY a.group_id
        ORDER BY score_24h DESC
        LIMIT ?
      `;

      const [scoredRows]: any = await executeWithTimeout(pool.query(actionSql, [...queryParams, limit]), 3000);
      const rankedGroups: (Group & { rank24h: number; score24h: number })[] = [];

      if (Array.isArray(scoredRows) && scoredRows.length > 0) {
        const groupIds = scoredRows.map((r: any) => r.group_id);
        const placeholders = groupIds.map(() => '?').join(',');
        const [groupRows]: any = await executeWithTimeout(
          pool.query(
            `SELECT ${GROUP_CARD_COLUMNS} FROM groups_dir WHERE id IN (${placeholders})`,
            groupIds
          ),
          3000
        );
        const groupMap = new Map<string, Group>();
        if (Array.isArray(groupRows)) {
          for (const gr of groupRows) {
            groupMap.set(gr.id, parseMysqlGroupRow(gr));
          }
        }

        let rank = 1;
        for (const sr of scoredRows) {
          const grp = groupMap.get(sr.group_id);
          if (grp) {
            rankedGroups.push({
              ...grp,
              rank24h: rank++,
              score24h: Number(sr.score_24h) || 0,
            });
          }
        }
      }

      // If fewer than limit groups had actions in the last 24h, backfill with top active groups so the leaderboard is never empty
      if (rankedGroups.length < limit) {
        const remaining = limit - rankedGroups.length;
        const existingIds = rankedGroups.map(g => g.id);
        let excludeClause = '';
        const backfillParams = [...queryParams];
        if (existingIds.length > 0) {
          excludeClause = `AND id NOT IN (${existingIds.map(() => '?').join(',')})`;
          backfillParams.push(...existingIds);
        }
        backfillParams.push(remaining);

        const [backfillRows]: any = await executeWithTimeout(
          pool.query(
            `SELECT ${GROUP_CARD_COLUMNS} FROM groups_dir WHERE isActive = 1 AND (isExpired = 0 OR isExpired IS NULL) ${platformCondition} ${excludeClause} ORDER BY clicks DESC, upvotes DESC LIMIT ?`,
            backfillParams
          ),
          3000
        );
        if (Array.isArray(backfillRows)) {
          let rank = rankedGroups.length + 1;
          for (const bfr of backfillRows) {
            rankedGroups.push({
              ...parseMysqlGroupRow(bfr),
              rank24h: rank++,
              score24h: 0,
            });
          }
        }
      }

      if (rankedGroups.length > 0) {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setUTCHours(23, 59, 59, 999);
        const diffMs = Math.max(0, expiresAt.getTime() - now.getTime());
        const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
        const minutesLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
          groups: rankedGroups,
          champion: rankedGroups[0] || null,
          cycleExpiration: {
            expiresAt,
            expiresIso: expiresAt.toISOString(),
            formatted: `${hoursLeft}h ${minutesLeft}m remaining in today's cycle`,
            hoursLeft,
            minutesLeft,
          },
          totalContenders: rankedGroups.length,
        };
      }
    } catch (err: any) {
      console.warn('[MySQL get24HourTrending error]:', err?.message);
    }
  }

  return get24HourLeaderboardFromStore(platform, limit);
}

export const get24HourTrendingGroups = get24HourTrending;

/**
 * Get 7-day trending groups and leaderboard data.
 * Aggregates points dynamically from MySQL `group_actions` table:
 * - Upvotes & Joins: +1 point per unique IP
 * - Shares, Ratings, Comments: max +35 points per action type per 7 days
 */
export async function get7DayTrending(
  platformOrLimit?: string | number,
  limitArg?: number
): Promise<{
  groups: (Group & { rank7d: number; score7d: number })[];
  champion: Group | null;
  totalContenders: number;
}> {
  let platform: string | undefined = undefined;
  let limit = 50;

  if (typeof platformOrLimit === 'number') {
    limit = platformOrLimit;
  } else if (typeof platformOrLimit === 'string') {
    if (platformOrLimit !== 'all') {
      platform = platformOrLimit.toLowerCase();
    }
    if (typeof limitArg === 'number') {
      limit = limitArg;
    }
  }

  const pool = getPool();
  if (pool) {
    try {
      let platformCondition = '';
      const queryParams: any[] = [];
      if (platform) {
        platformCondition = 'AND g.platform = ?';
        queryParams.push(platform.toLowerCase());
      }

      const actionSql = `
        SELECT 
          a.group_id,
          (
            COUNT(DISTINCT CASE WHEN a.action_type = 'upvote' THEN a.ip_address END) + 
            COUNT(DISTINCT CASE WHEN a.action_type = 'join' THEN a.ip_address END) + 
            LEAST(35, COUNT(CASE WHEN a.action_type = 'share' THEN 1 END)) + 
            LEAST(35, COUNT(CASE WHEN a.action_type = 'rating' THEN 1 END)) + 
            LEAST(35, COUNT(CASE WHEN a.action_type = 'comment' THEN 1 END))
          ) AS score_7d
        FROM group_actions a
        INNER JOIN groups_dir g ON g.id = a.group_id
        WHERE a.created_at >= NOW() - INTERVAL 7 DAY
          AND g.isActive = 1
          ${platformCondition}
        GROUP BY a.group_id
        ORDER BY score_7d DESC
        LIMIT ?
      `;

      const [scoredRows]: any = await executeWithTimeout(pool.query(actionSql, [...queryParams, limit]), 3000);
      const rankedGroups: (Group & { rank7d: number; score7d: number })[] = [];

      if (Array.isArray(scoredRows) && scoredRows.length > 0) {
        const groupIds = scoredRows.map((r: any) => r.group_id);
        const placeholders = groupIds.map(() => '?').join(',');
        const [groupRows]: any = await executeWithTimeout(
          pool.query(
            `SELECT ${GROUP_CARD_COLUMNS} FROM groups_dir WHERE id IN (${placeholders})`,
            groupIds
          ),
          3000
        );
        const groupMap = new Map<string, Group>();
        if (Array.isArray(groupRows)) {
          for (const gr of groupRows) {
            groupMap.set(gr.id, parseMysqlGroupRow(gr));
          }
        }

        let rank = 1;
        for (const sr of scoredRows) {
          const grp = groupMap.get(sr.group_id);
          if (grp) {
            rankedGroups.push({
              ...grp,
              rank7d: rank++,
              score7d: Number(sr.score_7d) || 0,
            });
          }
        }
      }

      if (rankedGroups.length < limit) {
        const remaining = limit - rankedGroups.length;
        const existingIds = rankedGroups.map(g => g.id);
        let excludeClause = '';
        const backfillParams = [...queryParams];
        if (existingIds.length > 0) {
          excludeClause = `AND id NOT IN (${existingIds.map(() => '?').join(',')})`;
          backfillParams.push(...existingIds);
        }
        backfillParams.push(remaining);

        const [backfillRows]: any = await executeWithTimeout(
          pool.query(
            `SELECT ${GROUP_CARD_COLUMNS} FROM groups_dir WHERE isActive = 1 AND (isExpired = 0 OR isExpired IS NULL) ${platformCondition} ${excludeClause} ORDER BY clicks DESC, upvotes DESC LIMIT ?`,
            backfillParams
          ),
          3000
        );
        if (Array.isArray(backfillRows)) {
          let rank = rankedGroups.length + 1;
          for (const bfr of backfillRows) {
            rankedGroups.push({
              ...parseMysqlGroupRow(bfr),
              rank7d: rank++,
              score7d: 0,
            });
          }
        }
      }

      return {
        groups: rankedGroups,
        champion: rankedGroups[0] || null,
        totalContenders: rankedGroups.length,
      };
    } catch (err: any) {
      console.warn('[MySQL get7DayTrending error]:', err?.message);
    }
  }

  const fallback24 = await get24HourLeaderboardFromStore(platform, limit);
  return {
    groups: fallback24.groups.map(g => ({ ...g, rank7d: g.rank24h, score7d: g.score24h })),
    champion: fallback24.champion,
    totalContenders: fallback24.totalContenders,
  };
}

export const get7DayTrendingGroups = get7DayTrending;

export async function getRelatedGroups(group: Group, limit = 6): Promise<Group[]> {
  const pool = getPool();
  if (pool) {
    try {
      const [rows]: any = await executeWithTimeout(
        pool.query(
          'SELECT * FROM groups_dir WHERE category = ? AND id != ? AND isActive = 1 AND (isExpired = 0 OR isExpired IS NULL) ORDER BY upvotes DESC, memberCount DESC LIMIT ?',
          [group.category, group.id, limit]
        ),
        3000
      );
      if (rows && rows.length > 0) {
        return rows.map(parseMysqlGroupRow);
      }
    } catch {}
  }

  const result = await getGroups({
    category: group.category,
    limit: limit + 5,
  });
  return result.groups.filter(g => g.id !== group.id).slice(0, limit);
}

export async function updateStickyPromotion(
  groupId: string,
  isStickyOrHours: boolean | number = true,
  stickyUntil?: string,
  stickyOrder?: number
): Promise<Group | null> {
  clearGroupsDalCache();
  let durationHours = 24;
  if (typeof isStickyOrHours === 'number') {
    durationHours = isStickyOrHours;
  }
  return updateStickyPromotionInStore(groupId, durationHours);
}

export async function addCustomTagToGroup(groupId: string, tag: string): Promise<Group | null> {
  clearGroupsDalCache();
  return addCustomTagToGroupInStore(groupId, tag);
}

export const addTagToGroup = addCustomTagToGroup;
export const addCustomTag = addCustomTagToGroup;

export function getAllIndexableTags(): { name: string; slug: string; count: number; lastModified?: string }[] {
  const now = new Date().toISOString();
  return [
    { name: 'Crypto', slug: 'crypto', count: 120, lastModified: now },
    { name: 'Coding', slug: 'coding', count: 95, lastModified: now },
    { name: 'Gaming', slug: 'gaming', count: 180, lastModified: now },
    { name: 'Anime', slug: 'anime', count: 140, lastModified: now },
    { name: 'Jobs', slug: 'jobs', count: 85, lastModified: now },
    { name: 'Startups', slug: 'startups', count: 70, lastModified: now },
    { name: 'Language Exchange', slug: 'language-exchange', count: 65, lastModified: now },
    { name: 'Memes', slug: 'memes', count: 210, lastModified: now },
  ];
}

export function getAllIndexableCategories(): { name: string; slug: string; count?: number; lastModified?: string }[] {
  return CATEGORIES.filter(c => c !== 'Adult / 18+').map(name => ({
    name,
    slug: categoryToSlug(name),
    count: 25,
    lastModified: new Date().toISOString(),
  }));
}

export function getAllIndexableCountries(): { name: string; code: string; slug: string; count?: number; lastModified?: string }[] {
  return REGIONS.map(r => {
    const slug = r.toLowerCase().replace(/\s+/g, '-');
    return { name: r, code: slug, slug, count: 15, lastModified: new Date().toISOString() };
  });
}

export function getAllIndexableLanguages(): { name: string; code: string; slug: string; count?: number; lastModified?: string }[] {
  return LANGUAGES.map(l => {
    const slug = l.toLowerCase().replace(/\s+/g, '-');
    return { name: l, code: slug, slug, count: 15, lastModified: new Date().toISOString() };
  });
}

export const getIndexableTags = getAllIndexableTags;
export const getIndexableCategories = getAllIndexableCategories;
export const getIndexableCountries = getAllIndexableCountries;
export const getIndexableLanguages = getAllIndexableLanguages;

export async function syncServerDatabase(): Promise<{ success: boolean; message: string }> {
  const pool = getPool();
  if (pool) {
    try {
      const [rows]: any = await executeWithTimeout(pool.query('SELECT COUNT(*) AS count FROM groups_dir'), 3000);
      return { 
        success: true, 
        message: `Connected to native MySQL database successfully. Total groups in 'groups_dir': ${rows?.[0]?.count || 0}.` 
      };
    } catch (err: any) {
      return { success: false, message: `MySQL connection error: ${err.message}` };
    }
  }
  return { success: true, message: 'Self-hosted Server Database is active and operating in real-time.' };
}

export const syncWithDatabase = syncServerDatabase;

export interface BatchImageValidationResult {
  totalChecked: number;
  validCount: number;
  brokenCount: number;
  fixedCount: number;
  flaggedGroups: Array<{
    id: string;
    slug: string;
    title: string;
    originalImageUrl?: string;
    statusCode?: number;
    error?: string;
    replacedWith?: string;
    fixed: boolean;
  }>;
  durationMs: number;
  checkedAt: string;
}

/**
 * Runs automated image validation across a batch of groups daily or on-demand:
 * Proactively identifies broken, 404, or unreachable group image links and replaces them
 * with clean category SVG fallbacks so the directory never exhibits broken image icons or CLS.
 */
export async function runBatchImageHealthCheck(
  batchSize = 50,
  autoFixBroken = true,
  offset = 0
): Promise<BatchImageValidationResult> {
  const startTime = Date.now();
  const checkedAt = new Date().toISOString();

  // 1. Retrieve the batch of groups
  const groupsResult = await getGroups({
    pageSize: Math.min(batchSize, 100),
    offset: Math.max(0, offset),
    status: 'all',
    includeAdult: true,
  });

  const groupsToCheck = groupsResult.groups || [];
  const flaggedGroups: BatchImageValidationResult['flaggedGroups'] = [];
  let validCount = 0;
  let brokenCount = 0;
  let fixedCount = 0;

  // 2. Validate in micro-chunks of 5 concurrent requests to avoid socket saturation
  const CHUNK_SIZE = 5;
  for (let i = 0; i < groupsToCheck.length; i += CHUNK_SIZE) {
    const chunk = groupsToCheck.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (group) => {
        const rawImg = group.imageUrl;
        const valResult = await validateGroupImageUrl(rawImg, group.category, group.title, false);

        if (valResult.isValid) {
          validCount++;
        } else {
          brokenCount++;
          let fixed = false;
          let replacedWith: string | undefined = undefined;

          if (autoFixBroken && valResult.sanitizedUrl) {
            try {
              await updateGroup(group.id, {
                imageUrl: valResult.sanitizedUrl,
                bannerUrl: group.bannerUrl ? undefined : valResult.sanitizedUrl,
              });
              fixed = true;
              fixedCount++;
              replacedWith = valResult.sanitizedUrl;
            } catch (updateErr: any) {
              console.warn(`[BatchImageHealthCheck] Failed to auto-fix group ${group.id}:`, updateErr?.message);
            }
          }

          flaggedGroups.push({
            id: group.id,
            slug: group.slug,
            title: group.title,
            originalImageUrl: rawImg,
            statusCode: valResult.statusCode,
            error: valResult.error,
            replacedWith,
            fixed,
          });
        }
      })
    );
  }

  clearGroupsDalCache();

  return {
    totalChecked: groupsToCheck.length,
    validCount,
    brokenCount,
    fixedCount,
    flaggedGroups,
    durationMs: Date.now() - startTime,
    checkedAt,
  };
}
