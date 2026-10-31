import { DEFAULT_ADULT_KEYWORDS } from '@/src/utils/keywordFilter';
import { DEFAULT_RESTRICTED_KEYWORDS } from '@/src/utils/moderation';

export interface ContentSettings {
  hideAdultContent: boolean;
  substitutionCategory: string;
  allowUserGroupUpdates: boolean; // Master admin toggle to enable/disable user group updates
  userUpdateCooldownDays: number; // 7 days (1 update per week)
  updatedAt: string;
  updatedBy: string;
}



declare global {
  // eslint-disable-next-line no-var
  var __nexusContentSettings: ContentSettings | undefined;
}

function getDefaultSettings(): ContentSettings {
  return {
    hideAdultContent: false,
    substitutionCategory: 'Tech & Programming',
    allowUserGroupUpdates: true,
    userUpdateCooldownDays: 7,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  };
}

function isNodeRuntime(): boolean {
  return (
    typeof window === 'undefined' &&
    typeof process !== 'undefined' &&
    typeof process.cwd === 'function' &&
    Boolean(process.versions?.node)
  );
}

function ensureDataDir() {
  if (!isNodeRuntime()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const DATA_DIR = path.join(process.cwd(), '.data');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[CONTENT SETTINGS] Failed to create .data directory:', err);
  }
}

function loadSettingsFromDisk(): ContentSettings {
  if (!isNodeRuntime()) return getDefaultSettings();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const DATA_DIR = path.join(process.cwd(), '.data');
    const SETTINGS_FILE = path.join(DATA_DIR, 'nexus-content-settings.json');
    ensureDataDir();
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(getDefaultSettings(), null, 2), 'utf-8');
      return getDefaultSettings();
    }
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    if (!raw.trim()) return getDefaultSettings();
    const parsed = JSON.parse(raw);
    return {
      hideAdultContent: typeof parsed.hideAdultContent === 'boolean' ? parsed.hideAdultContent : getDefaultSettings().hideAdultContent,
      substitutionCategory: typeof parsed.substitutionCategory === 'string' ? parsed.substitutionCategory : getDefaultSettings().substitutionCategory,
      allowUserGroupUpdates: typeof parsed.allowUserGroupUpdates === 'boolean' ? parsed.allowUserGroupUpdates : getDefaultSettings().allowUserGroupUpdates,
      userUpdateCooldownDays: typeof parsed.userUpdateCooldownDays === 'number' && parsed.userUpdateCooldownDays > 0 ? parsed.userUpdateCooldownDays : getDefaultSettings().userUpdateCooldownDays,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      updatedBy: parsed.updatedBy || 'system',
    };
  } catch (err) {
    console.error('[CONTENT SETTINGS] Error reading settings from disk:', err);
    return getDefaultSettings();
  }
}

function saveSettingsToDisk(settings: ContentSettings): boolean {
  if (!isNodeRuntime()) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const DATA_DIR = path.join(process.cwd(), '.data');
    const SETTINGS_FILE = path.join(DATA_DIR, 'nexus-content-settings.json');
    ensureDataDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[CONTENT SETTINGS] Error saving settings to disk:', err);
    return false;
  }
}

/**
 * Returns current content settings with 0ms in-memory latency.
 */
export function getContentSettings(): ContentSettings {
  if (!globalThis.__nexusContentSettings) {
    globalThis.__nexusContentSettings = loadSettingsFromDisk();
  }
  return globalThis.__nexusContentSettings;
}

/**
 * Updates content settings and persists immediately to disk.
 */
export function updateContentSettings(partial: Partial<ContentSettings>): ContentSettings {
  const current = getContentSettings();
  const updated: ContentSettings = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  globalThis.__nexusContentSettings = updated;
  saveSettingsToDisk(updated);
  return updated;
}

/**
 * Convenience getter for adult content hidden state (AdSense Safe Mode).
 */
export function isAdultContentHidden(): boolean {
  return getContentSettings().hideAdultContent;
}

/**
 * Convenience setter for adult content hidden state.
 */
export function setAdultContentHidden(hidden: boolean, updatedBy = 'admin'): boolean {
  updateContentSettings({
    hideAdultContent: hidden,
    updatedBy,
  });
  return hidden;
}

/**
 * Checks whether user/visitor community updates are globally permitted.
 */
export function isUserGroupUpdatesAllowed(): boolean {
  return getContentSettings().allowUserGroupUpdates;
}

/**
 * Convenience setter for global user/visitor community updates allowed state.
 */
export function setUserGroupUpdatesAllowed(allowed: boolean, updatedBy = 'admin'): boolean {
  updateContentSettings({
    allowUserGroupUpdates: allowed,
    updatedBy,
  });
  return allowed;
}

/**
 * Returns the cooldown duration in days (default: 7 days, 1 update per week).
 */
export function getUserUpdateCooldownDays(): number {
  return getContentSettings().userUpdateCooldownDays || 7;
}

/**
 * Returns the cooldown duration in milliseconds (default: 7 * 24 * 60 * 60 * 1000 = 604,800,000 ms).
 */
export function getUserUpdateCooldownMs(): number {
  const days = getUserUpdateCooldownDays();
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Set of normalized adult keyword tokens for fast O(1) matching.
 */
const ADULT_KEYWORD_SET = new Set<string>([
  ...DEFAULT_ADULT_KEYWORDS.map(k => k.trim().toLowerCase()),
  ...DEFAULT_RESTRICTED_KEYWORDS.map(k => k.trim().toLowerCase()),
  'adult',
  '18+',
  '18plus',
  'nsfw',
  'xxx',
  'porn',
  'porno',
  'hentai',
  'erotic',
  'sex',
  'sexy',
  'nude',
  'nudes',
  'onlyfans',
  'fansly',
  'camgirl',
  'escort',
  'boobs',
  'milf',
  'hookup',
  'naked',
  'playboy',
  'mature',
]);

/**
 * Checks whether a word, tag, or phrase is related to adult content.
 */
export function isAdultKeywordOrTag(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase().replace(/^[#@]+/, '').trim();
  if (ADULT_KEYWORD_SET.has(clean)) return true;

  for (const kw of ADULT_KEYWORD_SET) {
    if (kw.length >= 3 && clean.includes(kw)) {
      return true;
    }
  }

  if (/\b(18\+|18plus|nsfw|xxx|porn|erotic|sex|sexy|nude|nudes|onlyfans|fansly|hentai|milf|camgirl|hookup)\b/i.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Filters out any adult-related keywords or tags from a list.
 */
export function filterAdultKeywords(keywords: string[]): string[] {
  if (!Array.isArray(keywords)) return [];
  return keywords.filter(k => !isAdultKeywordOrTag(k));
}
