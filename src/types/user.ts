export type AuthProviderType = 'google' | 'firebase' | 'email' | 'magic_link';

export interface LinkedAccount {
  provider: AuthProviderType;
  providerId: string; // Hashed/obscured on public outputs
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  linkedAt: string;
}

export interface UserProfile {
  id: string; // 'usr_' format
  displayName: string;
  email?: string;
  maskedEmail?: string;
  avatarUrl?: string;
  role?: 'admin' | 'user' | string;
  credits?: number;
  creditsBalance: number; // Computed from ledger
  totalCreditsEarned: number;
  totalCreditsSpent: number;
  reputationScore?: number;
  referralCode: string;
  referredBy?: string;
  linkedAccounts: LinkedAccount[];
  claimedCommunityIds?: string[];
  savedGroupIds?: string[];
  createdAt: string;
  updatedAt: string;
  isBanned?: boolean;
}

export type LedgerActionType = 
  | 'COMMENT_REWARD'          // +1 credit
  | 'RATING_REWARD'           // +1 credit
  | 'SHARE_REWARD'            // +1 credit
  | 'UPVOTE_REWARD'           // +1 credit
  | 'SIGNUP_BONUS'            // +5 credits
  | 'PROMOTION_VERIFIED'      // +50 credits
  | 'REFERRAL_BONUS'          // Legacy signup bonus
  | 'REFERRAL_SIGNUP'         // Signup reward
  | 'REFERRAL_VISITOR_REWARD' // +0.01 credit per unique valid visitor
  | 'PURCHASED_CREDITS'       // +Credits/points bought via payment gateway
  | 'PROMOTION_SPEND'         // -Credits (e.g. 25, 49, 99...)
  | 'ADMIN_GRANT'             // Admin custom credit adjustment
  | 'ADMIN_ADJUSTMENT'        // +/-
  | 'CLAIM_REWARD';

export type LedgerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface CreditTransaction {
  id: string; // 'tx_' format
  userId: string;
  type: LedgerActionType;
  amount: number; // Positive for earnings, negative for spends
  status: LedgerStatus;
  communityId?: string;
  communityTitle?: string;
  metadata?: {
    platform?: string;
    provider?: string;
    proofUrl?: string;
    trackingCode?: string;
    boostPlanId?: string;
    boostPlanName?: string;
    commentId?: string;
    referralUserId?: string;
    notes?: string;
    verifiedBy?: string;
    orderId?: string;
    cfOrderId?: string;
    pointsPackageId?: string;
    pointsAwarded?: number;
    amountPaid?: number;
    currency?: string;
    paymentMethod?: string;
    [key: string]: any;
  };
  reason: string;
  idempotencyKey?: string;
  createdAt: string;
}

export type ClaimVerificationMethod = 'discord_bot' | 'bio_code' | 'public_post' | 'screenshot_proof' | 'direct_claim';

export interface CommunityClaim {
  id: string;
  communityId: string;
  communityTitle?: string;
  communityPlatform?: string;
  userId: string;
  verificationMethod: ClaimVerificationMethod;
  verificationCode: string;
  proofUrl?: string;
  proofDetails?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  claimedAt?: string;
  createdAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface PromotionVerificationRequest {
  id: string;
  userId: string;
  trackingCode: string;
  channelOrGroupUrl: string;
  platform: 'telegram' | 'discord' | 'whatsapp' | 'facebook' | 'reddit' | 'website' | 'other';
  proofUrl?: string;
  screenshotUrl?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  creditsAwarded: number;
  submittedAt: string;
  verifiedAt?: string;
  notes?: string;
}

export interface UserTrackingLink {
  id: string;
  userId: string;
  code: string; // e.g. "kiran8728", "gl-9f3a"
  url: string; // "grouplinks.app/go/code"
  clicks: number;
  verifiedConversions: number;
  createdAt: string;
}

export type ReferralStatus = 'ATTRIBUTED' | 'QUALIFIED' | 'REJECTED';

export interface ReferralAttribution {
  id: string; // 'ref_attr_' format
  visitorId: string; // Anonymous unique visitor ID (e.g. 'rv_...')
  referralCode?: string;
  referrerUserId: string;
  referredUserId?: string;
  landingPath?: string;
  status: ReferralStatus | string;
  qualifiedAt?: string;
  qualifyingPath?: string;
  rewardAmount?: number; // 0.01
  rewardAwarded?: boolean;
  ledgerTxId?: string;
  ipHash?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReferralEvent {
  id: string; // 'refev_' format
  visitorId: string;
  referralCode: string;
  referrerUserId: string;
  eventType: 'VISIT' | 'QUALIFY' | 'REPEAT_VISIT';
  path: string;
  timestamp: string;
}

export interface ReferralProgramSettings {
  rewardPerValidVisitor: number; // default: 0.01
  isEnabled: boolean;
  dailyCapPerReferrer: number; // default: 500
  monthlyCapPerReferrer: number; // default: 10000
}

export interface PlatformRewardSettings {
  signupBonus: number; // default: 5
  upvoteReward: number; // default: 1
  shareReward: number; // default: 1
  ratingReward: number; // default: 1
  commentReward: number; // default: 1
  referralReward: number; // default: 1
}

export interface ReferralStatsSummary {
  totalVisitors?: number;
  validVisitors?: number;
  conversionRate?: number;
  totalPointsEarned?: number;
  todayVisitors?: number;
  todayValidVisitors?: number;
  todayPointsEarned?: number;
  totalReferrals?: number;
  activeReferrals?: number;
  totalEarnedCredits?: number;
  pendingCredits?: number;
  referralLink?: string;
}

export type ReferralStats = ReferralStatsSummary;
