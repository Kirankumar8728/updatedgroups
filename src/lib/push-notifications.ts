import webpush from 'web-push';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { queryRows, executeDml, isMySQLConfigured } from './db';

export interface PushSubscriptionRecord {
  id: string;
  user_id?: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  platform?: string;
  created_at?: string;
}

export interface AutoNotificationConfig {
  enabled: boolean;
  template: 'trending' | 'daily_champion' | 'new_verified' | 'custom';
  customTitle?: string;
  customBody?: string;
  targetPercent: number; // 10 to 100
  batchSize: number;     // e.g. 25
  delayMs: number;       // e.g. 500
  dailyHourUtc: number;  // 0-23
  lastRunDate?: string;
  lastRunCount?: number;
}

const VAPID_SUBJECT = 'mailto:support@grouplinks.app';
const DATA_DIR = path.join(process.cwd(), 'data');
const VAPID_FILE = path.join(DATA_DIR, 'vapid-keys.json');
const SUBS_FILE = path.join(DATA_DIR, 'push_subscriptions.json');
const AUTO_CONFIG_FILE = path.join(DATA_DIR, 'auto-notifications-config.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

// 1. VAPID Keys Management
export function getVapidKeys(): { publicKey: string; privateKey: string } {
  ensureDataDir();

  // Check env vars first
  const envPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPub && envPriv) {
    try {
      webpush.setVapidDetails(VAPID_SUBJECT, envPub, envPriv);
    } catch {}
    return { publicKey: envPub, privateKey: envPriv };
  }

  // Check persisted JSON file
  if (fs.existsSync(VAPID_FILE)) {
    try {
      const content = fs.readFileSync(VAPID_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.publicKey && parsed.privateKey) {
        try {
          webpush.setVapidDetails(VAPID_SUBJECT, parsed.publicKey, parsed.privateKey);
        } catch {}
        return parsed;
      }
    } catch {}
  }

  // Generate fresh keys and persist
  try {
    const keys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2), 'utf-8');
    try {
      webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);
    } catch {}
    return keys;
  } catch (err) {
    console.error('Failed to generate VAPID keys:', err);
    return { publicKey: '', privateKey: '' };
  }
}

// 2. Read / Write File Subscriptions Cache (Hybrid Fallback)
function readFileSubscriptions(): PushSubscriptionRecord[] {
  ensureDataDir();
  if (!fs.existsSync(SUBS_FILE)) return [];
  try {
    const raw = fs.readFileSync(SUBS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeFileSubscriptions(subs: PushSubscriptionRecord[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write subscriptions cache:', err);
  }
}

// 3. Subscriptions Retrieval & Storage
export async function getAllSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const fileSubs = readFileSubscriptions();
  const map = new Map<string, PushSubscriptionRecord>();

  for (const s of fileSubs) {
    if (s.endpoint) map.set(s.endpoint, s);
  }

  if (isMySQLConfigured()) {
    try {
      const rows = await queryRows<PushSubscriptionRecord>(
        'SELECT id, user_id, endpoint, p256dh, auth, platform, created_at FROM push_subscriptions'
      );
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row.endpoint) map.set(row.endpoint, row);
        }
      }
    } catch {}
  }

  return Array.from(map.values());
}

export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string | null;
  platform?: string;
}): Promise<void> {
  const id = crypto.createHash('md5').update(sub.endpoint).digest('hex');
  const record: PushSubscriptionRecord = {
    id,
    user_id: sub.userId || null,
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
    platform: sub.platform || 'web',
    created_at: new Date().toISOString()
  };

  const fileSubs = readFileSubscriptions();
  const existingIdx = fileSubs.findIndex(s => s.endpoint === sub.endpoint);
  if (existingIdx >= 0) {
    fileSubs[existingIdx] = record;
  } else {
    fileSubs.push(record);
  }
  writeFileSubscriptions(fileSubs);

  if (isMySQLConfigured()) {
    try {
      await executeDml(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, platform, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
        [id, sub.userId || null, sub.endpoint, sub.p256dh, sub.auth, sub.platform || 'web']
      );
    } catch (err) {
      console.warn('MySQL push subscription insert notice:', err);
    }
  }
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const fileSubs = readFileSubscriptions().filter(s => s.endpoint !== endpoint);
  writeFileSubscriptions(fileSubs);

  if (isMySQLConfigured()) {
    try {
      await executeDml('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    } catch {}
  }
}

// 4. Batch Dispatch Engine
export async function sendBatchedPushBroadcast(options: {
  title: string;
  message: string;
  url?: string;
  batchSize?: number;
  delayMs?: number;
  maxSubscribers?: number;
}): Promise<{
  success: boolean;
  totalSubscribers: number;
  sentCount: number;
  failedCount: number;
  batchesCount: number;
  message: string;
}> {
  const { publicKey, privateKey } = getVapidKeys();
  if (!publicKey || !privateKey) {
    return {
      success: false,
      totalSubscribers: 0,
      sentCount: 0,
      failedCount: 0,
      batchesCount: 0,
      message: 'VAPID keys could not be initialized.'
    };
  }

  let subs = await getAllSubscriptions();
  if (options.maxSubscribers && options.maxSubscribers > 0 && subs.length > options.maxSubscribers) {
    subs = subs.slice(0, options.maxSubscribers);
  }

  if (subs.length === 0) {
    return {
      success: true,
      totalSubscribers: 0,
      sentCount: 0,
      failedCount: 0,
      batchesCount: 0,
      message: 'No subscribers currently registered.'
    };
  }

  const batchSize = Math.max(1, Math.min(500, options.batchSize || 25));
  const delayMs = Math.max(0, Math.min(10000, options.delayMs || 0));

  const payload = JSON.stringify({
    title: options.title,
    body: options.message,
    url: options.url || '/'
  });

  let sentCount = 0;
  let failedCount = 0;
  let batchesCount = 0;

  for (let i = 0; i < subs.length; i += batchSize) {
    batchesCount++;
    const chunk = subs.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      chunk.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        try {
          await webpush.sendNotification(pushSubscription, payload);
          return true;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await removeSubscription(sub.endpoint);
          }
          throw err;
        }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') sentCount++;
      else failedCount++;
    }

    if (delayMs > 0 && i + batchSize < subs.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return {
    success: true,
    totalSubscribers: subs.length,
    sentCount,
    failedCount,
    batchesCount,
    message: `Broadcast finished: ${sentCount} delivered successfully, ${failedCount} failed across ${batchesCount} batch(es).`
  };
}

// 5. Automated Daily Notification Config & Runner
export const DEFAULT_AUTO_CONFIG: AutoNotificationConfig = {
  enabled: false,
  template: 'trending',
  targetPercent: 50,
  batchSize: 25,
  delayMs: 500,
  dailyHourUtc: 9,
};

export function getAutoNotificationConfig(): AutoNotificationConfig {
  ensureDataDir();
  if (fs.existsSync(AUTO_CONFIG_FILE)) {
    try {
      const raw = fs.readFileSync(AUTO_CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_AUTO_CONFIG, ...JSON.parse(raw) };
    } catch {}
  }
  return DEFAULT_AUTO_CONFIG;
}

export function saveAutoNotificationConfig(cfg: Partial<AutoNotificationConfig>): AutoNotificationConfig {
  ensureDataDir();
  const current = getAutoNotificationConfig();
  const updated = { ...current, ...cfg };
  fs.writeFileSync(AUTO_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function runDailyAutoNotification(force = false): Promise<{
  executed: boolean;
  reason?: string;
  result?: any;
}> {
  const config = getAutoNotificationConfig();
  if (!config.enabled && !force) {
    return { executed: false, reason: 'Automated daily notifications are disabled in admin settings.' };
  }

  const today = new Date().toISOString().split('T')[0];
  if (config.lastRunDate === today && !force) {
    return { executed: false, reason: `Already dispatched today (${today}). Set force=true to bypass.` };
  }

  const allSubs = await getAllSubscriptions();
  if (allSubs.length === 0) {
    return { executed: false, reason: 'No registered subscribers found to notify.' };
  }

  const targetCount = Math.max(1, Math.round((allSubs.length * (config.targetPercent || 50)) / 100));
  const shuffled = [...allSubs].sort(() => 0.5 - Math.random()).slice(0, targetCount);

  let title = '🔥 Active Communities Waiting For You!';
  let message = 'Discover today’s top verified group links & channels on GroupLinks.';
  let url = '/active24hours';

  if (config.template === 'custom' && config.customTitle && config.customBody) {
    title = config.customTitle;
    message = config.customBody;
  } else if (config.template === 'daily_champion') {
    title = '👑 Daily Community Leader';
    message = 'Check out today’s #1 top-ranked verified community on the 24H leaderboard!';
    url = '/active24hours';
  } else if (config.template === 'new_verified') {
    title = '✨ New Verified Groups Added';
    message = 'Fresh WhatsApp, Telegram & Discord groups have just been indexed and verified.';
    url = '/';
  }

  const res = await sendBatchedPushBroadcast({
    title,
    message,
    url,
    batchSize: config.batchSize || 25,
    delayMs: config.delayMs || 500,
    maxSubscribers: targetCount
  });

  saveAutoNotificationConfig({
    lastRunDate: today,
    lastRunCount: res.sentCount
  });

  return {
    executed: true,
    result: res
  };
}
