/**
 * Moderation and Restricted Keywords Safety Engine
 * Handles Zero-Tolerance Restricted Keywords (e.g., "Child porn", CSAM, etc.)
 * for Comments, Group Submissions, and Admin Custom Restrictions,
 * as well as Privacy Email Masking (e.g., kirankumar8728@gmail.com -> kirxxxx28@gmail.com).
 */

export const DEFAULT_RESTRICTED_KEYWORDS: string[] = [
  'child porn',
  'childporn',
  'child pornography',
  'csam',
  'pedophile',
  'pedophilia',
  'paedophile',
  'paedophilia',
  'child abuse',
  'child sexual',
  'underage sex',
  'underage porn',
  'minor sex',
  'teen porn 18',
  'jailbait',
  'child exploitation',
  'kiddie porn',
  'pedo',
];

const RESTRICTED_STORAGE_KEY = 'nexus_restricted_keywords';

/**
 * Masks an email address for public display.
 * Example: kirankumar8728@gmail.com -> kirxxxx28@gmail.com
 * Example: user@example.com -> usexxxxer@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '';
  const trimmed = email.trim();
  const [username, domain] = trimmed.split('@');
  if (!username || !domain) return trimmed;

  if (username.length <= 4) {
    return `${username.slice(0, 1)}xxxx${username.slice(-1)}@${domain}`;
  }

  const prefix = username.slice(0, 3);
  const suffix = username.slice(-2);
  return `${prefix}xxxx${suffix}@${domain}`;
}

/**
 * Normalizes text to detect obfuscated words (leetspeak, zero-width spaces, special characters)
 */
export function normalizeRestrictedText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width chars
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[+*#\-_/\\.,:;]/g, ' ') // treat separators as space for phrase matching
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retrieves custom restricted keywords stored in local storage
 */
export function getCustomRestrictedKeywords(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RESTRICTED_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load custom restricted keywords:', err);
  }
  return [];
}

/**
 * Saves custom restricted keywords
 */
export function saveCustomRestrictedKeywords(keywords: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = Array.from(new Set(keywords.map(k => k.trim().toLowerCase()).filter(Boolean)));
    localStorage.setItem(RESTRICTED_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (err) {
    console.warn('Failed to save custom restricted keywords:', err);
  }
}

/**
 * Gets all active restricted keywords (default zero-tolerance + custom)
 */
export function getAllRestrictedKeywords(additional: string[] = []): string[] {
  const custom = getCustomRestrictedKeywords();
  const combined = [...DEFAULT_RESTRICTED_KEYWORDS, ...custom, ...additional];
  return Array.from(new Set(combined.map(k => k.trim().toLowerCase()).filter(Boolean)));
}

/**
 * Adds a new restricted keyword
 */
export function addRestrictedKeyword(keyword: string): string[] {
  const clean = keyword.trim().toLowerCase();
  if (!clean) return getAllRestrictedKeywords();
  const current = getCustomRestrictedKeywords();
  if (!current.includes(clean)) {
    const updated = [...current, clean];
    saveCustomRestrictedKeywords(updated);
    return getAllRestrictedKeywords();
  }
  return getAllRestrictedKeywords();
}

/**
 * Removes a custom restricted keyword
 */
export function removeRestrictedKeyword(keyword: string): string[] {
  const clean = keyword.trim().toLowerCase();
  const current = getCustomRestrictedKeywords();
  const updated = current.filter(k => k !== clean);
  saveCustomRestrictedKeywords(updated);
  return getAllRestrictedKeywords();
}

/**
 * Resets custom restricted keywords
 */
export function resetRestrictedKeywords(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RESTRICTED_STORAGE_KEY);
}

export interface RestrictedCheckResult {
  isRestricted: boolean;
  matchedKeyword?: string;
  matchedField?: string;
  errorMessage?: string;
}

/**
 * Checks whether text contains any prohibited or restricted keyword.
 * Returns true if text matches any prohibited word like "child porn", etc.
 */
export function checkIsRestrictedText(
  text: string, 
  customList?: string[]
): RestrictedCheckResult {
  if (!text) return { isRestricted: false };

  const rawLower = text.toLowerCase();
  const normalized = normalizeRestrictedText(text);
  const keywords = customList && customList.length > 0 
    ? customList 
    : getAllRestrictedKeywords();

  for (const kw of keywords) {
    if (!kw) continue;
    const kwLower = kw.toLowerCase().trim();
    const kwNormalized = normalizeRestrictedText(kw);

    // 1. Direct substring match on phrase
    if (rawLower.includes(kwLower) || normalized.includes(kwNormalized)) {
      return {
        isRestricted: true,
        matchedKeyword: kw,
        errorMessage: `Content contains strictly prohibited/restricted term "${kw}". This action is blocked.`
      };
    }

    // 2. Word boundary match
    try {
      const escaped = kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
      if (regex.test(rawLower) || regex.test(normalized)) {
        return {
          isRestricted: true,
          matchedKeyword: kw,
          errorMessage: `Content contains strictly prohibited/restricted term "${kw}". This action is blocked.`
        };
      }
    } catch {
      // ignore regex syntax issues and continue
    }
  }

  return { isRestricted: false };
}

/**
 * Checks a group's submission fields against restricted keywords
 */
export function checkGroupRestrictedContent(group: {
  title?: string;
  description?: string;
  url?: string;
  customTags?: string[];
  rulesSummary?: string;
}, customList?: string[]): RestrictedCheckResult {
  if (group.title) {
    const res = checkIsRestrictedText(group.title, customList);
    if (res.isRestricted) {
      return { ...res, matchedField: 'title' };
    }
  }

  if (group.description) {
    const res = checkIsRestrictedText(group.description, customList);
    if (res.isRestricted) {
      return { ...res, matchedField: 'description' };
    }
  }

  if (group.customTags && group.customTags.length > 0) {
    const tagsText = group.customTags.join(' ');
    const res = checkIsRestrictedText(tagsText, customList);
    if (res.isRestricted) {
      return { ...res, matchedField: 'customTags' };
    }
  }

  if (group.rulesSummary) {
    const res = checkIsRestrictedText(group.rulesSummary, customList);
    if (res.isRestricted) {
      return { ...res, matchedField: 'rulesSummary' };
    }
  }

  if (group.url) {
    const res = checkIsRestrictedText(group.url, customList);
    if (res.isRestricted) {
      return { ...res, matchedField: 'url' };
    }
  }

  return { isRestricted: false };
}
