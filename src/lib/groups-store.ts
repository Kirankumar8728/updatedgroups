import { Group, GroupComment, Platform, Category, Language, Region, FilterState } from '@/src/types';
import { ALL_SEED_GROUPS, INITIAL_GROUPS } from '@/src/data/seedGroups';
import { classifyGroupCategory } from '@/src/lib/taxonomy';
import {
  detectPlatformFromUrl,
  ensureUrlMatchesPlatform,
  validateGroupUrl,
  calculatePopularityScore,
  calculate24HourDailyScore,
  calculate7DayScore,
  getHourlyDeterministicRandom,
  get24HourCycleExpiration,
  inject24HourTopRankedInThirdPlace,
  extractCanonicalGroupIdentifier,
  checkDuplicateCommunity,
  calculateRankScore,
  calculateRankGrade,
  generateSlug,
  isAdultGroup,
  isGroupCurrentlySticky,
  sortGroupsWithSticky,
  mergeGroupsWithStickyRanks,
  CATEGORIES,
  LANGUAGES,
  REGIONS,
  getCategoryFallbackImage,
  resolveValidGroupImage,
  getNumericGroupId,
  isGenericGroupTitle,
} from '@/src/utils/helpers';
import { analyzeGroupContent } from '@/src/utils/keywordFilter';
import { isAdultContentHidden } from '@/src/lib/content-settings';
import { BOOST_PLANS, getBoostPlanById, BoostPlan } from '@/src/utils/boostPlans';
import { 
  checkGroupRestrictedContent, 
  checkIsRestrictedText, 
  maskEmail, 
  DEFAULT_RESTRICTED_KEYWORDS 
} from '@/src/utils/moderation';
import { generateFallbackImage } from '@/src/lib/local-image-processor';
import { getPool, queryRows, executeDml } from '@/src/lib/db';
import {
  loadReportsFromDisk,
  saveReportsToDisk,
  loadKeywordsFromDisk,
  saveKeywordsToDisk,
  loadGroupsFromDisk,
  saveGroupsToDisk,
  getGroupsDiskMtime,
  clearPersistenceCache
} from './groups-persistence';
import {
  isInvalidOrBlockedTitle,
  isInvalidOrBlockedDescription,
  isGenericOrInvalidImage,
  sanitizeGroupUpdatesWithProtection
} from './metadata-validator';

// Fast O(1) in-memory index for single group lookups by ID and Slug
const groupsLookupIndex = new Map<string, Group>();
let statsCache: { data: any; timestamp: number } | null = null;

/**
 * Completely purges and removes groups from RAM memory, resetting internal buffers
 * and triggering Node.js garbage collection when available.
 */
export function clearGroupsFromRam(): { success: boolean; freedCount: number; memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number } } {
  const previousCount = globalForGroups.nexusGroupsDatabase?.length || 0;

  // 1. Clear in-memory lookup index & stats cache
  groupsLookupIndex.clear();
  statsCache = null;

  // 2. Clear disk persistence caches
  clearPersistenceCache();

  // 3. Clear global RAM array
  globalForGroups.nexusGroupsDatabase = [];
  globalForGroups.nexusGroupsLastMtime = 0;

  // 4. Trigger garbage collector if exposed
  if (typeof globalThis !== 'undefined' && (globalThis as any).gc) {
    try {
      (globalThis as any).gc();
    } catch {}
  }

  const mem = process.memoryUsage();
  return {
    success: true,
    freedCount: previousCount,
    memory: {
      rssMb: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
    },
  };
}

function rebuildGroupsLookupIndex(db: Group[]) {
  groupsLookupIndex.clear();
  statsCache = null;
  for (const g of db) {
    if (!g) continue;
    const numId = getNumericGroupId(g);
    if (numId) {
      g.numericId = numId;
      groupsLookupIndex.set(String(numId), g);
    }
    if (g.id) {
      groupsLookupIndex.set(g.id, g);
      groupsLookupIndex.set(g.id.toLowerCase(), g);
    }
    if (g.slug) {
      groupsLookupIndex.set(g.slug, g);
      groupsLookupIndex.set(g.slug.toLowerCase(), g);
    }
    if (g.title) {
      const tSlug = generateSlug(g.title);
      if (tSlug) {
        groupsLookupIndex.set(tSlug, g);
        groupsLookupIndex.set(tSlug.toLowerCase(), g);
      }
    }
  }
}
// Global in-memory groups database initialized with seeds, sorted newest first
const globalForGroups = globalThis as unknown as {
  nexusGroupsDatabase: Group[];
  nexusGroupsLastMtime?: number;
  nexusAdminLoginOtp: { code: string; expiresAt: number; email: string } | null;
  nexusAdminResetOtp: { code: string; expiresAt: number; email: string } | null;
  nexusRestrictedKeywords: string[];
  nexusGroupReports?: {
    id: string;
    groupId: string;
    groupTitle: string;
    reason: string;
    customMessage?: string;
    createdAt: string;
  }[];
};

if (!globalForGroups.nexusRestrictedKeywords) {
  globalForGroups.nexusRestrictedKeywords = [...DEFAULT_RESTRICTED_KEYWORDS];
}

function sanitizeGroupWithDefaults(g: Group, idx: number = 0): Group {
  const detected = detectPlatformFromUrl(g.url);
  const plat = (detected !== 'other') ? detected : (g.platform || 'whatsapp');
  
  const authorName = (typeof g.authorName === 'string' && g.authorName.trim()) ? g.authorName.trim() : 'Community Member';
  const publishedAt = g.publishedAt || g.createdAt || new Date().toISOString();

  return {
    ...g,
    platform: plat,
    url: ensureUrlMatchesPlatform(g.url, plat, g.slug || g.id),
    imageUrl: resolveValidGroupImage(g.imageUrl, g.category, g.title, false),
    bannerUrl: resolveValidGroupImage(g.bannerUrl, g.category, g.title, true),
    authorName,
    publishedAt,
    clicks: 0,
    upvotes: 0,
    shares: 0,
    bookmarks: 0,
    rating: 0,
    ratingCount: 0,
    comments: [],
    isActive: g.isActive !== false && g.is_active !== false,
    is_active: g.isActive !== false && g.is_active !== false,
  };
}

export function ensureMinimumTaxonomyCoverage(db: Group[]): Group[] {
  // Never automatically generate or inject synthetic/random mock groups into the directory
  return db;
}

export async function resetAllGroupMetricsToZero(options: {
  resetUpvotes?: boolean;
  resetJoins?: boolean;
  resetShares?: boolean;
} = {}): Promise<{ success: boolean; updatedCount: number; message: string }> {
  const { resetUpvotes = true, resetJoins = true, resetShares = true } = options;
  const pool = getPool();
  let updatedCount = 0;
  const today = new Date().toISOString().split('T')[0];

  if (pool) {
    try {
      const setClauses: string[] = [];
      if (resetUpvotes) setClauses.push('upvotes = 0');
      if (resetJoins) setClauses.push('clicks = 0, views = 0');
      if (resetShares) setClauses.push('shares = 0');

      if (setClauses.length > 0) {
        const [res]: any = await pool.query(`
          UPDATE groups_dir 
          SET ${setClauses.join(', ')}, bookmarks = 0, comments = '[]'
        `);
        await pool.query('TRUNCATE TABLE group_actions').catch(() => {});
        updatedCount = res?.affectedRows || 0;
      }
    } catch (err: any) {
      console.warn('[resetAllGroupMetricsToZero MySQL notice]:', err?.message);
    }
  }

  if (globalForGroups.nexusGroupsDatabase) {
    globalForGroups.nexusGroupsDatabase.forEach(g => {
      if (resetUpvotes) g.upvotes = 0;
      if (resetJoins) g.clicks = 0;
      if (resetShares) g.shares = 0;
      g.bookmarks = 0;
      g.rating = 0;
      g.ratingCount = 0;
      g.comments = [];
      g.activity24h = { joins: 0, upvotes: 0, shares: 0, score: 0, cycleDate: today };
    });
    updatedCount = Math.max(updatedCount, globalForGroups.nexusGroupsDatabase.length);
    rebuildGroupsLookupIndex(globalForGroups.nexusGroupsDatabase);
    statsCache = null;
  }

  return {
    success: true,
    updatedCount,
    message: `Successfully reset all upvotes, joins, and shares to zero across ${updatedCount} communities.`
  };
}

export async function syncDatabase(): Promise<{
  success: boolean;
  source: 'mysql' | 'seed';
  count: number;
  message: string;
}> {
  const pool = getPool();
  if (pool) {
    try {
      const [rows]: any = await pool.query('SELECT COUNT(*) AS total FROM groups_dir');
      const count = Number(rows?.[0]?.total || 0);
      return {
        success: true,
        source: 'mysql',
        count,
        message: `Connected to native MySQL database. Total groups: ${count}.`
      };
    } catch (err: any) {
      console.warn('[GROUPS STORE] MySQL sync notice:', err?.message);
    }
  }

  return {
    success: true,
    source: 'seed',
    count: globalForGroups.nexusGroupsDatabase?.length || 0,
    message: 'Storage loaded.'
  };
}

export const syncWithLocalDatabase = syncDatabase;

function syncDatabaseFromSeeds(): void {
  const fromDisk = loadGroupsFromDisk();

  if (fromDisk && Array.isArray(fromDisk)) {
    globalForGroups.nexusGroupsDatabase = fromDisk;
  } else {
    globalForGroups.nexusGroupsDatabase = [];
  }
  rebuildGroupsLookupIndex(globalForGroups.nexusGroupsDatabase);
}

// Initial boot: load database from disk or fallback to initial seeds if clean empty
if (!globalForGroups.nexusGroupsDatabase || globalForGroups.nexusGroupsDatabase.length === 0) {
  syncDatabaseFromSeeds();
} else {
  rebuildGroupsLookupIndex(globalForGroups.nexusGroupsDatabase);
}

// Also load reports and keywords from disk if available
const diskReports = loadReportsFromDisk();
if (diskReports && Array.isArray(diskReports)) {
  globalForGroups.nexusGroupReports = diskReports;
}
const diskKeywords = loadKeywordsFromDisk();
if (diskKeywords && Array.isArray(diskKeywords) && diskKeywords.length > 0) {
  globalForGroups.nexusRestrictedKeywords = diskKeywords;
}

export function persistCurrentGroups(_immediate = false): void {
  try {
    if (globalForGroups.nexusGroupsDatabase && globalForGroups.nexusGroupsDatabase.length > 0) {
      saveGroupsToDisk(globalForGroups.nexusGroupsDatabase);
    }
  } catch (err: any) {
    console.warn('[GROUPS STORE] Failed to persist groups to disk:', err?.message);
  }
}

export function getGroupsDatabase(): Group[] {
  try {
    const diskMtime = getGroupsDiskMtime();
    if (diskMtime > 0) {
      if (!globalForGroups.nexusGroupsLastMtime || diskMtime > globalForGroups.nexusGroupsLastMtime) {
        globalForGroups.nexusGroupsLastMtime = diskMtime;
        const fresh = loadGroupsFromDisk();
        if (fresh && Array.isArray(fresh) && fresh.length > 0) {
          globalForGroups.nexusGroupsDatabase = fresh;
          rebuildGroupsLookupIndex(globalForGroups.nexusGroupsDatabase);
        }
      }
    }
  } catch (err) {
    // Ignore error
  }

  if (!globalForGroups.nexusGroupsDatabase || globalForGroups.nexusGroupsDatabase.length === 0) {
    syncDatabaseFromSeeds();
  }

  if (groupsLookupIndex.size === 0 && globalForGroups.nexusGroupsDatabase.length > 0) {
    rebuildGroupsLookupIndex(globalForGroups.nexusGroupsDatabase);
  }

  return globalForGroups.nexusGroupsDatabase;
}

function sanitizeRestoredGroup(g: any, idx: number = 0): Group {
  if (!g || typeof g !== 'object') {
    return sanitizeGroupWithDefaults({
      id: `group-${Date.now()}-${idx}`,
      title: 'Community Link',
      description: '',
      url: 'https://chat.whatsapp.com/sample',
      platform: 'whatsapp',
      category: 'Tech & Programming',
      language: 'English',
      region: 'Global',
      customTags: [],
      imageUrl: '',
      memberCount: 500,
      growthRate: 5.0,
      clicks: 0,
      upvotes: 0,
      bookmarks: 0,
      verified: false,
      featured: false,
      isNsfw: false,
      safetyScore: 95,
      rankScore: 85,
      rankGrade: 'A',
      rankKeywords: [],
      slug: `community-${idx}`,
      createdAt: new Date().toISOString(),
      lastActive: 'Just now',
    }, idx);
  }

  const rawUrl = typeof g.url === 'string' ? g.url.trim() : '';
  const detected = detectPlatformFromUrl(rawUrl);
  const plat: Platform = (detected !== 'other') ? detected : (g.platform || 'whatsapp');
  const titleSlug = (typeof g.title === 'string' && g.title.trim() && !isGenericGroupTitle(g.title))
    ? generateSlug(g.title.trim())
    : '';
  const slug = titleSlug || (typeof g.slug === 'string' && g.slug.trim() ? g.slug.trim() : generateSlug(g.id || 'community'));
  const cleanUrl = rawUrl.length > 0 ? rawUrl : ensureUrlMatchesPlatform('', plat, slug || g.id || idx);

  // Restore comments array completely with author information, masked emails, and text
  let comments: GroupComment[] = [];
  if (Array.isArray(g.comments)) {
    comments = g.comments.map((c: any, cIdx: number) => {
      const email = typeof c?.email === 'string' ? c.email : '';
      const masked = typeof c?.maskedEmail === 'string' && c.maskedEmail
        ? c.maskedEmail
        : (email ? maskEmail(email) : 'member@user.com');

      return {
        id: (c && typeof c.id === 'string' && c.id) ? c.id : `comm-${g.id || idx}-${cIdx + 1}`,
        groupId: (c && typeof c.groupId === 'string' && c.groupId) ? c.groupId : (g.id || ''),
        name: (c && typeof c.name === 'string' && c.name) ? c.name : 'Community Member',
        email,
        maskedEmail: masked,
        comment: (c && typeof c.comment === 'string') ? c.comment : String(c || ''),
        createdAt: (c && typeof c.createdAt === 'string' && c.createdAt) ? c.createdAt : new Date().toISOString()
      };
    });
  }

  // Restore ratings & counts
  const rating = typeof g.rating === 'number' && !isNaN(g.rating) ? g.rating : 5.0;
  const ratingCount = typeof g.ratingCount === 'number' && !isNaN(g.ratingCount)
    ? g.ratingCount
    : (comments.length > 0 ? comments.length : 1);

  const nowUtc = new Date();
  const todayCycle = `${nowUtc.getUTCFullYear()}-${String(nowUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(nowUtc.getUTCDate()).padStart(2, '0')}`;

  const clicks = typeof g.clicks === 'number' ? g.clicks : 0;
  const upvotes = typeof g.upvotes === 'number' ? g.upvotes : 0;
  const shares = typeof g.shares === 'number' ? g.shares : Math.max(1, Math.round(((clicks * 0.35) + (upvotes * 0.6))));

  let activity24h = g.activity24h;
  if (!activity24h || activity24h.cycleDate !== todayCycle) {
    const joins24h = Math.min(clicks, Math.max(1, Math.round(clicks * 0.18 + ((g.memberCount || 500) > 1000 ? 8 : 3))));
    const upvotes24h = Math.min(upvotes, Math.max(1, Math.round(upvotes * 0.25 + 1)));
    const shares24h = Math.min(shares, Math.max(1, Math.round(shares * 0.22 + 1)));
    const score24h = Math.round((shares24h * 6.0) + (joins24h * 3.5) + (upvotes24h * 5.0) + 15);
    activity24h = {
      joins: joins24h,
      upvotes: upvotes24h,
      shares: shares24h,
      score: score24h,
      cycleDate: todayCycle,
    };
  }

  return {
    ...g,
    id: (typeof g.id === 'string' && g.id.trim()) ? g.id.trim() : `group-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    title: typeof g.title === 'string' ? g.title.trim() : 'Community Link',
    description: typeof g.description === 'string' ? g.description : '',
    rulesSummary: typeof g.rulesSummary === 'string' ? g.rulesSummary : '',
    url: cleanUrl,
    platform: plat,
    category: typeof g.category === 'string' ? g.category : 'Tech & Programming',
    language: typeof g.language === 'string' ? g.language : 'English',
    region: typeof g.region === 'string' ? g.region : 'Global',
    customTags: Array.isArray(g.customTags) ? g.customTags.map(String) : [],
    imageUrl: resolveValidGroupImage(typeof g.imageUrl === 'string' ? g.imageUrl : '', typeof g.category === 'string' ? g.category : 'Tech & Programming', typeof g.title === 'string' ? g.title : 'Community Link', false),
    bannerUrl: resolveValidGroupImage(typeof g.bannerUrl === 'string' ? g.bannerUrl : undefined, typeof g.category === 'string' ? g.category : 'Tech & Programming', typeof g.title === 'string' ? g.title : 'Community Link', true),
    memberCount: typeof g.memberCount === 'number' ? g.memberCount : 500,
    growthRate: typeof g.growthRate === 'number' ? g.growthRate : 5.0,
    clicks,
    upvotes,
    shares,
    activity24h,
    bookmarks: typeof g.bookmarks === 'number' ? g.bookmarks : 0,
    rating,
    ratingCount,
    comments,
    reviews: Array.isArray(g.reviews) ? g.reviews : undefined,
    verified: Boolean(g.verified),
    featured: Boolean(g.featured),
    isNsfw: Boolean(g.isNsfw || g.category === 'Adult / 18+'),
    isSticky: Boolean(g.isSticky),
    stickyUntil: typeof g.stickyUntil === 'string' ? g.stickyUntil : undefined,
    stickyOrder: typeof g.stickyOrder === 'number' ? g.stickyOrder : undefined,
    isPromoted: Boolean(g.isPromoted),
    isDirectPromoted: Boolean(g.isDirectPromoted),
    showInDirectPromoted: Boolean(g.showInDirectPromoted),
    safetyScore: typeof g.safetyScore === 'number' ? g.safetyScore : 95,
    rankScore: typeof g.rankScore === 'number' ? g.rankScore : 85,
    rankGrade: g.rankGrade || 'A',
    rankKeywords: Array.isArray(g.rankKeywords) ? g.rankKeywords.map(String) : [],
    slug,
    metaDescription: typeof g.metaDescription === 'string' ? g.metaDescription : undefined,
    authorName: (typeof g.authorName === 'string' && g.authorName.trim()) ? g.authorName.trim() : 'Anonymous Visitor',
    publishedAt: typeof g.publishedAt === 'string' ? g.publishedAt : (typeof g.createdAt === 'string' ? g.createdAt : new Date().toISOString()),
    createdAt: typeof g.createdAt === 'string' ? g.createdAt : new Date().toISOString(),
    updatedAt: typeof g.updatedAt === 'string' ? g.updatedAt : new Date().toISOString(),
    lastActive: typeof g.lastActive === 'string' ? g.lastActive : 'Just now',
  };
}

export function replaceGroupsDatabase(newGroups: Group[]): { success: boolean; total: number; totalComments: number } {
  const sanitized = newGroups.map((g, idx) => sanitizeRestoredGroup(g, idx));
  globalForGroups.nexusGroupsDatabase = [...sanitized].sort(
    (a, b) => new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime()
  );
  const totalComments = globalForGroups.nexusGroupsDatabase.reduce(
    (acc, g) => acc + (Array.isArray(g.comments) ? g.comments.length : 0), 
    0
  );
  rebuildGroupsLookupIndex(globalForGroups.nexusGroupsDatabase);

  // Execute raw MySQL truncate and batch insert via src/lib/db.ts
  const pool = getPool();
  if (pool && sanitized.length > 0) {
    (async () => {
      try {
        await pool.query('DELETE FROM groups_dir');
        const CHUNK_SIZE = 50;
        for (let i = 0; i < sanitized.length; i += CHUNK_SIZE) {
          const chunk = sanitized.slice(i, i + CHUNK_SIZE);
          const placeholders: string[] = [];
          const values: any[] = [];
          for (const g of chunk) {
            placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            const nowIso = new Date().toISOString();
            values.push(
              g.id,
              g.slug,
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
              JSON.stringify(Array.isArray(g.comments) ? g.comments : [])
            );
          }
          await pool.query(
            `INSERT IGNORE INTO groups_dir (
              id, slug, title, description, url, platform, category,
              language, region, customTags, imageUrl, memberCount,
              verified, isNsfw, status, isActive, safetyScore,
              growthRate, clicks, upvotes, bookmarks, createdAt,
              publishedAt, updatedAt, comments
            ) VALUES ${placeholders.join(', ')}`,
            values
          );
        }
      } catch (err: any) {
        console.warn('[MySQL replaceGroupsDatabase notice]:', err?.message);
      }
    })();
  }

  return { success: true, total: globalForGroups.nexusGroupsDatabase.length, totalComments };
}

export function mergeGroupsDatabase(newGroups: Group[]): { success: boolean; added: number; updated: number; total: number; totalComments: number } {
  const db = globalForGroups.nexusGroupsDatabase;
  let added = 0;
  let updated = 0;

  newGroups.forEach((incomingRaw, idx) => {
    if (!incomingRaw) return;
    const incoming = sanitizeRestoredGroup(incomingRaw, idx);

    const existingIndex = db.findIndex(
      g => g.id === incoming.id || (g.slug && g.slug === incoming.slug) || (g.url && incoming.url && g.url.toLowerCase() === incoming.url.toLowerCase())
    );

    if (existingIndex !== -1) {
      const existing = db[existingIndex];
      // Merge comments without duplicating comment IDs, retaining all comment data
      const existingComments = Array.isArray(existing.comments) ? existing.comments : [];
      const incomingComments = Array.isArray(incoming.comments) ? incoming.comments : [];
      
      const mergedCommentsMap = new Map<string, GroupComment>();
      existingComments.forEach(c => {
        if (c && c.id) mergedCommentsMap.set(c.id, c);
      });
      incomingComments.forEach(c => {
        if (c && c.id) mergedCommentsMap.set(c.id, c);
      });
      const mergedComments = Array.from(mergedCommentsMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      db[existingIndex] = {
        ...existing,
        ...incoming,
        id: existing.id || incoming.id,
        url: incoming.url || existing.url,
        comments: mergedComments,
        rating: typeof incoming.rating === 'number' ? incoming.rating : existing.rating,
        ratingCount: typeof incoming.ratingCount === 'number' ? incoming.ratingCount : Math.max(existing.ratingCount || 0, mergedComments.length),
        updatedAt: new Date().toISOString()
      };
      updated++;
    } else {
      db.push(incoming);
      added++;
    }
  });

  globalForGroups.nexusGroupsDatabase.sort(
    (a, b) => new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime()
  );

  const totalComments = globalForGroups.nexusGroupsDatabase.reduce(
    (acc, g) => acc + (Array.isArray(g.comments) ? g.comments.length : 0), 
    0
  );

  rebuildGroupsLookupIndex(globalForGroups.nexusGroupsDatabase);

  // Execute raw MySQL batch insert via src/lib/db.ts
  const pool = getPool();
  if (pool && newGroups.length > 0) {
    (async () => {
      try {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < newGroups.length; i += CHUNK_SIZE) {
          const chunk = newGroups.slice(i, i + CHUNK_SIZE);
          const placeholders: string[] = [];
          const values: any[] = [];
          for (const g of chunk) {
            placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            const id = g.id || `grp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const slug = g.slug || generateSlug(g.title || id);
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
              JSON.stringify(Array.isArray(g.comments) ? g.comments : [])
            );
          }
          await pool.query(
            `INSERT IGNORE INTO groups_dir (
              id, slug, title, description, url, platform, category,
              language, region, customTags, imageUrl, memberCount,
              verified, isNsfw, status, isActive, safetyScore,
              growthRate, clicks, upvotes, bookmarks, createdAt,
              publishedAt, updatedAt, comments
            ) VALUES ${placeholders.join(', ')}`,
            values
          );
        }
      } catch (err: any) {
        console.warn('[MySQL mergeGroupsDatabase notice]:', err?.message);
      }
    })();
  }

  return { success: true, added, updated, total: db.length, totalComments };
}

export interface GetGroupsOptions {
  search?: string;
  platform?: Platform | 'all';
  category?: Category | 'all' | 'All Categories';
  language?: Language | 'all';
  region?: Region | 'all';
  tag?: string;
  sort?: string;
  verifiedOnly?: boolean;
  rankOptimizedOnly?: boolean;
  memberRange?: string;
  showAdultOnly?: boolean;
  includeAdult?: boolean;
  stickyOnly?: boolean;
  forDirectPromotedPage?: boolean;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
}

export async function queryGroups(options: GetGroupsOptions = {}) {
  const db = getGroupsDatabase();
  let filtered = [...db];

  // Exclude inactive / expired / revoked links by default
  if (!options.includeInactive) {
    filtered = filtered.filter(g => g.isActive !== false && g.is_active !== false && !g.isExpired);
  }

  const {
    search,
    platform,
    category,
    language,
    region,
    tag,
    sort = 'newest',
    verifiedOnly,
    rankOptimizedOnly,
    memberRange,
    showAdultOnly,
    includeAdult,
    stickyOnly,
    limit,
    offset,
    page = 1,
    pageSize = 50,
  } = options;

  let effectiveCategory: string | undefined = category;

  // Strict subdomain and adult filtering isolation
  const isAdultSub = await (await import('@/src/lib/subdomain')).isAdultSubdomainRequest();
  const shouldFilterAdultOnly = isAdultSub || showAdultOnly || effectiveCategory === 'Adult / 18+';
  
  if (shouldFilterAdultOnly) {
    filtered = filtered.filter(g => isAdultGroup(g));
  } else {
    filtered = filtered.filter(g => !isAdultGroup(g));
  }

  // Sticky only filter
  if (stickyOnly) {
    filtered = filtered.filter(g => isGroupCurrentlySticky(g));
  }

  // Search filter
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      g =>
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.platform.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.region.toLowerCase().includes(q) ||
        g.language.toLowerCase().includes(q) ||
        g.customTags.some(t => t.toLowerCase().includes(q)) ||
        (g.rankKeywords && g.rankKeywords.some(k => k.toLowerCase().includes(q)))
    );
  }

  // Platform filter
  if (platform && platform !== 'all') {
    filtered = filtered.filter(g => g.platform.toLowerCase() === platform.toLowerCase());
  }

  // Category filter
  if (effectiveCategory && effectiveCategory !== 'all' && effectiveCategory !== 'All Categories' && effectiveCategory !== 'Adult / 18+') {
    filtered = filtered.filter(g => g.category.toLowerCase() === effectiveCategory.toLowerCase());
  }

  // Language filter
  if (language && language !== 'all') {
    filtered = filtered.filter(
      g => g.language.toLowerCase() === language.toLowerCase() || g.language === 'All / Multilingual'
    );
  }

  // Region filter
  if (region && region !== 'all') {
    filtered = filtered.filter(g => g.region.toLowerCase() === region.toLowerCase() || g.region === 'Global');
  }

  // Tag filter
  if (tag && tag.trim()) {
    const rawTag = tag.trim().toLowerCase();
    const cleanTag = rawTag.replace(/^#+/, '').trim();
    filtered = filtered.filter(g =>
      g.customTags.some(t => {
        const ct = t.toLowerCase().replace(/^#+/, '').trim();
        return ct === cleanTag || ct.includes(cleanTag) || cleanTag.includes(ct);
      }) ||
      (cleanTag.length >= 3 && (
        g.title.toLowerCase().includes(cleanTag) ||
        g.description.toLowerCase().includes(cleanTag) ||
        g.category.toLowerCase().includes(cleanTag)
      ))
    );
  }

  // Verified only
  if (verifiedOnly) {
    filtered = filtered.filter(g => g.verified);
  }

  // Rank Top Tier
  if (rankOptimizedOnly) {
    filtered = filtered.filter(g => (g.rankScore || 0) >= 90 || g.rankGrade === 'A+');
  }

  // Member Range
  if (memberRange && memberRange !== 'all') {
    if (memberRange === 'small') filtered = filtered.filter(g => g.memberCount < 500);
    else if (memberRange === 'medium') filtered = filtered.filter(g => g.memberCount >= 500 && g.memberCount < 5000);
    else if (memberRange === 'large') filtered = filtered.filter(g => g.memberCount >= 5000 && g.memberCount < 50000);
    else if (memberRange === 'mega') filtered = filtered.filter(g => g.memberCount >= 50000);
  }

  // Filter for /direct-promoted-groups page: only show groups flagged showInDirectPromoted or isDirectPromoted
  if (options.forDirectPromotedPage) {
    filtered = filtered.filter(g => g.showInDirectPromoted === true || g.isDirectPromoted === true);
  }

  // Extract all active sticky / boosted groups matching current query filters and NSFW mode
  // Using 'filtered' guarantees that sticky groups strictly adhere to the requested platform, category, region, and search parameters
  const activeStickyGroups = filtered.filter(g => isGroupCurrentlySticky(g, Boolean(options.forDirectPromotedPage)));
  const stickyIds = new Set(activeStickyGroups.map(g => g.id));
  let nonStickyFiltered = filtered.filter(g => !stickyIds.has(g.id));

  // Sort non-sticky filtered results
  nonStickyFiltered.sort((a, b) => {
    if (sort === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sort === 'rank_index') {
      const rankA =
        (a.rankScore || 80) * 10 +
        calculatePopularityScore(a.clicks, a.upvotes, a.memberCount, a.growthRate, a.rankScore || 80);
      const rankB =
        (b.rankScore || 80) * 10 +
        calculatePopularityScore(b.clicks, b.upvotes, b.memberCount, b.growthRate, b.rankScore || 80);
      return rankB - rankA;
    } else if (sort === 'trending') {
      const scoreA = calculatePopularityScore(a.clicks, a.upvotes, a.memberCount, a.growthRate, a.rankScore || 80);
      const scoreB = calculatePopularityScore(b.clicks, b.upvotes, b.memberCount, b.growthRate, b.rankScore || 80);
      return scoreB - scoreA;
    } else if (sort === 'popularity') {
      return b.clicks + b.upvotes * 2 - (a.clicks + a.upvotes * 2);
    } else if (sort === 'members') {
      return b.memberCount - a.memberCount;
    } else if (sort === 'growth') {
      return b.growthRate - a.growthRate;
    } else if (sort === 'upvotes') {
      return b.upvotes - a.upvotes;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Combine active sticky groups into exact rank positions with sorted non-sticky groups
  let sortedWithSticky = mergeGroupsWithStickyRanks(activeStickyGroups, nonStickyFiltered);

  // For discovery feed, inject the 24-Hour Top Ranked Champion (most shares, joins, upvotes & activity) in 3rd place (index 2)
  if (!options.forDirectPromotedPage) {
    sortedWithSticky = inject24HourTopRankedInThirdPlace(sortedWithSticky);
  }

  const total = sortedWithSticky.length;

  const actualLimit = limit !== undefined ? limit : pageSize;
  const actualOffset = offset !== undefined ? offset : (page - 1) * pageSize;
  const paginated = sortedWithSticky.slice(actualOffset, actualOffset + actualLimit);

  return {
    groups: paginated,
    total,
    page,
    pageSize: actualLimit,
    totalPages: Math.ceil(total / actualLimit) || 1,
    offset: actualOffset,
    limit: actualLimit,
  };
}

export async function getGroupByIdOrSlug(idOrSlug: string): Promise<Group | null> {
  if (!idOrSlug) return null;
  const db = getGroupsDatabase();
  const rawClean = idOrSlug.trim();
  
  // Fast path: O(1) indexed Map lookup
  const directHit = groupsLookupIndex.get(rawClean) || groupsLookupIndex.get(rawClean.toLowerCase());
  if (directHit) return directHit;

  let decoded = rawClean;
  try {
    decoded = decodeURIComponent(rawClean);
    const decodedHit = groupsLookupIndex.get(decoded) || groupsLookupIndex.get(decoded.toLowerCase());
    if (decodedHit) return decodedHit;
  } catch {
    // ignore
  }

  // Fallback linear scan only if not in index map
  const rawLower = rawClean.toLowerCase();
  const decodedLower = decoded.toLowerCase();

  const found = db.find(g => {
    if (!g) return false;
    if (g.id === rawClean || g.id.toLowerCase() === rawLower) return true;
    if (g.numericId && String(g.numericId) === rawClean) return true;
    if (/^\d+$/.test(rawClean) && getNumericGroupId(g) === parseInt(rawClean, 10)) return true;
    if (g.slug) {
      const gSlugRaw = g.slug.trim();
      let gSlugDecoded = gSlugRaw;
      try {
        gSlugDecoded = decodeURIComponent(gSlugRaw);
      } catch {}
      if (gSlugRaw === rawClean || gSlugRaw.toLowerCase() === rawLower) return true;
      if (gSlugDecoded.toLowerCase() === decodedLower) return true;
    }
    // Also match by title slug, title directly, or invite URL handle
    if (g.title) {
      const titleLower = g.title.toLowerCase().trim();
      if (titleLower === decodedLower || titleLower === rawLower) return true;
      const titleSlug = generateSlug(g.title);
      if (titleSlug === decodedLower || titleSlug === rawLower) return true;
    }
    if (g.platformHandle) {
      const handleLower = g.platformHandle.toLowerCase().trim();
      if (handleLower === rawLower || handleLower === decodedLower) return true;
    }
    if (g.url) {
      const urlLower = g.url.toLowerCase();
      if (urlLower.endsWith(`/${decodedLower}`) || urlLower.endsWith(`/${rawLower}`)) return true;
      if (urlLower.includes(`/${decodedLower}`) || urlLower.includes(`/${rawLower}`)) return true;
      // Strip platform prefixes like tg-, wa-, dc-
      const strippedPrefix = decodedLower.replace(/^(tg|wa|dc|fb|ig|rd)-/, '');
      if (strippedPrefix.length > 2 && (urlLower.endsWith(`/${strippedPrefix}`) || urlLower.includes(`/${strippedPrefix}`))) return true;
    }
    return false;
  });

  if (found) {
    groupsLookupIndex.set(rawClean, found);
    groupsLookupIndex.set(rawLower, found);
  }

  return found || null;
}

export async function createNewGroup(data: Partial<Group>): Promise<Group> {
  const db = getGroupsDatabase();
  const title = (data.title || '').trim();
  const rawUrl = (data.url || '').trim();
  const description = (data.description || '').trim();
  
  if (!rawUrl) {
    throw new Error('Submission rejected: A valid group invite link is required.');
  }

  const urlCheck = validateGroupUrl(rawUrl);
  if (!urlCheck.isValid) {
    throw new Error(`Submission rejected: ${urlCheck.errorMessage || 'Invalid group invite URL provided.'}`);
  }

  // Comprehensive Duplicate group and invite link check
  const duplicateCheck = checkDuplicateCommunity({
    url: rawUrl,
    title,
    platform: data.platform,
    id: data.id,
  }, db);

  if (duplicateCheck.isDuplicate) {
    const matched = duplicateCheck.matchedGroup;
    if ((data as any).updateExisting && matched) {
      // Allow updating existing group with new details
      const updated = await updateGroup(matched.id, {
        title: title || matched.title,
        url: rawUrl, // Preserve exact user-pasted invite link as-is
        description: description !== undefined ? description : matched.description,
        category: data.category || matched.category,
        language: data.language || matched.language,
        region: data.region || matched.region,
        customTags: Array.isArray(data.customTags) && data.customTags.length > 0 ? data.customTags : matched.customTags,
        imageUrl: data.imageUrl || matched.imageUrl,
        rulesSummary: data.rulesSummary !== undefined ? data.rulesSummary : matched.rulesSummary,
        memberCount: data.memberCount ? Number(data.memberCount) : matched.memberCount,
        updatedAt: new Date().toISOString(),
      });
      return updated || matched;
    }
    const err: any = new Error(
      `Submission rejected: This community is already listed on GroupLinks as "${matched?.title || title}". You can click "Update Existing Group" to update this community.`
    );
    err.isDuplicate = true;
    err.matchedGroup = matched;
    throw err;
  }

  // Zero-tolerance restricted keyword check
  const restrictedCheck = checkGroupRestrictedContent({
    title,
    description,
    url: rawUrl,
    customTags: data.customTags,
    rulesSummary: data.rulesSummary
  }, globalForGroups.nexusRestrictedKeywords);

  if (restrictedCheck.isRestricted) {
    throw new Error(`Submission rejected: Contains strictly prohibited/restricted term "${restrictedCheck.matchedKeyword}". Zero tolerance policy.`);
  }

  const finalId = data.id || `grp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const generatedSlug = generateSlug(title);
  const isPassedSlugGenericOrHash = !data.slug || /^[+]?[a-zA-Z0-9_-]{10,}$/.test(data.slug) || isGenericGroupTitle(data.slug);
  const baseSlug = (generatedSlug && isPassedSlugGenericOrHash)
    ? generatedSlug
    : (generatedSlug || data.slug?.trim() || `group-${Date.now().toString(36)}`);

  let finalSlug = baseSlug;
  let counter = 1;
  while (db.some(g => (g.slug === finalSlug || g.id === finalSlug) && g.id !== finalId)) {
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const detected = detectPlatformFromUrl(rawUrl);
  const detectedPlatform: Platform = detected !== 'other' ? detected : (data.platform || 'whatsapp');
  const url = rawUrl.trim(); // Keep the invite link pasted exactly as it is without mutation

  const formattedTags: string[] = Array.isArray(data.customTags)
    ? data.customTags.map((t: string) => (t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`)).filter(Boolean)
    : [`#${detectedPlatform}`, '#community'];

  const autoAnalysis = analyzeGroupContent({
    title,
    description: data.description ? data.description.trim() : '',
    customTags: formattedTags,
    url,
    rulesSummary: data.rulesSummary || '',
  });

  const isAdult = Boolean(data.isNsfw || data.category === 'Adult / 18+');
  // Run automated taxonomy classification to prevent default "Tech & Programming" bug across diverse topics
  const classifiedCategory = classifyGroupCategory(
    title,
    data.description || '',
    formattedTags,
    url,
    data.category
  );
  const finalCategory: Category = isAdult ? 'Adult / 18+' : classifiedCategory;

  const rankScore = calculateRankScore(title, data.description || '', formattedTags, data.rulesSummary);
  const rankGrade = calculateRankGrade(rankScore);
  const metaDescription = data.description
    ? data.description.trim()
    : `Join ${title} on ${detectedPlatform}. Verified invite link and active community.`;

  const newGroup: Group = {
    id: finalId,
    title,
    description: data.description ? data.description.trim() : `Community group on ${detectedPlatform}`,
    url,
    platform: detectedPlatform,
    category: finalCategory,
    language: data.language || 'English',
    region: data.region || 'Global',
    customTags: formattedTags,
    imageUrl:
      data.imageUrl ||
      (detectedPlatform === 'reddit'
        ? 'https://styles.redditmedia.com/t5_5tdqj0/styles/communityIcon_onzcj67isa2h1.png?width=128&frame=1&auto=webp&s=b8171147c5b6d07442746945e0c57de874f3e71f'
        : getCategoryFallbackImage(finalCategory, false, title)),
    bannerUrl: data.bannerUrl || data.imageUrl || getCategoryFallbackImage(finalCategory, true, title),
    memberCount: Number(data.memberCount) || 250,
    growthRate: 0,
    clicks: 0,
    upvotes: 0,
    shares: 0,
    bookmarks: 0,
    rating: 0,
    ratingCount: 0,
    comments: [],
    verified: false,
    featured: false,
    isNsfw: isAdult,
    isActive: true,
    is_active: true,
    healthStatus: 'active',
    lastHealthCheckedAt: new Date().toISOString(),
    safetyScore: isAdult ? 85 : 96,
    rankScore,
    rankGrade,
    rankKeywords:
      Array.isArray(data.rankKeywords) && data.rankKeywords.length > 0
        ? data.rankKeywords
        : [`${detectedPlatform} group invite`, 'community link', finalCategory.toLowerCase()],
    slug: finalSlug,
    metaDescription,
    authorName: (data.authorName && data.authorName.trim()) ? data.authorName.trim() : 'Anonymous Visitor',
    publishedAt: data.publishedAt || new Date().toISOString(),
    createdAt: data.createdAt || new Date().toISOString(),
    lastActive: 'Just now',
    rulesSummary:
      data.rulesSummary ||
      (detectedPlatform === 'reddit'
        ? '1. Be respectful to members. 2. Stay on topic. 3. No spam or self-promotion. 4. Follow Reddit Content Policy.'
        : 'Be respectful and follow community guidelines.'),
  };

  db.unshift(newGroup);
  // Keep fast O(1) in-memory lookup index synchronized
  if (newGroup.id) {
    groupsLookupIndex.set(newGroup.id, newGroup);
    groupsLookupIndex.set(newGroup.id.toLowerCase(), newGroup);
  }
  if (newGroup.slug) {
    groupsLookupIndex.set(newGroup.slug, newGroup);
    groupsLookupIndex.set(newGroup.slug.toLowerCase(), newGroup);
  }
  persistCurrentGroups();
  return newGroup;
}

export async function updateGroup(id: string, updates: Partial<Group>): Promise<Group | null> {
  const db = getGroupsDatabase();
  const cleanId = (id || '').trim().toLowerCase();
  
  const index = db.findIndex(g => {
    if (!g) return false;
    if (g.id === id || g.id.toLowerCase() === cleanId) return true;
    if (g.slug && (g.slug === id || g.slug.toLowerCase() === cleanId)) return true;
    if (updates.url && g.url) {
      const u1 = g.url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
      const u2 = updates.url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
      if (u1 === u2) return true;
    }
    if (updates.platformHandle && g.platformHandle && g.platform === updates.platform) {
      if (g.platformHandle.toLowerCase() === updates.platformHandle.toLowerCase()) return true;
    }
    return false;
  });

  if (index === -1) return null;

  const existing = db[index];
  const isUserExplicit = Boolean((updates as any).isUserSubmission || (updates as any).updateExisting || (updates as any).isManualEdit || updates.title || updates.description);
  const protectedUpdates = sanitizeGroupUpdatesWithProtection(existing, updates, isUserExplicit);

  const mergedPlatform = protectedUpdates.platform || existing.platform;
  const rawUrl = (protectedUpdates.url !== undefined ? protectedUpdates.url : existing.url).trim();
  const detected = detectPlatformFromUrl(rawUrl);
  const finalPlatform: Platform = detected !== 'other' ? detected : mergedPlatform;
  const finalUrl = ensureUrlMatchesPlatform(rawUrl, finalPlatform, existing.slug || existing.id);

  const finalTitle = updates.title !== undefined && updates.title.trim()
    ? updates.title.trim()
    : (protectedUpdates.title !== undefined ? protectedUpdates.title : existing.title);

  // Directly assign imageUrl and bannerUrl if explicitly provided
  let finalImageUrl = existing.imageUrl;
  let finalBannerUrl = existing.bannerUrl || finalImageUrl;

  if (updates.imageUrl !== undefined) {
    if (updates.imageUrl === null || updates.imageUrl === '') {
        const fallback = await generateFallbackImage(finalPlatform, finalTitle);
        finalImageUrl = fallback.imageUrl || '';
        finalBannerUrl = fallback.imageUrl || '';
    } else {
        finalImageUrl = updates.imageUrl.trim();
        if (updates.bannerUrl !== undefined) {
            finalBannerUrl = updates.bannerUrl.trim();
        }
    }
  } else if (protectedUpdates.imageUrl !== undefined) {
      finalImageUrl = protectedUpdates.imageUrl;
  }

  if (updates.bannerUrl !== undefined && updates.bannerUrl !== null && updates.bannerUrl !== '') {
      finalBannerUrl = updates.bannerUrl.trim();
  } else if (protectedUpdates.bannerUrl !== undefined) {
      finalBannerUrl = protectedUpdates.bannerUrl;
  }

  const finalDescription = updates.description !== undefined
    ? updates.description
    : (protectedUpdates.description !== undefined ? protectedUpdates.description : existing.description);

  db[index] = {
    ...existing,
    ...protectedUpdates,
    title: finalTitle,
    description: finalDescription,
    metaDescription: (finalDescription && finalDescription.trim())
      ? (finalDescription.length > 160 ? finalDescription.slice(0, 157) + '...' : finalDescription.trim())
      : existing.metaDescription,
    imageUrl: finalImageUrl,
    bannerUrl: finalBannerUrl,
    memberCount: updates.memberCount !== undefined ? Number(updates.memberCount) : existing.memberCount,
    onlineCount: updates.onlineCount !== undefined ? Number(updates.onlineCount) : existing.onlineCount,
    customTags: Array.isArray(updates.customTags) ? updates.customTags : existing.customTags,
    metadataSource: updates.metadataSource !== undefined ? updates.metadataSource : existing.metadataSource,
    fallbackMetadata: updates.fallbackMetadata !== undefined ? updates.fallbackMetadata : existing.fallbackMetadata,
    lastMetadataFetchAt: updates.lastMetadataFetchAt !== undefined ? updates.lastMetadataFetchAt : existing.lastMetadataFetchAt,
    metadataFetchError: updates.metadataFetchError !== undefined ? updates.metadataFetchError : (existing.metadataFetchError || null),
    normalizedUrl: updates.normalizedUrl !== undefined ? updates.normalizedUrl : existing.normalizedUrl,
    platformHandle: updates.platformHandle !== undefined ? updates.platformHandle : existing.platformHandle,
    platform: finalPlatform,
    url: finalUrl,
    id: existing.id,
    slug: (finalTitle && !isGenericGroupTitle(finalTitle)) ? generateSlug(finalTitle) : existing.slug,
    updatedAt: new Date().toISOString(),
  };

  // Keep fast O(1) in-memory lookup index synchronized
  const updatedItem = db[index];
  if (existing.id) {
    groupsLookupIndex.set(existing.id, updatedItem);
    groupsLookupIndex.set(existing.id.toLowerCase(), updatedItem);
  }
  if (existing.slug) {
    groupsLookupIndex.set(existing.slug, updatedItem);
    groupsLookupIndex.set(existing.slug.toLowerCase(), updatedItem);
  }
  if (updatedItem.slug) {
    groupsLookupIndex.set(updatedItem.slug, updatedItem);
    groupsLookupIndex.set(updatedItem.slug.toLowerCase(), updatedItem);
  }
  statsCache = null;

  persistCurrentGroups();
  return updatedItem;
}

export async function deleteGroup(id: string): Promise<boolean> {
  const db = getGroupsDatabase();
  if (!id) return false;

  const rawTarget = String(id).trim().toLowerCase();
  let decodedTarget = rawTarget;
  try {
    decodedTarget = decodeURIComponent(String(id)).trim().toLowerCase();
  } catch {}

  const index = db.findIndex(g => {
    const gId = (g.id || '').trim().toLowerCase();
    const gSlug = (g.slug || '').trim().toLowerCase();
    const gUrl = (g.url || '').trim().toLowerCase();
    return (
      gId === rawTarget ||
      gId === decodedTarget ||
      gSlug === rawTarget ||
      gSlug === decodedTarget ||
      (gUrl && (gUrl === rawTarget || gUrl === decodedTarget))
    );
  });

  if (index === -1) {
    const fallbackIndex = db.findIndex(
      g =>
        (g.id && g.id.toLowerCase().includes(decodedTarget)) ||
        (g.slug && g.slug.toLowerCase().includes(decodedTarget))
    );
    if (fallbackIndex !== -1) {
      const removed = db.splice(fallbackIndex, 1)[0];
      if (removed) {
        if (removed.id) {
          groupsLookupIndex.delete(removed.id);
          groupsLookupIndex.delete(removed.id.toLowerCase());
        }
        if (removed.slug) {
          groupsLookupIndex.delete(removed.slug);
          groupsLookupIndex.delete(removed.slug.toLowerCase());
        }
      }
      statsCache = null;
      persistCurrentGroups();
      return true;
    }
    return false;
  }
  const removed = db.splice(index, 1)[0];
  if (removed) {
    if (removed.id) {
      groupsLookupIndex.delete(removed.id);
      groupsLookupIndex.delete(removed.id.toLowerCase());
    }
    if (removed.slug) {
      groupsLookupIndex.delete(removed.slug);
      groupsLookupIndex.delete(removed.slug.toLowerCase());
    }
  }
  statsCache = null;
  persistCurrentGroups();
  return true;
}

export async function deleteMultipleGroups(ids: string[]): Promise<number> {
  const db = getGroupsDatabase();
  if (!Array.isArray(ids) || ids.length === 0) return 0;

  const idSet = new Set<string>();
  ids.forEach(i => {
    if (!i) return;
    const raw = String(i).trim().toLowerCase();
    idSet.add(raw);
    try {
      idSet.add(decodeURIComponent(String(i)).trim().toLowerCase());
    } catch {}
  });

  let count = 0;
  for (let i = db.length - 1; i >= 0; i--) {
    const item = db[i];
    const gId = (item.id || '').trim().toLowerCase();
    const gSlug = (item.slug || '').trim().toLowerCase();
    const gUrl = (item.url || '').trim().toLowerCase();
    if (idSet.has(gId) || idSet.has(gSlug) || idSet.has(gUrl)) {
      db.splice(i, 1);
      count++;
    }
  }
  if (count > 0) {
    persistCurrentGroups();
  }
  return count;
}

function ensureGroup24hActivity(group: Group): void {
  const nowUtc = new Date();
  const todayCycle = `${nowUtc.getUTCFullYear()}-${String(nowUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(nowUtc.getUTCDate()).padStart(2, '0')}`;

  if (!group.activity24h || group.activity24h.cycleDate !== todayCycle) {
    group.activity24h = {
      joins: 0,
      upvotes: 0,
      shares: 0,
      score: 0,
      cycleDate: todayCycle,
    };
    group.dailyRankScore = 0;
    if (group.isDailyTopRanked) {
      group.isDailyTopRanked = false;
    }
  }
}

export async function upvoteGroup(id: string, action: 'add' | 'remove' = 'add'): Promise<Group | null> {
  const db = getGroupsDatabase();
  const group = db.find(g => g.id === id || g.slug === id);
  if (!group) return null;

  ensureGroup24hActivity(group);

  if (action === 'remove') {
    group.upvotes = Math.max(0, (group.upvotes || 0) - 1);
    if (group.activity24h) {
      group.activity24h.upvotes = Math.max(0, group.activity24h.upvotes - 1);
    }
    group.growthRate = Math.max(0, Math.round(((group.growthRate || 5.0) - 0.2) * 10) / 10);
  } else {
    group.upvotes = (group.upvotes || 0) + 1;
    if (group.activity24h) {
      group.activity24h.upvotes += 1;
    }
    group.growthRate = Math.min(100, Math.round(((group.growthRate || 5.0) + 0.2) * 10) / 10);
  }

  const newDailyScore = calculate24HourDailyScore(group);
  if (group.activity24h) {
    group.activity24h.score = newDailyScore;
  }
  group.dailyRankScore = newDailyScore;

  persistCurrentGroups();
  return group;
}

export async function bookmarkGroup(id: string, action: 'add' | 'remove' = 'add'): Promise<Group | null> {
  const db = getGroupsDatabase();
  const group = db.find(g => g.id === id || g.slug === id);
  if (!group) return null;

  if (action === 'remove') {
    group.bookmarks = Math.max(0, (group.bookmarks || 0) - 1);
  } else {
    group.bookmarks = (group.bookmarks || 0) + 1;
  }
  persistCurrentGroups();
  return group;
}

export async function trackGroupClick(id: string): Promise<Group | null> {
  const db = getGroupsDatabase();
  const group = db.find(g => g.id === id || g.slug === id);
  if (!group) return null;

  ensureGroup24hActivity(group);

  group.clicks = (group.clicks || 0) + 1;
  group.memberCount = (group.memberCount || 100) + 1;
  if (group.activity24h) {
    group.activity24h.joins += 1;
  }
  const newDailyScore = calculate24HourDailyScore(group);
  if (group.activity24h) {
    group.activity24h.score = newDailyScore;
  }
  group.dailyRankScore = newDailyScore;
  group.growthRate = Math.min(100, Math.round(((group.growthRate || 5.0) + 0.1) * 10) / 10);
  group.lastActive = 'Just now';
  persistCurrentGroups();
  return group;
}

export async function trackGroupShare(id: string): Promise<Group | null> {
  const db = getGroupsDatabase();
  const group = db.find(g => g.id === id || g.slug === id);
  if (!group) return null;

  ensureGroup24hActivity(group);

  group.shares = (typeof group.shares === 'number' ? group.shares : 0) + 1;
  if (group.activity24h) {
    group.activity24h.shares += 1;
  }
  const newDailyScore = calculate24HourDailyScore(group);
  if (group.activity24h) {
    group.activity24h.score = newDailyScore;
  }
  group.dailyRankScore = newDailyScore;
  group.growthRate = Math.min(100, Math.round(((group.growthRate || 5.0) + 0.3) * 10) / 10);
  group.lastActive = 'Just now';
  persistCurrentGroups();
  return group;
}

export async function get24HourTrendingGroups(platform?: string, limit: number = 50): Promise<{
  groups: (Group & { rank24h: number; score24h: number })[];
  champion: Group | null;
  cycleExpiration: { expiresAt: Date; expiresIso: string; formatted: string; hoursLeft: number; minutesLeft: number };
  totalContenders: number;
}> {
  const db = getGroupsDatabase();
  const cycle = get24HourCycleExpiration();

  let filtered = db.filter(g => !isAdultGroup(g) && g.isActive !== false && (g as any).is_active !== false && !g.isExpired);
  if (platform && platform !== 'all') {
    filtered = filtered.filter(g => g.platform.toLowerCase() === platform.toLowerCase());
  }

  // Calculate real 24h score for each group
  const scored = filtered.map(g => {
    ensureGroup24hActivity(g);
    const realScore = calculate24HourDailyScore(g);
    const hourlyRandom = getHourlyDeterministicRandom(g.id || g.slug || '', '24h_leaderboard');
    return {
      group: g,
      realScore,
      hourlyRandom,
    };
  });

  // Sort groups:
  // 1. Real user activity (> 0) strictly takes precedence, sorted by score descending.
  // 2. If scores are 0 (no user activity), rotate fairly with hourly deterministic random.
  scored.sort((a, b) => {
    if (a.realScore > 0 || b.realScore > 0) {
      if (a.realScore !== b.realScore) {
        return b.realScore - a.realScore;
      }
      // Tie-breaker for non-zero scores: real upvotes, then joins, then shares, then hourly random
      const upvotesA = a.group.activity24h?.upvotes || 0;
      const upvotesB = b.group.activity24h?.upvotes || 0;
      if (upvotesA !== upvotesB) return upvotesB - upvotesA;
      return b.hourlyRandom - a.hourlyRandom;
    }
    // If both have 0 real score, order by hourly deterministic random rotation
    return b.hourlyRandom - a.hourlyRandom;
  });

  const ranked = scored.slice(0, limit).map((item, idx) => {
    const isTop = idx === 0;
    return {
      ...item.group,
      dailyRankScore: item.realScore,
      score24h: item.realScore,
      rank24h: idx + 1,
      isDailyTopRanked: isTop,
      dailyRankExpiresAt: cycle.expiresIso,
    };
  });

  return {
    groups: ranked,
    champion: ranked.length > 0 ? ranked[0] : null,
    cycleExpiration: cycle,
    totalContenders: scored.length,
  };
}

export async function addCustomTagToGroup(id: string, tag: string): Promise<Group | null> {
  const db = getGroupsDatabase();
  const group = db.find(g => g.id === id || g.slug === id);
  if (!group) return null;

  const cleanTag = tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`;
  if (!group.customTags.includes(cleanTag)) {
    group.customTags.push(cleanTag);
    persistCurrentGroups();
  }
  return group;
}

export async function updateStickyPromotion(id: string, durationHours: number = 24): Promise<Group | null> {
  const db = getGroupsDatabase();
  const group = db.find(g => g.id === id || g.slug === id);
  if (!group) return null;

  const now = Date.now();
  const currentExpiry = group.stickyUntil ? new Date(group.stickyUntil).getTime() : now;
  const baseTime = currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(baseTime + durationHours * 60 * 60 * 1000).toISOString();

  group.isSticky = true;
  group.stickyUntil = newExpiry;
  group.stickyOrder = 1;
  group.featured = true;
  persistCurrentGroups();
  return group;
}

export function getStats() {
  const now = Date.now();
  if (statsCache && now - statsCache.timestamp < 30000) {
    return statsCache.data;
  }

  const db = getGroupsDatabase();
  const totalGroups = db.length;
  let totalJoins = 0;
  let totalMembers = 0;
  let totalUpvotes = 0;
  const platformCounts: Record<string, number> = {};

  for (let i = 0; i < totalGroups; i++) {
    const g = db[i];
    if (!g) continue;
    totalJoins += (g.clicks || 0);
    totalMembers += (g.memberCount || 0);
    totalUpvotes += (g.upvotes || 0);
    if (g.platform) {
      platformCounts[g.platform] = (platformCounts[g.platform] || 0) + 1;
    }
  }

  const result = {
    totalGroups,
    totalJoins,
    totalMembers,
    totalUpvotes,
    platformCounts,
    supportedPlatformsCount: 7,
    categoriesCount: CATEGORIES.length,
  };

  statsCache = {
    data: result,
    timestamp: now
  };

  return result;
}

export function getLeaderboard(category?: string) {
  const db = getGroupsDatabase();
  const isAdultMode = category === 'Adult / 18+';
  const sourceGroups = db.filter(g => (isAdultMode ? isAdultGroup(g) : !isAdultGroup(g)));

  const sorted = [...sourceGroups].sort((a, b) => {
    const scoreA = calculatePopularityScore(a.clicks, a.upvotes, a.memberCount, a.growthRate, a.rankScore || 80);
    const scoreB = calculatePopularityScore(b.clicks, b.upvotes, b.memberCount, b.growthRate, b.rankScore || 80);
    return scoreB - scoreA;
  });

  return sorted.slice(0, 15).map((g, idx) => ({
    ...g,
    rank: idx + 1,
    popularityScore: calculatePopularityScore(g.clicks, g.upvotes, g.memberCount, g.growthRate, g.rankScore || 80),
  }));
}

// Admin OTP helpers
export function setAdminLoginOtp(otp: { code: string; expiresAt: number; email: string }) {
  globalForGroups.nexusAdminLoginOtp = otp;
}

export function getAdminLoginOtp() {
  return globalForGroups.nexusAdminLoginOtp || null;
}

export function clearAdminLoginOtp() {
  globalForGroups.nexusAdminLoginOtp = null;
}

export function setAdminResetOtp(otp: { code: string; expiresAt: number; email: string }) {
  globalForGroups.nexusAdminResetOtp = otp;
}

export function getAdminResetOtp() {
  return globalForGroups.nexusAdminResetOtp || null;
}

export function clearAdminResetOtp() {
  globalForGroups.nexusAdminResetOtp = null;
}

// Restricted Keywords Server Store
export function getRestrictedKeywordsServer(): string[] {
  if (!globalForGroups.nexusRestrictedKeywords || globalForGroups.nexusRestrictedKeywords.length === 0) {
    globalForGroups.nexusRestrictedKeywords = [...DEFAULT_RESTRICTED_KEYWORDS];
  }
  return globalForGroups.nexusRestrictedKeywords;
}

export function addRestrictedKeywordServer(keyword: string): string[] {
  const clean = keyword.trim().toLowerCase();
  if (!clean) return getRestrictedKeywordsServer();
  const current = getRestrictedKeywordsServer();
  if (!current.includes(clean)) {
    globalForGroups.nexusRestrictedKeywords = [...current, clean];
    saveKeywordsToDisk(globalForGroups.nexusRestrictedKeywords);
  }
  return globalForGroups.nexusRestrictedKeywords;
}

export function removeRestrictedKeywordServer(keyword: string): string[] {
  const clean = keyword.trim().toLowerCase();
  const current = getRestrictedKeywordsServer();
  globalForGroups.nexusRestrictedKeywords = current.filter(k => k !== clean);
  saveKeywordsToDisk(globalForGroups.nexusRestrictedKeywords);
  return globalForGroups.nexusRestrictedKeywords;
}

export function setRestrictedKeywordsServer(keywords: string[]): string[] {
  const sanitized = Array.from(
    new Set(
      keywords
        .map(k => String(k || '').trim().toLowerCase())
        .filter(k => k.length > 0)
    )
  );
  globalForGroups.nexusRestrictedKeywords = sanitized.length > 0 ? sanitized : [...DEFAULT_RESTRICTED_KEYWORDS];
  saveKeywordsToDisk(globalForGroups.nexusRestrictedKeywords);
  return globalForGroups.nexusRestrictedKeywords;
}

export function resetRestrictedKeywordsServer(): string[] {
  globalForGroups.nexusRestrictedKeywords = [...DEFAULT_RESTRICTED_KEYWORDS];
  saveKeywordsToDisk(globalForGroups.nexusRestrictedKeywords);
  return globalForGroups.nexusRestrictedKeywords;
}

// User Rating Engine
export async function rateGroup(id: string, ratingValue: number): Promise<{ rating: number; ratingCount: number; group: Group } | null> {
  const db = getGroupsDatabase();
  const group = db.find(g => g.id === id || g.slug === id);
  if (!group) return null;

  const validRating = Math.max(1, Math.min(5, Number(ratingValue) || 5));
  const currentAvg = typeof group.rating === 'number' ? group.rating : 4.8;
  const currentCount = typeof group.ratingCount === 'number' ? group.ratingCount : 15;

  const newCount = currentCount + 1;
  const newAvg = Math.round(((currentAvg * currentCount + validRating) / newCount) * 10) / 10;

  group.rating = newAvg;
  group.ratingCount = newCount;
  persistCurrentGroups();

  return {
    rating: newAvg,
    ratingCount: newCount,
    group
  };
}

// Comments Engine (3 fields: comment, name, email with maskedEmail)
export async function addGroupComment(
  groupId: string,
  data: { name: string; email: string; comment: string }
): Promise<GroupComment> {
  const db = getGroupsDatabase();
  const group = db.find(g => g.id === groupId || g.slug === groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  const commentText = (data.comment || '').trim();
  const name = (data.name || '').trim();
  const email = (data.email || '').trim();

  if (!commentText) throw new Error('Comment text is required');
  if (!name) throw new Error('Name is required');
  if (!email || !email.includes('@')) throw new Error('Valid email address is required');

  // Zero-tolerance restricted keyword check on comment and name
  const combined = `${name} ${commentText} ${email}`;
  const check = checkIsRestrictedText(combined, getRestrictedKeywordsServer());
  if (check.isRestricted) {
    throw new Error(`Your comment contains strictly prohibited/restricted terms ("${check.matchedKeyword}"). Posting is blocked.`);
  }

  const masked = maskEmail(email);
  const newComment: GroupComment = {
    id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    groupId: group.id,
    name,
    email,
    maskedEmail: masked,
    comment: commentText,
    createdAt: new Date().toISOString()
  };

  if (!Array.isArray(group.comments)) {
    group.comments = [];
  }

  group.comments.unshift(newComment);
  persistCurrentGroups();
  return newComment;
}

export function getGroupComments(groupId: string): GroupComment[] {
  const db = getGroupsDatabase();
  const group = db.find(g => g.id === groupId || g.slug === groupId);
  if (!group || !Array.isArray(group.comments)) return [];
  return group.comments;
}

export function getAllCommentsServer(): { group: { id: string; title: string; slug: string; platform: Platform }; comment: GroupComment }[] {
  const db = getGroupsDatabase();
  const list: { group: { id: string; title: string; slug: string; platform: Platform }; comment: GroupComment }[] = [];
  
  db.forEach(g => {
    if (Array.isArray(g.comments)) {
      g.comments.forEach(c => {
        list.push({
          group: {
            id: g.id,
            title: g.title,
            slug: g.slug,
            platform: g.platform
          },
          comment: c
        });
      });
    }
  });

  return list.sort((a, b) => new Date(b.comment.createdAt).getTime() - new Date(a.comment.createdAt).getTime());
}

export async function deleteGroupComment(groupId?: string, commentId?: string): Promise<boolean> {
  const db = getGroupsDatabase();
  const targetCommentId = String(commentId || '').trim();
  if (!targetCommentId) return false;

  const targetGroupId = String(groupId || '').trim();

  // If a groupId/slug was provided, prioritize searching that group first
  if (targetGroupId) {
    const directGroup = db.find(g => 
      g && (
        g.id === targetGroupId || 
        g.id.toLowerCase() === targetGroupId.toLowerCase() ||
        (g.slug && g.slug.toLowerCase() === targetGroupId.toLowerCase())
      )
    );
    if (directGroup && Array.isArray(directGroup.comments)) {
      const idx = directGroup.comments.findIndex(c => 
        c && (String(c.id).trim() === targetCommentId || String(c.id).trim().toLowerCase() === targetCommentId.toLowerCase())
      );
      if (idx !== -1) {
        directGroup.comments.splice(idx, 1);
        persistCurrentGroups();
        return true;
      }
    }
  }

  // Otherwise or fallback, search all groups for the commentId
  for (const group of db) {
    if (group && Array.isArray(group.comments)) {
      const idx = group.comments.findIndex(c => 
        c && (String(c.id).trim() === targetCommentId || String(c.id).trim().toLowerCase() === targetCommentId.toLowerCase())
      );
      if (idx !== -1) {
        group.comments.splice(idx, 1);
        persistCurrentGroups();
        return true;
      }
    }
  }

  return false;
}

export function applyBoostPlanToGroup(groupId: string, planId: string): { success: boolean; group?: Group; error?: string } {
  const db = getGroupsDatabase();
  const group = db.find(g => g.id === groupId || g.slug === groupId);
  if (!group) {
    return { success: false, error: 'Group not found.' };
  }

  const plan = getBoostPlanById(planId);
  if (!plan) {
    return { success: false, error: 'Invalid boost plan.' };
  }

  const currentExpiry =
    group.isSticky && group.stickyUntil && new Date(group.stickyUntil).getTime() > Date.now()
      ? new Date(group.stickyUntil).getTime()
      : Date.now();

  const newExpiry = new Date(currentExpiry + plan.durationMs).toISOString();

  group.isSticky = true;
  group.stickyUntil = newExpiry;
  group.stickyOrder = 1;
  group.featured = true;
  group.isPromoted = true;
  persistCurrentGroups();

  return { success: true, group };
}

export function recordGroupReport(
  id: string,
  reason: string,
  customMessage?: string
): { success: boolean; group?: Group } {
  const db = getGroupsDatabase();
  const group = db.find(g => g.id === id || g.slug === id);
  if (!group) return { success: false };

  if (!globalForGroups.nexusGroupReports) {
    globalForGroups.nexusGroupReports = [];
  }

  const report = {
    id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    groupId: group.id,
    groupTitle: group.title,
    reason,
    customMessage: customMessage || '',
    createdAt: new Date().toISOString(),
  };

  globalForGroups.nexusGroupReports.unshift(report);
  saveReportsToDisk(globalForGroups.nexusGroupReports);
  console.log(`[REPORT GROUP] Logged report for "${group.title}" (${group.id}): reason="${reason}", message="${customMessage || ''}"`);

  return { success: true, group };
}

export function getGroupReportsServer() {
  return globalForGroups.nexusGroupReports || [];
}

/**
 * Returns all unique indexable tags across all active groups with group count and latest modification date.
 */
export function getAllIndexableTags(): { tag: string; slug: string; count: number; lastModified: string }[] {
  const db = getGroupsDatabase();
  const activeGroups = db.filter(g => g.isActive !== false && g.is_active !== false);
  const tagMap = new Map<string, { tag: string; slug: string; count: number; lastModified: string }>();
  const nowIso = new Date().toISOString();

  for (const group of activeGroups) {
    const groupLastMod = group.updatedAt || group.publishedAt || group.createdAt || nowIso;
    const tags = Array.isArray(group.customTags) ? group.customTags : [];

    for (const rawTag of tags) {
      if (!rawTag || typeof rawTag !== 'string') continue;
      const cleanTag = rawTag.trim().replace(/^#+/, '');
      if (!cleanTag || cleanTag.length < 2) continue;
      const slug = cleanTag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!slug) continue;

      const existing = tagMap.get(slug);
      if (existing) {
        existing.count += 1;
        if (new Date(groupLastMod).getTime() > new Date(existing.lastModified).getTime()) {
          existing.lastModified = groupLastMod;
        }
      } else {
        tagMap.set(slug, {
          tag: cleanTag.startsWith('#') ? cleanTag : `#${cleanTag}`,
          slug,
          count: 1,
          lastModified: groupLastMod,
        });
      }
    }
  }

  return Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * Returns all indexable categories with group count and latest modification date.
 */
export function getAllIndexableCategories(): { category: string; slug: string; count: number; lastModified: string }[] {
  const db = getGroupsDatabase();
  const activeGroups = db.filter(g => g.isActive !== false && g.is_active !== false);
  const nowIso = new Date().toISOString();

  return CATEGORIES.map(category => {
    const slug = category
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const matching = activeGroups.filter(
      g => g.category && g.category.toLowerCase() === category.toLowerCase()
    );

    let latestMod = nowIso;
    if (matching.length > 0) {
      const sorted = [...matching].sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.publishedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.publishedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      latestMod = sorted[0].updatedAt || sorted[0].publishedAt || sorted[0].createdAt || nowIso;
    }

    return {
      category,
      slug,
      count: matching.length,
      lastModified: latestMod,
    };
  });
}

/**
 * Returns all indexable countries/regions with group count and latest modification date.
 */
export function getAllIndexableCountries(): { country: string; slug: string; count: number; lastModified: string }[] {
  const db = getGroupsDatabase();
  const activeGroups = db.filter(g => g.isActive !== false && g.is_active !== false);
  const nowIso = new Date().toISOString();

  // Combine standard regions and any custom regions in DB
  const allRegionsSet = new Set<string>(REGIONS);
  for (const g of activeGroups) {
    if (g.region && typeof g.region === 'string' && g.region.trim()) {
      allRegionsSet.add(g.region.trim());
    }
  }

  return Array.from(allRegionsSet).map(country => {
    const slug = country
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const matching = activeGroups.filter(
      g => g.region && g.region.toLowerCase() === country.toLowerCase()
    );

    let latestMod = nowIso;
    if (matching.length > 0) {
      const sorted = [...matching].sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.publishedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.publishedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      latestMod = sorted[0].updatedAt || sorted[0].publishedAt || sorted[0].createdAt || nowIso;
    }

    return {
      country,
      slug,
      count: matching.length,
      lastModified: latestMod,
    };
  });
}

/**
 * Returns all indexable languages with group count and latest modification date.
 */
export function getAllIndexableLanguages(): { language: string; slug: string; count: number; lastModified: string }[] {
  const db = getGroupsDatabase();
  const activeGroups = db.filter(g => g.isActive !== false && g.is_active !== false);
  const nowIso = new Date().toISOString();

  const allLanguagesSet = new Set<string>(LANGUAGES);
  for (const g of activeGroups) {
    if (g.language && typeof g.language === 'string' && g.language.trim()) {
      allLanguagesSet.add(g.language.trim());
    }
  }

  return Array.from(allLanguagesSet).map(language => {
    const slug = language
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const matching = activeGroups.filter(
      g => g.language && g.language.toLowerCase() === language.toLowerCase()
    );

    let latestMod = nowIso;
    if (matching.length > 0) {
      const sorted = [...matching].sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.publishedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.publishedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      latestMod = sorted[0].updatedAt || sorted[0].publishedAt || sorted[0].createdAt || nowIso;
    }

    return {
      language,
      slug,
      count: matching.length,
      lastModified: latestMod,
    };
  });
}

