import { NextRequest, NextResponse } from 'next/server';
import { scrapeGroupMetadataDirect, normalizePlatformUrl, isSafePublicUrl } from '@/src/lib/metadata-scraper';
import { createGroup, updateGroup, getGroupBySlug, getGroups } from '@/src/lib/groups-dal';
import { requireAdmin } from '@/src/lib/admin-auth';
import { checkRateLimit, rateLimitResponse } from '@/src/lib/rate-limit';
import { generateSlug, calculateRankScore, calculateRankGrade } from '@/src/utils/helpers';
import { Group } from '@/src/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(req: NextRequest) {
  try {
    const adminAuth = requireAdmin(req);
    if (!adminAuth.authorized) {
      const rateLimit = checkRateLimit(req, { limit: 10, windowMs: 60 * 1000, route: 'admin-scrape-instagram' });
      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.retryAfterSeconds, 'Rate limit exceeded for Instagram scraper.');
      }
    }

    const body = await req.json().catch(() => ({}));
    const rawUrls: string[] = Array.isArray(body.urls) 
      ? body.urls 
      : (typeof body.url === 'string' && body.url.trim() ? [body.url.trim()] : []);

    if (rawUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide at least one Instagram group or broadcast channel URL in "urls" or "url".' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const results: Array<{
      url: string;
      success: boolean;
      group?: Group;
      error?: string;
    }> = [];

    for (const rawUrl of rawUrls.slice(0, 20)) { // Limit to 20 links per batch
      try {
        const norm = normalizePlatformUrl(rawUrl);
        const targetUrl = norm.normalizedUrl;

        if (!isSafePublicUrl(targetUrl)) {
          results.push({ url: rawUrl, success: false, error: 'Unsafe or invalid target URL.' });
          continue;
        }

        const metadata = await scrapeGroupMetadataDirect(targetUrl, 'instagram');
        const title = metadata.title || 'Instagram Community';
        const description = metadata.description || `Active Instagram community for ${title}.`;
        const slug = generateSlug(title);
        const rankScore = calculateRankScore(title, description, ['#instagram', '#broadcastchannel', '#community']);
        const rankGrade = calculateRankGrade(rankScore);

        const groupPayload: Omit<Group, 'id' | 'createdAt' | 'upvotes' | 'bookmarks' | 'reports'> = {
          title,
          slug,
          description,
          url: targetUrl,
          platform: 'instagram',
          category: body.category || 'Business & Startups',
          language: body.language || 'English',
          region: body.region || 'Global',
          customTags: ['#instagram', '#broadcastchannel', '#community'],
          imageUrl: metadata.imageUrl || '',
          bannerUrl: metadata.bannerUrl || metadata.imageUrl || '',
          memberCount: metadata.memberCount || 250,
          growthRate: 15.5,
          clicks: 0,
          shares: 0,
          rating: 5.0,
          ratingCount: 1,
          verified: true,
          featured: true,
          isNsfw: false,
          safetyScore: 98,
          rankScore,
          rankGrade,
          rankKeywords: ['instagram group', title.toLowerCase(), 'broadcast channel'],
          authorName: 'Instagram Scraper Bot',
          publishedAt: new Date().toISOString(),
          lastActive: 'Just now',
          rulesSummary: 'Respect community members. Keep discussions on topic.',
        };

        const created = await createGroup(groupPayload as any);
        results.push({ url: targetUrl, success: true, group: created });
      } catch (scErr: any) {
        results.push({ url: rawUrl, success: false, error: scErr?.message || 'Failed to scrape Instagram link' });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      successfulCount: results.filter(r => r.success).length,
      results,
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Instagram batch scraper failed' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
