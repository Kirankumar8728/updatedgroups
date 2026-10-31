import fs from 'fs';
import path from 'path';
import {
  UserProfile,
  CreditTransaction,
  CommunityClaim,
  PromotionVerificationRequest,
  UserTrackingLink,
  ReferralAttribution,
  ReferralEvent,
  ReferralProgramSettings,
  PlatformRewardSettings,
} from '@/src/types/user';

const DATA_DIR = path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'nexus-users.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[USER PERSISTENCE] Failed to create data directory:', err);
  }
}

export interface PersistentUserData {
  users: UserProfile[];
  ledger: CreditTransaction[];
  claims: CommunityClaim[];
  promoVerifications: PromotionVerificationRequest[];
  trackingLinks: UserTrackingLink[];
  referralAttributions?: ReferralAttribution[];
  referralEvents?: ReferralEvent[];
  referralSettings?: ReferralProgramSettings;
  rewardSettings?: PlatformRewardSettings;
}

export function loadUsersFromDisk(): PersistentUserData | null {
  try {
    ensureDataDir();
    if (!fs.existsSync(USERS_FILE)) return null;
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
        claims: Array.isArray(parsed.claims) ? parsed.claims : [],
        promoVerifications: Array.isArray(parsed.promoVerifications) ? parsed.promoVerifications : [],
        trackingLinks: Array.isArray(parsed.trackingLinks) ? parsed.trackingLinks : [],
        referralAttributions: Array.isArray(parsed.referralAttributions) ? parsed.referralAttributions : [],
        referralEvents: Array.isArray(parsed.referralEvents) ? parsed.referralEvents : [],
        referralSettings: parsed.referralSettings && typeof parsed.referralSettings === 'object' ? parsed.referralSettings : undefined,
        rewardSettings: parsed.rewardSettings && typeof parsed.rewardSettings === 'object' ? parsed.rewardSettings : undefined,
      };
    }
  } catch (err) {
    console.error('[USER PERSISTENCE] Failed to load users from disk:', err);
  }
  return null;
}

export function saveUsersToDisk(data: PersistentUserData): boolean {
  try {
    ensureDataDir();
    const tempFile = `${USERS_FILE}.tmp.${Date.now()}`;
    const payload = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, payload, 'utf-8');
    fs.renameSync(tempFile, USERS_FILE);
    return true;
  } catch (err) {
    console.error('[USER PERSISTENCE] Failed to save users to disk:', err);
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch {
      return false;
    }
  }
}
