export type Platform = 'whatsapp' | 'telegram' | 'discord' | 'facebook' | 'signal' | 'snapchat' | 'reddit' | 'instagram' | 'other';

export type Category = string;

export type Language = string;

export type Region = string;

export interface GroupReview {
  id: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface GroupComment {
  id: string;
  groupId: string;
  name: string;
  email: string;
  maskedEmail: string; // e.g. "kirxxxx28@gmail.com"
  comment: string;
  createdAt: string;
}

export type RankGrade = 'A+' | 'A' | 'B' | 'C';

export interface Group {
  id: string;
  numericId?: number; // Positive deterministic numeric ID for /join and /rules routing
  title: string;
  description: string;
  url: string;
  platform: Platform;
  category: Category;
  language: Language;
  region: Region;
  customTags: string[];
  imageUrl: string;
  bannerUrl?: string;
  memberCount: number;
  growthRate: number; // Percentage growth, e.g., 14.5%
  clicks: number; // Clicks on invite link
  upvotes: number;
  shares?: number; // Total shares across platforms & link copies
  bookmarks: number;
  rating?: number; // Average rating 1.0 to 5.0
  ratingCount?: number; // Total number of ratings given
  comments?: GroupComment[]; // User comments
  verified: boolean;
  featured: boolean;
  isNsfw: boolean;
  isSticky?: boolean; // Pinned / Sticky on top
  stickyUntil?: string; // Expiration timestamp ISO string
  stickyOrder?: number; // Sorting order among sticky groups
  isDailyTopRanked?: boolean; // Pinned in 3rd place as the 24-Hour Top Ranked Champion
  dailyRankScore?: number; // 24-hour calculated score from shares, joins, upvotes & activity
  dailyRankExpiresAt?: string; // Expiration timestamp for the current 24-hour cycle
  activity24h?: {
    joins: number;
    upvotes: number;
    shares: number;
    score: number;
    cycleDate?: string;
  };
  isPromoted?: boolean; // Mark as promoted campaign
  isDirectPromoted?: boolean; // Direct pay campaign (promoted on /direct-promoted-groups, not on home page)
  showInDirectPromoted?: boolean; // Admin selected filter to show group on /direct-promoted-groups
  safetyScore: number; // 0 to 100
  rankScore: number; // 0 to 100 Rank optimization score
  rankGrade: RankGrade;
  rankKeywords: string[];
  slug: string;
  metaDescription?: string;
  createdAt: string;
  publishedAt?: string;
  authorName?: string;
  updatedAt?: string;
  lastActive: string;
  reviews?: GroupReview[];
  rulesSummary?: string;
  claimedByUserId?: string; // ID of verified owner
  ownerId?: string; // Author/owner user ID (matches auth.users)
  authorEmail?: string; // Creator/author contact email
  isClaimed?: boolean;
  claimedAt?: string;
  isActive?: boolean; // Whether the invite link is verified active
  is_active?: boolean; // Snake case alias for compatibility
  isExpired?: boolean; // True if the invite link is revoked or expired
  dmcaStatus?: 'none' | 'pending_review' | 'approved' | 'rejected';
  originalImageUrl?: string;
  dmcaReason?: string;
  dmcaClaimantEmail?: string;
  dmcaClaimantName?: string;
  dmcaClaimantAt?: string;
  expiredReason?: string; // Reason why link was flagged as expired
  status?: 'pending' | 'approved' | 'rejected' | 'archived';
  healthStatus?: 'active' | 'revoked' | 'expired' | 'dead' | 'unverified';
  lastHealthCheckedAt?: string;
  originalUrl?: string;
  normalizedUrl?: string;
  platformHandle?: string;
  onlineCount?: number;
  tags?: string[];
  metadataSource?: 'telegram' | 'discord-api' | 'reddit-api' | 'opengraph' | 'fallback';
  fallbackMetadata?: boolean;
  lastMetadataFetchAt?: string;
  metadataFetchError?: string | null;
  allowUserUpdates?: boolean; // Whether users/visitors can update this group (admin toggle)
  isUpdateLocked?: boolean; // Master admin lock flag to disable user/visitor updates
  lastUserUpdatedAt?: string; // ISO timestamp of the last time a user/visitor updated this group (for 1-week cooldown)
}



export type AdSlot = 'header_top' | 'feed_native' | 'sidebar' | 'detail_banner' | 'rules_banner' | 'footer_banner' | 'footer' | 'join_button_ad' | 'above_join_button';
export type AdTargeting = 'all' | 'everywhere' | 'adult_only' | 'safe_only';
export type AdFormat = 'custom_code' | 'banner_image';

export interface AdPlacement {
  id: string;
  title: string;
  slot: AdSlot;
  target: AdTargeting; // 'all' | 'everywhere' | 'adult_only' | 'safe_only'
  format: AdFormat;
  code?: string; // HTML snippet or AdSense script
  imageUrl?: string;
  targetUrl?: string;
  bannerText?: string;
  ctaText?: string;
  sponsorName?: string;
  isActive: boolean;
  clicks?: number;
  impressions?: number;
  createdAt: string;
}

export type SortOption = 'trending' | 'rank_index' | 'popularity' | 'members' | 'growth' | 'newest' | 'upvotes';

export interface FilterState {
  searchQuery: string;
  platform: Platform | 'all';
  category: string | 'all';
  language: string | 'all';
  region: string | 'all';
  selectedTag: string | null;
  sort: SortOption;
  verifiedOnly: boolean;
  rankOptimizedOnly: boolean;
  memberRange: 'all' | 'small' | 'medium' | 'large' | 'mega'; // <500, 500-5k, 5k-50k, >50k
  showAdultOnly?: boolean;
  hideAdultFilter?: boolean;
  search?: string;
  tag?: string;
  sortBy?: SortOption;
}

export interface ScrapeMetadataResponse {
  success: boolean;
  url: string;
  platform: Platform;
  title: string;
  description: string;
  imageUrl: string;
  cachedImageUrl?: string;
  localImageUrl?: string;
  bannerUrl?: string;
  memberCount?: number;
  suggestedCategory?: Category;
  suggestedTags?: string[];
  suggestedLanguage?: Language;
  safetyRating?: string;
  rankScore?: number;
  rankGrade?: RankGrade;
  rankKeywords?: string[];
  rulesSummary?: string;
  rawMeta?: Record<string, string>;
  isVerified?: boolean;
  isExpired?: boolean;
  isNsfw?: boolean;
  expiredReason?: string;
  telegramData?: {
    handle: string;
    isVerified: boolean;
    memberCount: number;
    type: string;
    source: string;
  };
  originalUrl?: string;
  normalizedUrl?: string;
  platformHandle?: string;
  onlineCount?: number;
  metadataSource?: 'telegram' | 'discord-api' | 'reddit-api' | 'opengraph' | 'fallback';
  fallbackMetadata?: boolean;
  lastMetadataFetchAt?: string;
  metadataFetchError?: string | null;
  error?: string;
}

export interface NetworkStats {
  totalGroups: number;
  totalJoins: number;
  totalMembers: number;
  totalUpvotes?: number;
  platformCounts?: Record<string, number>;
  supportedPlatformsCount?: number;
  categoriesCount?: number;
  totalClicks?: number;
  totalPlatforms?: number;
  activeToday?: number;
}

export interface PlatformConfig {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconName: string;
  badgeClass: string;
  urlPatterns: RegExp[];
  domain: string;
  exampleUrl: string;
}

export interface ManualPromotionRequest {
  id: string;
  groupId: string;
  groupTitle: string;
  groupUrl: string;
  personName: string;
  customerPhone?: string;
  customerEmail?: string;
  planId: string;
  planName: string;
  promotedTimePeriod: string; // e.g., '5 min', '1 hour', '7 days', '1 month'
  durationMinutes: number;
  durationMs: number;
  amount: number; // in INR, e.g. 270
  upiId: string; // '872808728@ybl'
  whatsappNumber: string; // '+918328208263'
  utrNumber?: string;
  submittedAt: string; // ISO string
  status: 'pending' | 'approved' | 'active' | 'rejected';
  approvedAt?: string;
  stickyUntil?: string;
  notes?: string;
}



