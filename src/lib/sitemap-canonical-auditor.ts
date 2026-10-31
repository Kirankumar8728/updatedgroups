import { getSiteUrl } from '@/src/lib/rank';
import { getActiveGroupsForSitemapChunk } from '@/src/lib/groups-dal';
import {
  CATEGORIES,
  REGIONS,
  LANGUAGES,
  categoryToSlug,
  countryToSlug,
  languageToSlug,
  getGroupUrlPath,
} from '@/src/utils/helpers';

export interface CanonicalIssue {
  url: string;
  issueType:
    | 'trailing_slash'
    | 'protocol_mismatch'
    | 'host_mismatch'
    | 'duplicate_url'
    | 'query_param_leak'
    | 'hash_fragment'
    | 'invalid_route_prefix'
    | 'crawling_budget_waste'
    | 'expired_community_in_sitemap'
    | 'non_canonical_prefix'
    | 'malformed_url_syntax';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestedFixUrl: string;
  indexingPatternNote: string;
}

export interface SitemapCanonicalAuditResult {
  timestamp: string;
  totalUrlsAudited: number;
  validUrlsCount: number;
  errorCount: number;
  warningCount: number;
  canonicalHealthScore: number; // Percentage 0 - 100
  issues: CanonicalIssue[];
  suggestedFixes: Array<{
    originalUrl: string;
    recommendedCanonicalUrl: string;
    reason: string;
  }>;
  summary: {
    cleanUrlsPercent: number;
    duplicateUrlsFound: number;
    trailingSlashFixes: number;
    protocolFixes: number;
  };
}

let cachedAuditReport: SitemapCanonicalAuditResult | null = null;
let auditIntervalTimer: NodeJS.Timeout | null = null;

/**
 * Audits all sitemap entries and canonical URLs against real-world
 * Google Search Console & Bing Webmaster indexing best practices.
 * Identifies trailing slashes, protocol mismatches, duplicate entries,
 * query string leaks, and hash fragments, suggesting 100% compliant fixes.
 */
export async function auditSitemapCanonicalLinks(): Promise<SitemapCanonicalAuditResult> {
  const canonicalBase = getSiteUrl().replace(/\/+$/, ''); // e.g. "https://grouplinks.app"
  let expectedHost = 'grouplinks.app';
  let expectedProtocol = 'https:';

  try {
    const parsedBase = new URL(canonicalBase);
    expectedHost = parsedBase.hostname;
    expectedProtocol = parsedBase.protocol;
  } catch {}

  const issues: CanonicalIssue[] = [];
  const suggestedFixes: Array<{ originalUrl: string; recommendedCanonicalUrl: string; reason: string }> = [];
  const seenUrls = new Map<string, number>();

  let totalUrls = 0;
  let errorCount = 0;
  let warningCount = 0;
  let trailingSlashFixes = 0;
  let protocolFixes = 0;
  let duplicateUrlsFound = 0;

  // 1. Gather URLs to audit
  const urlsToAudit: Array<{ url: string; lastmod?: string; isGroup?: boolean }> = [];

  // Core Static Gateways
  const staticPaths = [
    '/',
    '/whatsapp-groups',
    '/telegram-channels',
    '/telegram-groups',
    '/discord-servers',
    '/discord-groups',
    '/facebook-groups',
    '/signal-groups',
    '/reddit-communities',
    '/snapchat-groups',
    '/active24hours',
    '/categories',
    '/countries',
    '/languages',
    '/leaderboard',
    '/direct-promoted-groups',
    '/submit',
    '/about',
    '/guidelines',
    '/privacy',
    '/terms',
  ];

  for (const p of staticPaths) {
    urlsToAudit.push({ url: `${canonicalBase}${p === '/' ? '' : p}` });
  }

  // Categories
  for (const cat of CATEGORIES) {
    urlsToAudit.push({ url: `${canonicalBase}/category/${categoryToSlug(cat)}` });
  }

  // Countries
  for (const reg of REGIONS) {
    urlsToAudit.push({ url: `${canonicalBase}/country/${countryToSlug(reg)}` });
  }

  // Languages
  for (const lang of LANGUAGES) {
    urlsToAudit.push({ url: `${canonicalBase}/language/${languageToSlug(lang)}` });
  }

  // Active Groups
  try {
    const groups = await getActiveGroupsForSitemapChunk(0, 10000);
    for (const g of groups) {
      const canonicalPath = getGroupUrlPath(g as any);
      urlsToAudit.push({
        url: `${canonicalBase}${canonicalPath}`,
        lastmod: g.updatedAt || g.publishedAt || g.createdAt,
        isGroup: true,
      });
    }
  } catch {}

  totalUrls = urlsToAudit.length;

  // 2. Perform granular inspection on each URL
  for (const item of urlsToAudit) {
    const rawUrl = item.url;
    let cleanUrl = rawUrl;

    // Check 1: Duplicate URL Detection
    const previousCount = seenUrls.get(rawUrl) || 0;
    seenUrls.set(rawUrl, previousCount + 1);
    if (previousCount > 0) {
      duplicateUrlsFound++;
      errorCount++;
      issues.push({
        url: rawUrl,
        issueType: 'duplicate_url',
        severity: 'error',
        message: 'Duplicate URL found in sitemap. Google Search Console penalizes duplicate sitemap entries.',
        suggestedFixUrl: rawUrl,
        indexingPatternNote: 'Googlebot de-prioritizes sitemaps containing redundant entries.',
      });
    }

    // Check 2: Trailing Slash & Syntax Inspection
    try {
      const parsed = new URL(rawUrl);
      if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
        trailingSlashFixes++;
        warningCount++;
        const fixedPath = parsed.pathname.replace(/\/+$/, '');
        cleanUrl = `${parsed.origin}${fixedPath}${parsed.search}`;
        issues.push({
          url: rawUrl,
          issueType: 'trailing_slash',
          severity: 'warning',
          message: 'URL contains trailing slash. Non-trailing slash is the canonical standard for this directory.',
          suggestedFixUrl: cleanUrl,
          indexingPatternNote: 'Search engines treat trailing and non-trailing slash URLs as distinct entities, risking duplicate content penalty.',
        });
        suggestedFixes.push({
          originalUrl: rawUrl,
          recommendedCanonicalUrl: cleanUrl,
          reason: 'Remove trailing slash to align with global canonical URL structure.',
        });
      }

      // Check 3: Protocol & Host Consistency
      if (parsed.protocol !== expectedProtocol) {
        protocolFixes++;
        errorCount++;
        const fixedUrl = rawUrl.replace(/^http:/i, 'https:');
        issues.push({
          url: rawUrl,
          issueType: 'protocol_mismatch',
          severity: 'error',
          message: `Protocol "${parsed.protocol}" does not match canonical SSL "${expectedProtocol}".`,
          suggestedFixUrl: fixedUrl,
          indexingPatternNote: 'Google strictly mandates HTTPS for indexed sitemaps in modern search results.',
        });
        suggestedFixes.push({
          originalUrl: rawUrl,
          recommendedCanonicalUrl: fixedUrl,
          reason: 'Enforce HTTPS protocol for search engine trust.',
        });
      }

      if (parsed.hostname !== expectedHost) {
        errorCount++;
        const fixedUrl = `${canonicalBase}${parsed.pathname}${parsed.search}`;
        issues.push({
          url: rawUrl,
          issueType: 'host_mismatch',
          severity: 'error',
          message: `Hostname "${parsed.hostname}" does not match canonical host "${expectedHost}".`,
          suggestedFixUrl: fixedUrl,
          indexingPatternNote: 'Cross-domain or subdomain URLs in sitemaps trigger domain validation warnings in Google Search Console.',
        });
      }

      // Check 4: Query Parameters & Hash Fragment Leakage
      if (parsed.search) {
        warningCount++;
        const fixedUrl = `${parsed.origin}${parsed.pathname}`;
        issues.push({
          url: rawUrl,
          issueType: 'query_param_leak',
          severity: 'warning',
          message: 'Sitemap URL contains query parameters. Clean canonical URLs should omit tracking/filter params.',
          suggestedFixUrl: fixedUrl,
          indexingPatternNote: 'Search bots prefer static clean URLs over parameterized URLs for indexation.',
        });
        suggestedFixes.push({
          originalUrl: rawUrl,
          recommendedCanonicalUrl: fixedUrl,
          reason: 'Strip query string from sitemap entry to pass indexing checks.',
        });
      }

      if (parsed.hash) {
        errorCount++;
        const fixedUrl = `${parsed.origin}${parsed.pathname}${parsed.search}`;
        issues.push({
          url: rawUrl,
          issueType: 'hash_fragment',
          severity: 'error',
          message: 'Sitemap URL contains hash fragment. Fragments (#) are ignored by search crawlers.',
          suggestedFixUrl: fixedUrl,
          indexingPatternNote: 'Googlebot strips hash fragments before crawling; including them causes crawl errors.',
        });
      }

      // Check 5: Route Prefix Validation
      if (item.isGroup) {
        const validPrefixes = ['/group/', '/server/', '/community/', '/bot/'];
        const isValidPrefix = validPrefixes.some((pref) => parsed.pathname.startsWith(pref));
        if (!isValidPrefix) {
          warningCount++;
          issues.push({
            url: rawUrl,
            issueType: 'invalid_route_prefix',
            severity: 'warning',
            message: 'Group URL uses non-standard route prefix.',
            suggestedFixUrl: rawUrl,
            indexingPatternNote: 'Group routes should strictly follow /group/, /server/, /community/, or /bot/.',
          });
        }
      }
    } catch (e: any) {
      errorCount++;
      issues.push({
        url: rawUrl,
        issueType: 'non_canonical_prefix',
        severity: 'error',
        message: `Failed to parse URL syntax: ${e.message}`,
        suggestedFixUrl: canonicalBase,
        indexingPatternNote: 'Malformed URLs in XML sitemaps break XML parsing in Bing & Google.',
      });
    }
  }

  const validUrlsCount = Math.max(0, totalUrls - errorCount - warningCount);
  const healthScore = totalUrls > 0 ? Math.round((validUrlsCount / totalUrls) * 100) : 100;

  const result: SitemapCanonicalAuditResult = {
    timestamp: new Date().toISOString(),
    totalUrlsAudited: totalUrls,
    validUrlsCount,
    errorCount,
    warningCount,
    canonicalHealthScore: healthScore,
    issues,
    suggestedFixes,
    summary: {
      cleanUrlsPercent: healthScore,
      duplicateUrlsFound,
      trailingSlashFixes,
      protocolFixes,
    },
  };

  cachedAuditReport = result;
  return result;
}

/**
 * Starts periodic background inspection of sitemap and canonical URLs.
 * Default interval: 6 hours (21,600,000 ms)
 */
export function startPeriodicSitemapAudit(intervalMs: number = 6 * 60 * 60 * 1000): void {
  if (auditIntervalTimer) {
    clearInterval(auditIntervalTimer);
  }

  // Initial immediate background check after server startup
  setTimeout(() => {
    auditSitemapCanonicalLinks().catch(() => {});
  }, 5000);

  // Periodic recurring timer
  auditIntervalTimer = setInterval(() => {
    auditSitemapCanonicalLinks().catch(() => {});
  }, intervalMs);
}

/**
 * Returns the most recent cached sitemap audit report.
 */
export function getLatestSitemapAuditReport(): SitemapCanonicalAuditResult | null {
  return cachedAuditReport;
}
