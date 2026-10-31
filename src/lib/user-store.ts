import crypto from 'crypto';
import { 
  UserProfile, 
  CreditTransaction, 
  CommunityClaim, 
  PromotionVerificationRequest, 
  UserTrackingLink,
  AuthProviderType,
  LinkedAccount,
  LedgerActionType,
  ClaimVerificationMethod,
  ReferralAttribution,
  ReferralEvent,
  ReferralProgramSettings,
  PlatformRewardSettings,
  ReferralStatsSummary
} from '@/src/types/user';
import { getGroupsDatabase, updateGroup } from './groups-store';
import { maskEmail } from '@/src/utils/moderation';
import { loadUsersFromDisk, saveUsersToDisk } from './user-persistence';

// Precision rounding helper to prevent binary floating-point inaccuracy
export function roundCredits(val: number): number {
  return Math.round((Number(val) || 0) * 100) / 100;
}

// Global in-memory storage persisted across hot reloads
const globalForUsers = globalThis as unknown as {
  nexusUsersDatabase: Map<string, UserProfile>;
  nexusLedgerDatabase: CreditTransaction[];
  nexusClaimsDatabase: CommunityClaim[];
  nexusPromoVerifications: PromotionVerificationRequest[];
  nexusTrackingLinks: Map<string, UserTrackingLink>; // code -> trackingLink
  nexusMagicOtps: Map<string, { code: string; expiresAt: number; email: string; attempts: number }>;
  nexusUserPasswordHashes: Map<string, string>;
  nexusPasswordResetOtps: Map<string, { code: string; expiresAt: number; email: string; attempts: number }>;
  nexusActiveSessions: Map<string, { userId: string; createdAt: number; expiresAt: number }>;
  nexusReferralAttributions: Map<string, ReferralAttribution>; // visitorId -> attribution
  nexusReferralEvents: ReferralEvent[];
  nexusReferralSettings: ReferralProgramSettings;
  nexusRewardSettings: PlatformRewardSettings;
  _isInitialized?: boolean;
  _saveTimer?: NodeJS.Timeout;
};

if (!globalForUsers.nexusUsersDatabase) {
  globalForUsers.nexusUsersDatabase = new Map();
}
if (!globalForUsers.nexusLedgerDatabase) {
  globalForUsers.nexusLedgerDatabase = [];
}
if (!globalForUsers.nexusClaimsDatabase) {
  globalForUsers.nexusClaimsDatabase = [];
}
if (!globalForUsers.nexusPromoVerifications) {
  globalForUsers.nexusPromoVerifications = [];
}
if (!globalForUsers.nexusTrackingLinks) {
  globalForUsers.nexusTrackingLinks = new Map();
}
if (!globalForUsers.nexusMagicOtps) {
  globalForUsers.nexusMagicOtps = new Map();
}
if (!globalForUsers.nexusUserPasswordHashes) {
  globalForUsers.nexusUserPasswordHashes = new Map();
}
if (!globalForUsers.nexusPasswordResetOtps) {
  globalForUsers.nexusPasswordResetOtps = new Map();
}
if (!globalForUsers.nexusActiveSessions) {
  globalForUsers.nexusActiveSessions = new Map();
}
if (!globalForUsers.nexusReferralAttributions) {
  globalForUsers.nexusReferralAttributions = new Map();
}
if (!globalForUsers.nexusReferralEvents) {
  globalForUsers.nexusReferralEvents = [];
}
if (!globalForUsers.nexusReferralSettings) {
  globalForUsers.nexusReferralSettings = {
    rewardPerValidVisitor: 0.01,
    isEnabled: true,
    dailyCapPerReferrer: 500,
    monthlyCapPerReferrer: 10000,
  };
}
if (!globalForUsers.nexusRewardSettings) {
  globalForUsers.nexusRewardSettings = {
    signupBonus: 5,
    upvoteReward: 1,
    shareReward: 1,
    ratingReward: 1,
    commentReward: 1,
    referralReward: 1,
  };
}

function initializeFromDisk() {
  if (globalForUsers._isInitialized) return;
  try {
    const data = loadUsersFromDisk();
    if (data) {
      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          if (u && u.id) globalForUsers.nexusUsersDatabase.set(u.id, u);
        }
      }
      if (Array.isArray(data.ledger)) {
        globalForUsers.nexusLedgerDatabase = data.ledger;
      }
      if (Array.isArray(data.claims)) {
        globalForUsers.nexusClaimsDatabase = data.claims;
      }
      if (Array.isArray(data.promoVerifications)) {
        globalForUsers.nexusPromoVerifications = data.promoVerifications;
      }
      if (Array.isArray(data.trackingLinks)) {
        for (const t of data.trackingLinks) {
          if (t && t.code) globalForUsers.nexusTrackingLinks.set(t.code, t);
        }
      }
      if (Array.isArray(data.referralAttributions)) {
        for (const a of data.referralAttributions) {
          if (a && a.visitorId) globalForUsers.nexusReferralAttributions.set(a.visitorId, a);
        }
      }
      if (Array.isArray(data.referralEvents)) {
        globalForUsers.nexusReferralEvents = data.referralEvents;
      }
      if (data.referralSettings) {
        globalForUsers.nexusReferralSettings = data.referralSettings;
      }
      if (data.rewardSettings) {
        globalForUsers.nexusRewardSettings = data.rewardSettings;
      }
    }
  } catch (err) {
    console.warn('[USER STORE] Warning during disk initialization:', err);
  }
  globalForUsers._isInitialized = true;
}

initializeFromDisk();

export function scheduleDiskSave() {
  if (globalForUsers._saveTimer) {
    clearTimeout(globalForUsers._saveTimer);
  }
  globalForUsers._saveTimer = setTimeout(() => {
    try {
      saveUsersToDisk({
        users: Array.from(globalForUsers.nexusUsersDatabase.values()),
        ledger: globalForUsers.nexusLedgerDatabase,
        claims: globalForUsers.nexusClaimsDatabase,
        promoVerifications: globalForUsers.nexusPromoVerifications,
        trackingLinks: Array.from(globalForUsers.nexusTrackingLinks.values()),
        referralAttributions: Array.from(globalForUsers.nexusReferralAttributions.values()),
        referralEvents: globalForUsers.nexusReferralEvents,
        referralSettings: globalForUsers.nexusReferralSettings,
        rewardSettings: globalForUsers.nexusRewardSettings,
      });
    } catch (err) {
      console.error('[USER STORE] Failed to save users to disk:', err);
    }
  }, 300);
}

// Cryptographically secure unique ID helpers
export function generateUserId(): string {
  const randomPart = crypto.randomBytes(6).toString('hex');
  return `usr_${Date.now().toString(36)}_${randomPart}`;
}

export function generateTransactionId(): string {
  const randomPart = crypto.randomBytes(6).toString('hex');
  return `tx_${Date.now().toString(36)}_${randomPart}`;
}

export function generateClaimId(): string {
  const randomPart = crypto.randomBytes(6).toString('hex');
  return `claim_${Date.now().toString(36)}_${randomPart}`;
}

export function generatePromoVerificationId(): string {
  const randomPart = crypto.randomBytes(6).toString('hex');
  return `pvr_${Date.now().toString(36)}_${randomPart}`;
}

export function generateVisitorId(): string {
  const randomPart = crypto.randomBytes(12).toString('hex');
  return `rv_${Date.now().toString(36)}_${randomPart}`;
}

export function generateReferralCode(displayName: string): string {
  const clean = displayName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 8) || 'gl';
  let candidate = '';
  let attempts = 0;
  
  // Ensure unique referral code across existing users
  do {
    const randomSuffix = crypto.randomBytes(2).toString('hex');
    candidate = `${clean}_${randomSuffix}`;
    attempts++;
  } while (getUserByReferralCode(candidate) && attempts < 20);

  return candidate;
}

// ----------------------------------------------------
// USER IDENTITY & PROFILE MANAGEMENT
// ----------------------------------------------------

export function getUserById(userId: string): UserProfile | null {
  if (!userId) return null;
  const user = globalForUsers.nexusUsersDatabase.get(userId);
  if (!user) return null;
  
  // Recalculate dynamic balance from ledger
  const { balance, totalEarned, totalSpent } = calculateUserLedgerStats(userId);
  return {
    ...user,
    creditsBalance: balance,
    totalCreditsEarned: totalEarned,
    totalCreditsSpent: totalSpent
  };
}

export function getUserByEmail(email: string): UserProfile | null {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  for (const user of globalForUsers.nexusUsersDatabase.values()) {
    if (user.email && user.email.toLowerCase() === cleanEmail) {
      return getUserById(user.id);
    }
    for (const la of user.linkedAccounts) {
      if (la.email && la.email.toLowerCase() === cleanEmail) {
        return getUserById(user.id);
      }
    }
  }
  return null;
}

export function getUserByProvider(provider: AuthProviderType, providerId: string): UserProfile | null {
  if (!provider || !providerId) return null;
  for (const user of globalForUsers.nexusUsersDatabase.values()) {
    for (const la of user.linkedAccounts) {
      if (la.provider === provider && la.providerId === providerId) {
        return getUserById(user.id);
      }
    }
  }
  return null;
}

export function getUserByReferralCode(referralCode: string): UserProfile | null {
  if (!referralCode) return null;
  const cleanCode = referralCode.trim().toLowerCase();
  for (const user of globalForUsers.nexusUsersDatabase.values()) {
    if (user.referralCode && user.referralCode.toLowerCase() === cleanCode) {
      return getUserById(user.id);
    }
  }
  return null;
}

export function getAllUsers(): UserProfile[] {
  return Array.from(globalForUsers.nexusUsersDatabase.values()).map(u => getUserById(u.id)!);
}

export function createOrLinkUser(params: {
  provider: AuthProviderType;
  providerId: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  username?: string;
  referredBy?: string;
}): { user: UserProfile; isNewUser: boolean } {
  const { provider, providerId, email, displayName, avatarUrl, username, referredBy } = params;

  // 1. Check if user already exists with this exact provider + providerId
  let existingUser = getUserByProvider(provider, providerId);
  
  // 2. If not found by provider, check if an account with this email already exists
  if (!existingUser && email) {
    existingUser = getUserByEmail(email);
  }

  const now = new Date().toISOString();

  if (existingUser) {
    const hasProvider = existingUser.linkedAccounts.some(
      la => la.provider === provider && la.providerId === providerId
    );

    if (!hasProvider) {
      existingUser.linkedAccounts.push({
        provider,
        providerId,
        email,
        displayName,
        avatarUrl,
        username,
        linkedAt: now
      });
    } else {
      const laIndex = existingUser.linkedAccounts.findIndex(
        la => la.provider === provider && la.providerId === providerId
      );
      if (laIndex !== -1) {
        if (avatarUrl) existingUser.linkedAccounts[laIndex].avatarUrl = avatarUrl;
        if (username) existingUser.linkedAccounts[laIndex].username = username;
        if (displayName) existingUser.linkedAccounts[laIndex].displayName = displayName;
      }
    }

    // Always update profile fields with fresh avatar and username to improve personalization
    if (avatarUrl) existingUser.avatarUrl = avatarUrl;
    if (!existingUser.email && email) {
      existingUser.email = email;
      existingUser.maskedEmail = maskEmail(email);
    }
    // Ensure existing user retains their permanent referral code
    if (!existingUser.referralCode) {
      existingUser.referralCode = generateReferralCode(existingUser.displayName || email || 'user');
    }
    existingUser.updatedAt = now;
    globalForUsers.nexusUsersDatabase.set(existingUser.id, existingUser);
    scheduleDiskSave();

    return { user: getUserById(existingUser.id)!, isNewUser: false };
  }

  // 3. Create Brand New User Profile
  const userId = generateUserId();
  const referralCode = generateReferralCode(displayName || email || 'gl');

  const newUser: UserProfile = {
    id: userId,
    displayName: displayName || (email ? email.split('@')[0] : 'Community Member'),
    email: email || undefined,
    maskedEmail: email ? maskEmail(email) : undefined,
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userId)}`,
    creditsBalance: 0,
    totalCreditsEarned: 0,
    totalCreditsSpent: 0,
    referralCode,
    referredBy: referredBy || undefined,
    linkedAccounts: [
      {
        provider,
        providerId,
        email,
        displayName,
        avatarUrl,
        username,
        linkedAt: now
      }
    ],
    createdAt: now,
    updatedAt: now
  };

  globalForUsers.nexusUsersDatabase.set(userId, newUser);

  // 4. Award Signup Bonus (+5 Credits or configured amount) to new user
  const rewardSettings = getPlatformRewardSettings();
  const signupBonusAmount = rewardSettings.signupBonus !== undefined ? Number(rewardSettings.signupBonus) : 5;
  if (signupBonusAmount > 0) {
    recordCreditTransaction({
      userId,
      type: 'SIGNUP_BONUS',
      amount: signupBonusAmount,
      reason: `Welcome bonus for signing up (+${signupBonusAmount} Credits)`,
      idempotencyKey: `signup_bonus_${userId}`,
      status: 'APPROVED'
    });
  }

  // 5. Award Referral Bonus (+1 Credit) to referring user when a new user signs up
  if (referredBy) {
    const referrer = getUserByReferralCode(referredBy) || getUserById(referredBy);
    if (referrer && referrer.id !== userId) {
      recordCreditTransaction({
        userId: referrer.id,
        type: 'REFERRAL_SIGNUP',
        amount: 1,
        reason: `Referral signup reward (+1 Credit) for inviting ${newUser.displayName}`,
        idempotencyKey: `ref_signup_reward_${userId}_${referrer.id}`,
        status: 'APPROVED'
      });

      if (!globalForUsers.nexusReferralAttributions.has(userId)) {
        globalForUsers.nexusReferralAttributions.set(userId, {
          id: `attr_${userId}`,
          referrerUserId: referrer.id,
          referredUserId: userId,
          referralCode: referrer.referralCode,
          visitorId: `vis_${userId}`,
          landingPath: '/',
          status: 'CONVERTED',
          createdAt: now,
          qualifiedAt: now,
          rewardAwarded: true,
          rewardAmount: 1
        });
      }
    }
  }

  scheduleDiskSave();

  return { user: getUserById(userId)!, isNewUser: true };
}

// ----------------------------------------------------
// CREDIT LEDGER & TRANSACTION MANAGEMENT
// ----------------------------------------------------

export function calculateUserLedgerStats(userId: string) {
  const userTransactions = globalForUsers.nexusLedgerDatabase.filter(
    tx => tx.userId === userId && tx.status === 'APPROVED'
  );

  let totalEarned = 0;
  let totalSpent = 0;

  for (const tx of userTransactions) {
    if (tx.amount > 0) {
      totalEarned += tx.amount;
    } else {
      totalSpent += Math.abs(tx.amount);
    }
  }

  totalEarned = roundCredits(totalEarned);
  totalSpent = roundCredits(totalSpent);
  const balance = roundCredits(Math.max(0, totalEarned - totalSpent));
  return { balance, totalEarned, totalSpent };
}

export function getUserLedger(userId: string): CreditTransaction[] {
  return globalForUsers.nexusLedgerDatabase
    .filter(tx => tx.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Record a transaction into the immutable ledger with anti-abuse enforcement.
 */
export function recordCreditTransaction(
  arg1:
    | {
        userId: string;
        type: LedgerActionType;
        amount: number;
        reason: string;
        communityId?: string;
        communityTitle?: string;
        metadata?: any;
        idempotencyKey?: string;
        status?: 'PENDING' | 'APPROVED' | 'REJECTED';
      }
    | string,
  arg2?: any,
  arg3?: any,
  arg4?: any,
  arg5?: any,
  arg6?: any
): { success: boolean; transaction?: CreditTransaction; error?: string; newBalance?: number } {
  let params: {
    userId: string;
    type: LedgerActionType;
    amount: number;
    reason: string;
    communityId?: string;
    communityTitle?: string;
    metadata?: any;
    idempotencyKey?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  };

  if (typeof arg1 === 'object') {
    params = arg1;
  } else {
    const userId = arg1;
    let type: LedgerActionType = 'PURCHASED_CREDITS';
    let amount = 0;
    let reason = '';
    let metadata: any = undefined;
    let idempotencyKey: string | undefined = undefined;

    if (typeof arg2 === 'number') {
      amount = arg2;
      type = arg3 as LedgerActionType;
      reason = String(arg4 || '');
      metadata = typeof arg5 === 'object' ? arg5 : undefined;
    } else {
      type = arg2 as LedgerActionType;
      amount = Number(arg3 || 0);
      reason = String(arg4 || '');
      if (typeof arg5 === 'string') {
        idempotencyKey = arg5;
      }
      metadata = typeof arg6 === 'object' ? arg6 : typeof arg5 === 'object' ? arg5 : undefined;
    }

    params = {
      userId,
      type,
      amount,
      reason,
      metadata,
      idempotencyKey,
    };
  }

  const { userId, type, amount, reason, communityId, communityTitle, metadata, idempotencyKey } = params;

  const user = getUserById(userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  if (user.isBanned) {
    return { success: false, error: 'User account is restricted' };
  }

  // 1. Check Idempotency Key
  if (idempotencyKey) {
    const existing = globalForUsers.nexusLedgerDatabase.find(tx => tx.idempotencyKey === idempotencyKey);
    if (existing) {
      return { 
        success: true, 
        transaction: existing, 
        newBalance: user.creditsBalance 
      };
    }
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 2. Anti-Abuse Rules for Earnings
  if (type === 'COMMENT_REWARD') {
    const todayCommentTxCount = globalForUsers.nexusLedgerDatabase.filter(
      tx => tx.userId === userId && 
            tx.type === 'COMMENT_REWARD' && 
            tx.status === 'APPROVED' &&
            new Date(tx.createdAt).getTime() >= todayStart.getTime()
    ).length;

    if (todayCommentTxCount >= 5) {
      return { success: false, error: 'Daily reward limit reached (max 5 comments per day).' };
    }

    if (communityId) {
      const allGroups = getGroupsDatabase();
      const targetGroup = allGroups.find(g => g.id === communityId);
      if (targetGroup && targetGroup.claimedByUserId === userId) {
        return { success: false, error: 'Cannot earn credits on your own claimed community.' };
      }
    }
  }

  if (type === 'RATING_REWARD') {
    const todayRatingTxCount = globalForUsers.nexusLedgerDatabase.filter(
      tx => tx.userId === userId && 
            tx.type === 'RATING_REWARD' && 
            tx.status === 'APPROVED' &&
            new Date(tx.createdAt).getTime() >= todayStart.getTime()
    ).length;

    if (todayRatingTxCount >= 5) {
      return { success: false, error: 'Daily reward limit reached (max 5 ratings per day).' };
    }

    if (communityId) {
      const alreadyRewarded = globalForUsers.nexusLedgerDatabase.some(
        tx => tx.userId === userId && tx.type === 'RATING_REWARD' && tx.communityId === communityId && tx.status === 'APPROVED'
      );
      if (alreadyRewarded) {
        return { success: false, error: 'You have already earned credits for rating this community.' };
      }

      const allGroups = getGroupsDatabase();
      const targetGroup = allGroups.find(g => g.id === communityId);
      if (targetGroup && targetGroup.claimedByUserId === userId) {
        return { success: false, error: 'Cannot earn credits on your own claimed community.' };
      }
    }
  }

  // 3. Balance Check for Spending
  const normalizedAmount = roundCredits(Math.abs(amount));
  if (type === 'PROMOTION_SPEND') {
    if (user.creditsBalance < normalizedAmount) {
      return { 
        success: false, 
        error: `Insufficient promotion credits. You have ${user.creditsBalance} credits, but this boost requires ${normalizedAmount} credits.` 
      };
    }
  }

  const txId = generateTransactionId();
  const txStatus = params.status || 'APPROVED';

  const transaction: CreditTransaction = {
    id: txId,
    userId,
    type,
    amount: type === 'PROMOTION_SPEND' ? -normalizedAmount : normalizedAmount,
    status: txStatus,
    communityId,
    communityTitle,
    metadata,
    reason,
    idempotencyKey,
    createdAt: new Date().toISOString()
  };

  globalForUsers.nexusLedgerDatabase.push(transaction);

  // Update in-memory user balance
  const updatedStats = calculateUserLedgerStats(userId);
  const updatedUser = {
    ...user,
    creditsBalance: updatedStats.balance,
    totalCreditsEarned: updatedStats.totalEarned,
    totalCreditsSpent: updatedStats.totalSpent,
    updatedAt: new Date().toISOString()
  };
  globalForUsers.nexusUsersDatabase.set(userId, updatedUser);
  scheduleDiskSave();

  return {
    success: true,
    newBalance: updatedStats.balance,
    transaction,
  };
}

// ----------------------------------------------------
// REFERRAL SYSTEM (0.01 POINTS PER VALID VISITOR)
// ----------------------------------------------------

export function getReferralProgramSettings(): ReferralProgramSettings {
  return globalForUsers.nexusReferralSettings || {
    rewardPerValidVisitor: 0.01,
    isEnabled: true,
    dailyCapPerReferrer: 500,
    monthlyCapPerReferrer: 10000,
  };
}

export function updateReferralProgramSettings(settings: Partial<ReferralProgramSettings>): ReferralProgramSettings {
  globalForUsers.nexusReferralSettings = {
    ...getReferralProgramSettings(),
    ...settings,
  };
  scheduleDiskSave();
  return globalForUsers.nexusReferralSettings;
}

export function getPlatformRewardSettings(): PlatformRewardSettings {
  return globalForUsers.nexusRewardSettings || {
    signupBonus: 5,
    upvoteReward: 1,
    shareReward: 1,
    ratingReward: 1,
    commentReward: 1,
    referralReward: 1,
  };
}

export function updatePlatformRewardSettings(settings: Partial<PlatformRewardSettings>): PlatformRewardSettings {
  globalForUsers.nexusRewardSettings = {
    ...getPlatformRewardSettings(),
    ...settings,
  };
  scheduleDiskSave();
  return globalForUsers.nexusRewardSettings;
}

/**
 * Record initial referral attribution when a visitor arrives with ?ref=CODE.
 * Follows strict FIRST-TOUCH attribution: if visitor is already attributed, ignores subsequent codes.
 */
export function recordReferralAttribution(params: {
  visitorId: string;
  referralCode: string;
  landingPath?: string;
  ipHash?: string;
  userAgent?: string;
}): { success: boolean; attribution?: ReferralAttribution; isNewAttribution: boolean; error?: string } {
  const { visitorId, referralCode, landingPath = '/', ipHash, userAgent } = params;
  if (!visitorId || !referralCode) {
    return { success: false, isNewAttribution: false, error: 'Visitor ID and Referral Code are required.' };
  }

  const cleanCode = referralCode.trim().toLowerCase();
  const referrerUser = getUserByReferralCode(cleanCode);
  if (!referrerUser) {
    return { success: false, isNewAttribution: false, error: 'Referral code not found.' };
  }

  // 1. Check First-Touch: If already attributed, preserve original referrer
  const existing = globalForUsers.nexusReferralAttributions.get(visitorId);
  if (existing) {
    // Log repeat visit event
    const event: ReferralEvent = {
      id: `refev_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`,
      visitorId,
      referralCode: existing.referralCode || cleanCode,
      referrerUserId: existing.referrerUserId || '',
      eventType: 'REPEAT_VISIT',
      path: landingPath,
      timestamp: new Date().toISOString()
    };
    globalForUsers.nexusReferralEvents.push(event);
    scheduleDiskSave();
    return { success: true, attribution: existing, isNewAttribution: false };
  }

  const now = new Date().toISOString();
  const attribution: ReferralAttribution = {
    id: `ref_attr_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`,
    visitorId,
    referralCode: cleanCode,
    referrerUserId: referrerUser.id,
    landingPath,
    status: 'ATTRIBUTED',
    ipHash,
    userAgent,
    createdAt: now,
    updatedAt: now
  };

  globalForUsers.nexusReferralAttributions.set(visitorId, attribution);

  // Log initial visit event
  const event: ReferralEvent = {
    id: `refev_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`,
    visitorId,
    referralCode: cleanCode,
    referrerUserId: referrerUser.id,
    eventType: 'VISIT',
    path: landingPath,
    timestamp: now
  };
  globalForUsers.nexusReferralEvents.push(event);
  scheduleDiskSave();

  return { success: true, attribution, isNewAttribution: true };
}

/**
 * Determines whether a given request path qualifies as a valid visitor destination.
 * Matches qualifying paths like /join, /rules, group join flows, and direct entry pages.
 */
export function isQualifyingReferralPath(path: string): boolean {
  if (!path) return false;
  const clean = path.split('?')[0].split('#')[0].toLowerCase().trim();
  
  if (clean === '/join' || clean === '/rules') return true;
  if (clean.endsWith('/join') || clean.endsWith('/rules')) return true;
  if (clean.includes('/join?') || clean.includes('/rules?')) return true;

  return false;
}

/**
 * Qualify a referral visitor when they reach a valid /join or /rules landing page.
 * Awards exactly 0.01 points to the referrer via the immutable ledger with strict idempotency.
 */
export function qualifyReferralVisitor(params: {
  visitorId: string;
  qualifyingPath: string;
  currentUserId?: string; // If visitor is logged in, prevents self-referral
}): { 
  success: boolean; 
  qualified: boolean; 
  rewardAwarded: boolean; 
  amount: number; 
  error?: string;
  transaction?: CreditTransaction;
} {
  const { visitorId, qualifyingPath, currentUserId } = params;
  if (!visitorId) {
    return { success: false, qualified: false, rewardAwarded: false, amount: 0, error: 'Visitor ID is required' };
  }

  const attribution = globalForUsers.nexusReferralAttributions.get(visitorId);
  if (!attribution) {
    return { success: false, qualified: false, rewardAwarded: false, amount: 0, error: 'No active referral attribution found for this visitor' };
  }

  // Already qualified: idempotent return
  if (attribution.status === 'QUALIFIED') {
    return { 
      success: true, 
      qualified: true, 
      rewardAwarded: false, 
      amount: attribution.rewardAmount || 0.01 
    };
  }

  const settings = getReferralProgramSettings();
  if (!settings.isEnabled) {
    return { success: false, qualified: false, rewardAwarded: false, amount: 0, error: 'Referral rewards are currently paused.' };
  }

  const referrer = getUserById(attribution.referrerUserId);
  if (!referrer) {
    return { success: false, qualified: false, rewardAwarded: false, amount: 0, error: 'Referrer account no longer exists' };
  }

  // Anti-self-referral prevention
  if (currentUserId && currentUserId === referrer.id) {
    return { success: false, qualified: false, rewardAwarded: false, amount: 0, error: 'Self-referrals are not eligible for points' };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Enforce Daily Cap
  const todayReferralTxCount = globalForUsers.nexusLedgerDatabase.filter(
    tx => tx.userId === referrer.id && 
          tx.type === 'REFERRAL_VISITOR_REWARD' && 
          tx.status === 'APPROVED' &&
          new Date(tx.createdAt).getTime() >= todayStart.getTime()
  ).length;

  if (todayReferralTxCount >= settings.dailyCapPerReferrer) {
    return { success: false, qualified: false, rewardAwarded: false, amount: 0, error: 'Daily referral cap reached for this referrer' };
  }

  const rewardAmount = roundCredits(settings.rewardPerValidVisitor || 0.01);
  const idempotencyKey = `referral_visitor_${visitorId}_${referrer.id}`;

  const ledgerResult = recordCreditTransaction({
    userId: referrer.id,
    type: 'REFERRAL_VISITOR_REWARD',
    amount: rewardAmount,
    reason: `Referral reward: valid visitor reached ${qualifyingPath}`,
    metadata: {
      visitorId,
      referralCode: attribution.referralCode,
      qualifyingPath,
      landingPath: attribution.landingPath,
      attributionId: attribution.id
    },
    idempotencyKey,
    status: 'APPROVED'
  });

  const now = new Date().toISOString();
  attribution.status = 'QUALIFIED';
  attribution.qualifiedAt = now;
  attribution.qualifyingPath = qualifyingPath;
  attribution.rewardAmount = rewardAmount;
  attribution.ledgerTxId = ledgerResult.transaction?.id;
  attribution.updatedAt = now;

  // Log Qualify Event
  const event: ReferralEvent = {
    id: `refev_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`,
    visitorId,
    referralCode: attribution.referralCode || '',
    referrerUserId: referrer.id,
    eventType: 'QUALIFY',
    path: qualifyingPath,
    timestamp: now
  };
  globalForUsers.nexusReferralEvents.push(event);
  scheduleDiskSave();

  return {
    success: true,
    qualified: true,
    rewardAwarded: Boolean(ledgerResult.success),
    amount: rewardAmount,
    transaction: ledgerResult.transaction
  };
}

export function getUserReferralStats(userId: string): ReferralStatsSummary {
  const attributions = Array.from(globalForUsers.nexusReferralAttributions.values()).filter(
    a => a.referrerUserId === userId
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const totalVisitors = attributions.length;
  const validVisitors = attributions.filter(a => a.status === 'QUALIFIED').length;
  const conversionRate = totalVisitors > 0 ? Math.round((validVisitors / totalVisitors) * 1000) / 10 : 0;

  const todayAttributions = attributions.filter(
    a => new Date(a.createdAt).getTime() >= todayStart.getTime()
  );
  const todayVisitors = todayAttributions.length;
  const todayValidVisitors = todayAttributions.filter(a => a.status === 'QUALIFIED').length;

  // Calculate total points earned from ledger for accuracy
  const userReferralTxs = globalForUsers.nexusLedgerDatabase.filter(
    tx => tx.userId === userId && 
          tx.type === 'REFERRAL_VISITOR_REWARD' && 
          tx.status === 'APPROVED'
  );

  let totalPointsEarned = 0;
  let todayPointsEarned = 0;

  for (const tx of userReferralTxs) {
    totalPointsEarned += tx.amount;
    if (new Date(tx.createdAt).getTime() >= todayStart.getTime()) {
      todayPointsEarned += tx.amount;
    }
  }

  return {
    totalVisitors,
    validVisitors,
    conversionRate,
    totalPointsEarned: roundCredits(totalPointsEarned),
    todayVisitors,
    todayValidVisitors,
    todayPointsEarned: roundCredits(todayPointsEarned)
  };
}

export function getUserReferralAttributions(userId: string): ReferralAttribution[] {
  return Array.from(globalForUsers.nexusReferralAttributions.values())
    .filter(a => a.referrerUserId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAllReferralAnalytics() {
  const allAttributions = Array.from(globalForUsers.nexusReferralAttributions.values());
  const allEvents = globalForUsers.nexusReferralEvents;
  const settings = getReferralProgramSettings();

  const totalAttributed = allAttributions.length;
  const totalQualified = allAttributions.filter(a => a.status === 'QUALIFIED').length;
  const conversionRate = totalAttributed > 0 ? Math.round((totalQualified / totalAttributed) * 1000) / 10 : 0;

  const referralTxs = globalForUsers.nexusLedgerDatabase.filter(
    tx => tx.type === 'REFERRAL_VISITOR_REWARD' && tx.status === 'APPROVED'
  );

  let totalPointsAwarded = 0;
  for (const tx of referralTxs) {
    totalPointsAwarded += tx.amount;
  }
  totalPointsAwarded = roundCredits(totalPointsAwarded);

  // Group by Referrer
  const referrerMap = new Map<string, {
    userId: string;
    displayName: string;
    referralCode: string;
    totalVisitors: number;
    validVisitors: number;
    pointsEarned: number;
  }>();

  for (const attr of allAttributions) {
    let entry = referrerMap.get(attr.referrerUserId);
    if (!entry) {
      const user = getUserById(attr.referrerUserId);
      entry = {
        userId: attr.referrerUserId,
        displayName: user?.displayName || 'Unknown User',
        referralCode: user?.referralCode || attr.referralCode || '',
        totalVisitors: 0,
        validVisitors: 0,
        pointsEarned: 0
      };
      referrerMap.set(attr.referrerUserId, entry);
    }
    entry.totalVisitors += 1;
    if (attr.status === 'QUALIFIED') {
      entry.validVisitors += 1;
      entry.pointsEarned = roundCredits(entry.pointsEarned + (attr.rewardAmount || 0.01));
    }
  }

  const topReferrers = Array.from(referrerMap.values())
    .sort((a, b) => b.validVisitors - a.validVisitors || b.totalVisitors - a.totalVisitors);

  const recentAttributions = allAttributions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  return {
    totalAttributed,
    totalQualified,
    totalPointsAwarded,
    conversionRate,
    settings,
    topReferrers,
    recentAttributions,
    recentEvents: allEvents.slice(-50).reverse()
  };
}

// ----------------------------------------------------
// COMMUNITY OWNERSHIP & CLAIMING ENGINE
// ----------------------------------------------------

export function submitCommunityClaim(params: {
  communityId: string;
  userId: string;
  verificationMethod: ClaimVerificationMethod;
  proofUrl?: string;
  proofDetails?: string;
}): { success: boolean; claim?: CommunityClaim; error?: string } {
  const { communityId, userId, verificationMethod, proofUrl, proofDetails } = params;

  const allGroups = getGroupsDatabase();
  const target = allGroups.find(g => g.id === communityId);
  if (!target) {
    return { success: false, error: 'Community group not found' };
  }

  if (target.isClaimed && target.claimedByUserId && target.claimedByUserId !== userId) {
    return { success: false, error: 'This community is already claimed and verified by another owner.' };
  }

  const existingPending = globalForUsers.nexusClaimsDatabase.find(
    c => c.communityId === communityId && c.userId === userId && c.status === 'PENDING'
  );
  if (existingPending) {
    return { success: true, claim: existingPending };
  }

  const verificationCode = `GL-VERIFY-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const claim: CommunityClaim = {
    id: generateClaimId(),
    communityId,
    communityTitle: target.title,
    communityPlatform: target.platform,
    userId,
    verificationMethod,
    verificationCode,
    proofUrl: proofUrl || '',
    proofDetails: proofDetails || '',
    status: 'PENDING',
    claimedAt: new Date().toISOString()
  };

  globalForUsers.nexusClaimsDatabase.push(claim);
  scheduleDiskSave();
  return { success: true, claim };
}

export function approveCommunityClaim(claimId: string): { success: boolean; error?: string } {
  const claim = globalForUsers.nexusClaimsDatabase.find(c => c.id === claimId);
  if (!claim) return { success: false, error: 'Claim request not found' };

  claim.status = 'VERIFIED';
  claim.verifiedAt = new Date().toISOString();

  updateGroup(claim.communityId, {
    isClaimed: true,
    claimedByUserId: claim.userId,
    claimedAt: claim.verifiedAt
  });

  scheduleDiskSave();
  return { success: true };
}

export function getUserClaims(userId: string): CommunityClaim[] {
  return globalForUsers.nexusClaimsDatabase
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.claimedAt || Date.now()).getTime() - new Date(a.claimedAt || Date.now()).getTime());
}

// ----------------------------------------------------
// GROUPLINKS PROMOTION VERIFICATION (+50 CREDITS)
// ----------------------------------------------------

export function getUserTrackingLink(userId: string): UserTrackingLink {
  for (const link of globalForUsers.nexusTrackingLinks.values()) {
    if (link.userId === userId) {
      return link;
    }
  }

  const user = getUserById(userId);
  const code = user?.referralCode || `gl-${crypto.randomBytes(3).toString('hex')}`;
  const newLink: UserTrackingLink = {
    id: `trk_${Date.now().toString(36)}`,
    userId,
    code,
    url: `https://grouplinks.app/go/${code}`,
    clicks: 0,
    verifiedConversions: 0,
    createdAt: new Date().toISOString()
  };

  globalForUsers.nexusTrackingLinks.set(code, newLink);
  scheduleDiskSave();
  return newLink;
}

export function recordTrackingClick(code: string): boolean {
  const link = globalForUsers.nexusTrackingLinks.get(code);
  if (!link) return false;
  link.clicks += 1;
  scheduleDiskSave();
  return true;
}

export function submitPromotionVerification(params: {
  userId: string;
  trackingCode: string;
  channelOrGroupUrl: string;
  platform: 'telegram' | 'discord' | 'whatsapp' | 'facebook' | 'reddit' | 'website' | 'other';
  proofUrl?: string;
  screenshotUrl?: string;
  notes?: string;
}): { success: boolean; verification?: PromotionVerificationRequest; error?: string } {
  const { userId, trackingCode, channelOrGroupUrl, platform, proofUrl, screenshotUrl, notes } = params;

  if (!channelOrGroupUrl || !channelOrGroupUrl.trim()) {
    return { success: false, error: 'Channel, group, or post URL is required' };
  }

  const req: PromotionVerificationRequest = {
    id: generatePromoVerificationId(),
    userId,
    trackingCode,
    channelOrGroupUrl: channelOrGroupUrl.trim(),
    platform,
    proofUrl: proofUrl?.trim() || '',
    screenshotUrl: screenshotUrl?.trim() || '',
    status: 'PENDING',
    creditsAwarded: 50,
    submittedAt: new Date().toISOString(),
    notes: notes?.trim() || ''
  };

  globalForUsers.nexusPromoVerifications.push(req);
  scheduleDiskSave();
  return { success: true, verification: req };
}

export function approvePromotionVerification(verificationId: string, verifiedBy: string = 'System Admin'): { success: boolean; error?: string } {
  const promo = globalForUsers.nexusPromoVerifications.find(p => p.id === verificationId);
  if (!promo) return { success: false, error: 'Verification request not found' };
  if (promo.status === 'VERIFIED') return { success: true };

  promo.status = 'VERIFIED';
  promo.verifiedAt = new Date().toISOString();

  // Award +50 Credits via Ledger
  recordCreditTransaction({
    userId: promo.userId,
    type: 'PROMOTION_VERIFIED',
    amount: 50,
    reason: `Verified promotion of GroupLinks.app on ${promo.platform} channel/group`,
    metadata: {
      platform: promo.platform,
      channelUrl: promo.channelOrGroupUrl,
      proofUrl: promo.proofUrl,
      verifiedBy
    },
    idempotencyKey: `promo_verified_${promo.id}`
  });

  scheduleDiskSave();
  return { success: true };
}

export function getUserPromotionVerifications(userId: string): PromotionVerificationRequest[] {
  return globalForUsers.nexusPromoVerifications
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

// ----------------------------------------------------
// PASSWORDLESS MAGIC LINK / EMAIL OTP MANAGEMENT
// ----------------------------------------------------

export function createMagicOtp(email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  // Cryptographically secure 6-digit OTP
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

  globalForUsers.nexusMagicOtps.set(cleanEmail, {
    code,
    expiresAt,
    email: cleanEmail,
    attempts: 0
  });

  return code;
}

export function verifyMagicOtp(email: string, code: string): boolean {
  if (!email || !code) return false;
  const cleanEmail = email.trim().toLowerCase();
  const stored = globalForUsers.nexusMagicOtps.get(cleanEmail);
  if (!stored) return false;

  if (Date.now() > stored.expiresAt) {
    globalForUsers.nexusMagicOtps.delete(cleanEmail);
    return false;
  }

  stored.attempts = (stored.attempts || 0) + 1;
  if (stored.attempts > 5) {
    globalForUsers.nexusMagicOtps.delete(cleanEmail);
    return false;
  }

  const cleanInput = code.trim();
  if (stored.code === cleanInput) {
    // Single-use: delete immediately to prevent replay
    globalForUsers.nexusMagicOtps.delete(cleanEmail);
    return true;
  }

  return false;
}

// ----------------------------------------------------
// SESSIONS
// ----------------------------------------------------

export function createSession(userId: string): string {
  const token = `gl_sess_${crypto.randomBytes(32).toString('hex')}`;
  globalForUsers.nexusActiveSessions.set(token, {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  });
  return token;
}

export function getSessionUser(token?: string): UserProfile | null {
  if (!token) return null;
  const session = globalForUsers.nexusActiveSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    globalForUsers.nexusActiveSessions.delete(token);
    return null;
  }

  return getUserById(session.userId);
}

export function destroySession(token: string) {
  if (token) {
    globalForUsers.nexusActiveSessions.delete(token);
  }
}

// ----------------------------------------------------
// PRIVACY & DATA EXPORT / DELETION
// ----------------------------------------------------

export function exportUserData(userId: string) {
  const user = getUserById(userId);
  if (!user) return null;

  const ledger = getUserLedger(userId);
  const claims = getUserClaims(userId);
  const promotions = getUserPromotionVerifications(userId);
  const trackingLink = getUserTrackingLink(userId);
  const referralStats = getUserReferralStats(userId);
  const referrals = getUserReferralAttributions(userId);

  return {
    exportDate: new Date().toISOString(),
    profile: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      creditsBalance: user.creditsBalance,
      totalCreditsEarned: user.totalCreditsEarned,
      totalCreditsSpent: user.totalCreditsSpent,
      referralCode: user.referralCode,
      createdAt: user.createdAt
    },
    linkedAccounts: user.linkedAccounts.map(la => ({
      provider: la.provider,
      displayName: la.displayName,
      linkedAt: la.linkedAt
    })),
    referralStats,
    referrals,
    creditTransactions: ledger,
    communityClaims: claims,
    promotions,
    trackingLink
  };
}

export function deleteUserData(userId: string): boolean {
  const user = globalForUsers.nexusUsersDatabase.get(userId);
  if (!user) return false;

  globalForUsers.nexusUsersDatabase.delete(userId);

  // Anonymize ledger transactions to preserve financial audit trail
  for (const tx of globalForUsers.nexusLedgerDatabase) {
    if (tx.userId === userId) {
      tx.userId = `deleted_${userId.substring(0, 8)}`;
      tx.reason = `[Anonymized - Account Deleted] ${tx.type}`;
    }
  }

  // Remove claims
  globalForUsers.nexusClaimsDatabase = globalForUsers.nexusClaimsDatabase.filter(c => c.userId !== userId);

  // Remove tracking link
  for (const [code, trk] of globalForUsers.nexusTrackingLinks.entries()) {
    if (trk.userId === userId) {
      globalForUsers.nexusTrackingLinks.delete(code);
    }
  }

  scheduleDiskSave();
  return true;
}

/**
 * Save user hashed password to secure in-memory/cache store
 */
export function saveUserPasswordHash(email: string, hash: string): void {
  const normalized = email.trim().toLowerCase();
  globalForUsers.nexusUserPasswordHashes.set(normalized, hash);
}

/**
 * Get user hashed password from store
 */
export function getUserPasswordHash(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  return globalForUsers.nexusUserPasswordHashes.get(normalized) || null;
}

/**
 * Save password reset OTP to store (valid for 15 minutes)
 */
export function savePasswordResetOtp(email: string, code: string): void {
  const normalized = email.trim().toLowerCase();
  globalForUsers.nexusPasswordResetOtps.set(normalized, {
    code: code.trim(),
    expiresAt: Date.now() + 15 * 60 * 1000,
    email: normalized,
    attempts: 0,
  });
}

/**
 * Get password reset OTP state from store
 */
export function getPasswordResetOtp(email: string): { code: string; expiresAt: number; attempts: number } | null {
  const normalized = email.trim().toLowerCase();
  const record = globalForUsers.nexusPasswordResetOtps.get(normalized);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    globalForUsers.nexusPasswordResetOtps.delete(normalized);
    return null;
  }
  return record;
}

/**
 * Increment password reset OTP failure attempts
 */
export function incrementPasswordResetAttempts(email: string): void {
  const normalized = email.trim().toLowerCase();
  const record = globalForUsers.nexusPasswordResetOtps.get(normalized);
  if (record) {
    record.attempts += 1;
    if (record.attempts >= 5) {
      globalForUsers.nexusPasswordResetOtps.delete(normalized);
    }
  }
}

/**
 * Clear password reset OTP after successful consumption
 */
export function clearPasswordResetOtp(email: string): void {
  const normalized = email.trim().toLowerCase();
  globalForUsers.nexusPasswordResetOtps.delete(normalized);
}

