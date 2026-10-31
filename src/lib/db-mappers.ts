import { Group, Platform, GroupComment } from '@/src/types';
import { UserProfile, CreditTransaction } from '@/src/types/user';
import { resolveValidGroupImage } from '@/src/utils/categoryImages';
import { getNumericGroupId } from '@/src/utils/helpers';

/**
 * PostgreSQL Row definition for the 'groups' table
 */
export interface PostgresGroupRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  platform: string;
  language: string;
  region: string;
  tags: string[] | null;
  url: string;
  icon_url: string | null;
  rules_summary: string | null;
  author_name: string | null;
  member_count: number | null;
  views: number | null;
  clicks: number | null;
  shares: number | null;
  upvotes: number | null;
  rating: number | string | null;
  rating_count: number | null;
  bookmarks: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  is_verified: boolean | null;
  is_sticky: boolean | null;
  sticky_until: string | null;
  sticky_order: number | null;
  is_promoted: boolean | null;
  is_featured: boolean | null;
  owner_id: string | null;
  submitted_by_ip_hash: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/**
 * Maps a PostgreSQL group row to the application's camelCase Group domain object.
 * Robustly handles both camelCase (from quoted DDL) and snake_case columns.
 */
export function mapPostgresRowToGroup(row: any, comments: GroupComment[] = []): Group {
  const numRating = row.rating !== null && row.rating !== undefined ? Number(row.rating) : 0;
  const plat = (row.platform || 'whatsapp').toLowerCase() as Platform;
  const rawTags = row.customTags ?? row.tags;
  const parsedTags = Array.isArray(rawTags) 
    ? rawTags 
    : (typeof rawTags === 'string' ? JSON.parse(rawTags || '[]') : []);

  const rawComments = row.comments ?? comments;
  const parsedComments = Array.isArray(rawComments)
    ? rawComments
    : (typeof rawComments === 'string' ? JSON.parse(rawComments || '[]') : []);

  const isActiveBool = row.isActive !== undefined ? Boolean(row.isActive) : (row.is_active !== undefined ? Boolean(row.is_active) : (row.status ? row.status === 'approved' : true));

  const img = resolveValidGroupImage(row.imageUrl || row.icon_url || row.image_url || row.bannerUrl || row.banner_url, row.category, row.title, false);

  return {
    id: String(row.id),
    numericId: typeof row.numeric_id === 'number' ? row.numeric_id : getNumericGroupId({ id: row.id, slug: row.slug }),
    title: row.title || 'Untitled Group',
    description: row.description || '',
    url: row.url || '#',
    platform: plat,
    category: row.category || 'General',
    language: row.language || 'English',
    region: row.region || 'Global',
    customTags: parsedTags,
    imageUrl: img,
    bannerUrl: img,
    memberCount: Number(row.memberCount ?? row.member_count) || 0,
    growthRate: Number(row.growthRate ?? row.growth_rate) || 12.5,
    clicks: Number(row.clicks) || 0,
    upvotes: Number(row.upvotes) || 0,
    shares: Number(row.shares) || 0,
    bookmarks: Number(row.bookmarks) || 0,
    rating: numRating,
    ratingCount: Number(row.rating_count ?? row.ratingCount) || 0,
    comments: parsedComments,
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
    rankKeywords: parsedTags,
    slug: row.slug || String(row.id),
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
    publishedAt: row.publishedAt || row.published_at || row.createdAt || row.created_at || new Date().toISOString(),
    authorName: row.authorName || row.author_name || 'Community Member',
    updatedAt: row.updatedAt || row.updated_at || row.createdAt || row.created_at,
    lastActive: row.updatedAt || row.updated_at || row.createdAt || row.created_at,
    rulesSummary: row.rulesSummary || row.rules_summary || undefined,
    claimedByUserId: row.claimedByUserId || row.owner_id || undefined,
    isClaimed: Boolean(row.claimedByUserId || row.owner_id),
    status: row.status || (isActiveBool ? 'approved' : 'pending'),
    isActive: isActiveBool,
    is_active: isActiveBool,
  };
}

export const mapMysqlRowToGroup = mapPostgresRowToGroup;
export const mapRowToGroup = mapPostgresRowToGroup;

/**
 * Maps an application Group object to a PostgreSQL/MySQL row payload for insertion or update.
 */
export function mapGroupToPostgresPayload(group: Partial<Group>): Record<string, any> {
  const payload: Record<string, any> = {};

  if (group.id !== undefined) payload.id = group.id;
  if (group.slug !== undefined) payload.slug = group.slug;
  if (group.title !== undefined) payload.title = group.title;
  if (group.description !== undefined) payload.description = group.description;
  if (group.category !== undefined) payload.category = group.category;
  if (group.platform !== undefined) payload.platform = group.platform;
  if (group.language !== undefined) payload.language = group.language;
  if (group.region !== undefined) payload.region = group.region;
  if (group.customTags !== undefined) payload.tags = group.customTags;
  if (group.url !== undefined) payload.url = group.url;
  if (group.imageUrl !== undefined) payload.icon_url = group.imageUrl;
  if (group.rulesSummary !== undefined) payload.rules_summary = group.rulesSummary;
  if (group.authorName !== undefined) payload.author_name = group.authorName;
  if (group.memberCount !== undefined) payload.member_count = group.memberCount;
  if (group.clicks !== undefined) payload.clicks = group.clicks;
  if (group.shares !== undefined) payload.shares = group.shares;
  if (group.upvotes !== undefined) payload.upvotes = group.upvotes;
  if (group.rating !== undefined) payload.rating = group.rating;
  if (group.ratingCount !== undefined) payload.rating_count = group.ratingCount;
  if (group.bookmarks !== undefined) payload.bookmarks = group.bookmarks;
  if (group.status !== undefined) {
    payload.status = group.status;
  } else if (group.isActive !== undefined) {
    payload.status = group.isActive ? 'approved' : 'pending';
  } else {
    // Default to approved so valid group additions immediately appear in directory
    payload.status = 'approved';
  }
  if (group.verified !== undefined) payload.is_verified = group.verified;
  if (group.featured !== undefined) payload.is_featured = group.featured;
  if (group.isSticky !== undefined) payload.is_sticky = group.isSticky;
  if (group.stickyUntil !== undefined) payload.sticky_until = group.stickyUntil;
  if (group.stickyOrder !== undefined) payload.sticky_order = group.stickyOrder;
  if (group.isPromoted !== undefined) payload.is_promoted = group.isPromoted;
  if (group.claimedByUserId !== undefined) payload.owner_id = group.claimedByUserId;
  if (group.publishedAt !== undefined) payload.published_at = group.publishedAt;
  if (group.createdAt !== undefined) payload.created_at = group.createdAt;
  if (group.updatedAt !== undefined) payload.updated_at = group.updatedAt;

  return payload;
}

/**
 * PostgreSQL Profile Row
 */
export interface PostgresProfileRow {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  role: 'user' | 'moderator' | 'admin';
  telegram_username: string | null;
  telegram_id: string | null;
  referral_code: string | null;
  referred_by: string | null;
  credits: number | string;
  reputation_score: number;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export function mapPostgresRowToUserProfile(row: PostgresProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email || undefined,
    displayName: row.display_name || 'Community Member',
    avatarUrl: row.avatar_url || undefined,
    referralCode: row.referral_code || '',
    referredBy: row.referred_by || undefined,
    credits: Number(row.credits) || 0,
    creditsBalance: Number(row.credits) || 0,
    totalCreditsEarned: 0,
    totalCreditsSpent: 0,
    reputationScore: row.reputation_score || 0,
    isBanned: Boolean(row.is_banned),
    role: row.role || 'user',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    linkedAccounts: [],
    claimedCommunityIds: [],
    savedGroupIds: [],
  };
}
