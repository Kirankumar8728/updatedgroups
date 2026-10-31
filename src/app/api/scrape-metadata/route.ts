import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/src/lib/rate-limit';
import { requireAdmin } from '@/src/lib/admin-auth';
import { scrapeGroupMetadataDirect, normalizePlatformUrl, isSafePublicUrl } from '@/src/lib/metadata-scraper';
import { uploadImageToR2, isR2Configured } from '@/src/lib/r2-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'CDN-Cache-Control': 'no-store',
  'Surrogate-Control': 'no-store',
  'Cloudflare-CDN-Cache-Control': 'no-store',
};

export async function POST(req: NextRequest) {
  try {
    const adminCheck = requireAdmin(req);
    if (!adminCheck.authorized) {
      const rateLimit = checkRateLimit(req, { limit: 120, windowMs: 60 * 1000, route: 'scrape-metadata' });
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded for metadata scraping. Please try again in a moment.',
            retryAfterSeconds: rateLimit.retryAfterSeconds,
          },
          { status: 429, headers: NO_CACHE_HEADERS }
        );
      }
    }

    const { url, platform: requestedPlatform } = await req.json().catch(() => ({}));
    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const norm = normalizePlatformUrl(url.trim());
    const targetUrl = norm.normalizedUrl;

    if (!isSafePublicUrl(targetUrl)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or restricted target URL. Only public HTTP/HTTPS URLs can be scraped.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const detectedPlatform = requestedPlatform || norm.platform;
    if (
      detectedPlatform === 'facebook' ||
      detectedPlatform === 'signal' ||
      detectedPlatform === 'snapchat' ||
      detectedPlatform === 'instagram' ||
      /facebook\.com|fb\.me|fb\.com|signal\.group|signal\.me|snapchat\.com|instagram\.com|ig\.me/i.test(targetUrl)
    ) {
      return NextResponse.json(
        {
          success: false,
          disabled: true,
          error: `Auto-fetch is disabled for ${detectedPlatform.toUpperCase()} links. Please enter community details manually.`,
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const result = await scrapeGroupMetadataDirect(url.trim(), detectedPlatform);

    // Cache image locally / R2 in background, preserving live direct URL for resilience
    const isAdult = result?.suggestedCategory === 'Adult / 18+' || result?.isNsfw;
    const livePlatformUrl = result?.imageUrl;

    if (result && result.imageUrl && !result.imageUrl.startsWith('data:image/') && !result.imageUrl.includes('local-server')) {
      try {
        const r2Res = await uploadImageToR2(result.imageUrl, result.title || 'group-icon', undefined, detectedPlatform, isAdult);
        if (r2Res.success && r2Res.r2Url) {
          (result as any).cachedImageUrl = r2Res.r2Url;
          (result as any).localImageUrl = r2Res.r2Url;
          // If R2 CDN is configured, use CDN. Otherwise, prioritize resilient live platform URL
          if (r2Res.r2Url.startsWith('https://cdn.grouplinks.app') || !livePlatformUrl || !livePlatformUrl.startsWith('http')) {
            result.imageUrl = r2Res.r2Url;
          } else {
            result.imageUrl = livePlatformUrl;
          }
        }
      } catch (r2Err) {
        console.warn('[ScrapeMetadata API] Upload notice:', r2Err);
      }
    }

    return NextResponse.json(result, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Scraping failed' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
