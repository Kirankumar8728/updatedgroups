/**
 * Customized Keyword Auto-Filtering Engine
 * Intelligent multi-pattern matching with word-boundary checks, leetspeak normalization,
 * and customizable keyword management.
 */

export const DEFAULT_ADULT_KEYWORDS: string[] = [
  '18+',
  '18plus',
  'adult',
  'adults only',
  'xxx',
  'porn',
  'porno',
  'pornography',
  'hentai',
  'erotic',
  'erotica',
  'sex',
  'sexy',
  'nsfw',
  'nude',
  'nudes',
  'nudity',
  'onlyfans',
  'fansly',
  'camgirl',
  'camgirls',
  'webcam 18+',
  'escort',
  'escorts',
  'fetish',
  'bdsm',
  'leaks 18+',
  'boobs',
  'milf',
  'swinger',
  'swingers',
  'hookup',
  'hookups',
  'mature 18+',
  'stripper',
  'stripclub',
  'sensual',
  'naked',
  'playboy'
];

const STORAGE_KEY = 'nexus_custom_auto_filter_keywords';
const SETTINGS_KEY = 'nexus_auto_filter_enabled';

/**
 * Normalizes text by removing common evasion characters (zero-width spaces, special separators, basic leetspeak)
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width chars
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e');
}

/**
 * Retrieves custom user keywords stored in local storage
 */
export function getCustomKeywords(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load custom keywords from storage:', err);
  }
  return [];
}

export const getStoredKeywords = getCustomKeywords;

/**
 * Saves custom keywords to local storage
 */
export function saveCustomKeywords(keywords: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = Array.from(new Set(keywords.map(k => k.trim().toLowerCase()).filter(Boolean)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch (err) {
    console.warn('Failed to save custom keywords:', err);
  }
}

export const saveStoredKeywords = saveCustomKeywords;

/**
 * Gets all active auto-filtering keywords (built-in defaults + user customized)
 */
export function getAllActiveKeywords(additionalKeywords: string[] = []): string[] {
  const custom = getCustomKeywords();
  const combined = [...DEFAULT_ADULT_KEYWORDS, ...custom, ...additionalKeywords];
  return Array.from(new Set(combined.map(k => k.trim().toLowerCase()).filter(Boolean)));
}

/**
 * Adds a new custom keyword to the filter list
 */
export function addCustomKeyword(keyword: string): string[] {
  const clean = keyword.trim().toLowerCase();
  if (!clean) return getCustomKeywords();
  const current = getCustomKeywords();
  if (!current.includes(clean)) {
    const updated = [...current, clean];
    saveCustomKeywords(updated);
    return updated;
  }
  return current;
}

/**
 * Removes a custom keyword
 */
export function removeCustomKeyword(keyword: string): string[] {
  const clean = keyword.trim().toLowerCase();
  const current = getCustomKeywords();
  const updated = current.filter(k => k !== clean);
  saveCustomKeywords(updated);
  return updated;
}

/**
 * Resets custom keywords to initial state
 */
export function resetCustomKeywords(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if the auto-filter is globally enabled
 */
export function isAutoFilterEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(SETTINGS_KEY);
  return val === null ? true : val === 'true';
}

/**
 * Set auto-filter enabled status
 */
export function setAutoFilterEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, String(enabled));
}

/**
 * Matches a keyword against a text string using whole-word boundaries or special character detection
 */
function matchesKeyword(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;
  const cleanText = text.toLowerCase();
  const cleanKeyword = keyword.toLowerCase();

  // If keyword contains special characters like '+', '#', or whitespace, use literal matching
  if (/[+*#\s\-_]/.test(cleanKeyword)) {
    if (cleanText.includes(cleanKeyword)) return true;
  }

  // Regex whole-word boundary matching to prevent false positives (e.g., 'essex' matching 'sex')
  try {
    const escaped = cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    if (regex.test(cleanText)) return true;
  } catch {
    if (cleanText.includes(cleanKeyword)) return true;
  }

  // Check normalized leetspeak version
  const normalized = normalizeText(cleanText);
  if (/[+*#\s\-_]/.test(cleanKeyword) && normalized.includes(cleanKeyword)) {
    return true;
  }

  return false;
}

export interface AnalysisResult {
  isAdult: boolean;
  matchedKeywords: string[];
  severity: 'nsfw' | 'clean';
  matchedFields: string[];
}

/**
 * Core Auto-Filtering Analysis Engine
 * Analyzes group title, description, tags, URL, and rules against customized keyword filters.
 */
export function analyzeGroupContent(
  content: {
    title?: string;
    description?: string;
    customTags?: string[];
    url?: string;
    rulesSummary?: string;
    category?: string;
    isNsfw?: boolean;
  },
  customKeywordsList?: string[]
): AnalysisResult {
  const matchedKeywords: string[] = [];
  const matchedFields: string[] = [];

  // If already flagged
  if (content.isNsfw || content.category === 'Adult / 18+') {
    return {
      isAdult: true,
      matchedKeywords: ['Explicit Adult / 18+ Category'],
      severity: 'nsfw',
      matchedFields: ['category']
    };
  }

  const keywords = customKeywordsList && customKeywordsList.length > 0
    ? customKeywordsList
    : getAllActiveKeywords();

  const title = content.title || '';
  const desc = content.description || '';
  const tagsStr = (content.customTags || []).join(' ');
  const url = content.url || '';
  const rules = content.rulesSummary || '';

  for (const keyword of keywords) {
    if (!keyword) continue;

    let matched = false;

    if (matchesKeyword(title, keyword)) {
      matched = true;
      if (!matchedFields.includes('title')) matchedFields.push('title');
    }
    if (matchesKeyword(desc, keyword)) {
      matched = true;
      if (!matchedFields.includes('description')) matchedFields.push('description');
    }
    if (matchesKeyword(tagsStr, keyword)) {
      matched = true;
      if (!matchedFields.includes('tags')) matchedFields.push('tags');
    }
    if (matchesKeyword(url, keyword)) {
      matched = true;
      if (!matchedFields.includes('url')) matchedFields.push('url');
    }
    if (matchesKeyword(rules, keyword)) {
      matched = true;
      if (!matchedFields.includes('rules')) matchedFields.push('rules');
    }

    if (matched && !matchedKeywords.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  }

  const isAdult = matchedKeywords.length > 0;

  return {
    isAdult,
    matchedKeywords,
    severity: isAdult ? 'nsfw' : 'clean',
    matchedFields
  };
}

/**
 * Simple helper to check whether a text snippet contains any adult/banned keyword
 */
export function containsAdultKeyword(text: string, customKeywordsList?: string[]): boolean {
  if (!text) return false;
  return analyzeGroupContent({ title: text, description: text }, customKeywordsList).isAdult;
}

/**
 * Client-safe helper to detect whether a single tag or keyword contains adult terms.
 */
export function isAdultTagOrKeyword(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase().replace(/^[#@]+/, '').trim();
  return containsAdultKeyword(clean);
}
