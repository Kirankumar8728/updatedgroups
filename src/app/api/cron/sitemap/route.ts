import { NextRequest, NextResponse } from 'next/server';
import { getSiteUrl } from '@/src/lib/rank';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/sitemap
 * 
 * Automation endpoint to trigger sitemap ping to search engines:
 * - Pings Google Search Console sitemap webhook
 * - Pings Bing Webmaster Tools
 * - Returns execution status and timestamp
 */
export async function GET(req: NextRequest) {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const results: Record<string, string> = {};

  // 1. Ping Google Webmaster Tools
  try {
    const googleRes = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, {
      signal: AbortSignal.timeout(4000),
    });
    results.google = `HTTP ${googleRes.status}`;
  } catch (err: any) {
    results.google = `Failed: ${err?.message || 'timeout'}`;
  }

  // 2. Ping Bing Webmaster Tools
  try {
    const bingRes = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, {
      signal: AbortSignal.timeout(4000),
    });
    results.bing = `HTTP ${bingRes.status}`;
  } catch (err: any) {
    results.bing = `Failed: ${err?.message || 'timeout'}`;
  }

  return NextResponse.json({
    success: true,
    sitemapUrl,
    timestamp: new Date().toISOString(),
    pingResults: results,
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
