import { DEFAULT_RESTRICTED_KEYWORDS } from '@/src/utils/moderation';

interface GlobalKeywordsStore {
  nexusRestrictedKeywords?: string[];
}

const globalForKeywords = globalThis as unknown as GlobalKeywordsStore;

export function getRestrictedKeywords(): string[] {
  if (!globalForKeywords.nexusRestrictedKeywords || globalForKeywords.nexusRestrictedKeywords.length === 0) {
    globalForKeywords.nexusRestrictedKeywords = [...DEFAULT_RESTRICTED_KEYWORDS];
  }
  return globalForKeywords.nexusRestrictedKeywords;
}

export function addRestrictedKeyword(keyword: string): string[] {
  const clean = keyword.trim().toLowerCase();
  if (!clean) return getRestrictedKeywords();
  const current = getRestrictedKeywords();
  if (!current.includes(clean)) {
    globalForKeywords.nexusRestrictedKeywords = [...current, clean];
  }
  return globalForKeywords.nexusRestrictedKeywords!;
}

export function removeRestrictedKeyword(keyword: string): string[] {
  const clean = keyword.trim().toLowerCase();
  const current = getRestrictedKeywords();
  globalForKeywords.nexusRestrictedKeywords = current.filter(k => k !== clean);
  return globalForKeywords.nexusRestrictedKeywords;
}

export function setRestrictedKeywords(keywords: string[]): string[] {
  const sanitized = Array.from(
    new Set(
      keywords
        .map(k => String(k || '').trim().toLowerCase())
        .filter(k => k.length > 0)
    )
  );
  globalForKeywords.nexusRestrictedKeywords = sanitized.length > 0 ? sanitized : [...DEFAULT_RESTRICTED_KEYWORDS];
  return globalForKeywords.nexusRestrictedKeywords;
}

export function resetRestrictedKeywords(): string[] {
  globalForKeywords.nexusRestrictedKeywords = [...DEFAULT_RESTRICTED_KEYWORDS];
  return globalForKeywords.nexusRestrictedKeywords;
}
