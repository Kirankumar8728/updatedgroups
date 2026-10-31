import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import {
  detectPlatformFromUrl,
  extractCanonicalGroupIdentifier,
  extractUrlsFromText,
  generateSlug,
} from '@/src/utils/helpers';
import { analyzeGroupContent } from '@/src/utils/keywordFilter';
import { scrapeGroupMetadataDirect } from '@/src/lib/metadata-scraper';
import { revalidatePath, revalidateTag } from 'next/cache';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';
import { verifySameOrigin } from '@/src/lib/security';
import { getPool } from '@/src/lib/db';
import { batchUpsertGroups } from '@/src/lib/groups-dal';
import { uploadImageToR2 } from '@/src/lib/r2-storage';
import { getCategoryFallbackImage } from '@/src/utils/categoryImages';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max execution time for bulk crawl

/**
 * Concurrency helper to run tasks in parallel with a bounded worker pool
 */
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (err: any) {
        results[idx] = { success: false, error: err.message || 'Worker error' } as any;
      }
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(pool);
  return results;
}

export async function POST(req: NextRequest) {
  const originCheck = verifySameOrigin(req);
  if (!originCheck.valid) {
    return originCheck.response!;
  }

  try {
    const auth = await resolveAuthContext(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin session required.' },
        { status: 401, headers: REALTIME_NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const {
      text,
      defaultCategory = 'General',
      defaultLanguage = 'English',
      defaultRegion = 'Global',
      defaultTags = [],
      autoScrapeMetadata = true,
      markVerified = false,
      concurrency = 5,
    } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Input text containing links is required.' },
        { status: 400, headers: REALTIME_NO_CACHE_HEADERS }
      );
    }

    // 1. Extract valid community URLs using high-precision regex
    const urls = extractUrlsFromText(text);

    if (urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid WhatsApp, Telegram, Discord, Signal, Facebook, or Reddit links found in the text.' },
        { status: 400, headers: REALTIME_NO_CACHE_HEADERS }
      );
    }

    if (urls.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Batch import limit exceeded. Maximum 500 URLs per import.' },
        { status: 400, headers: REALTIME_NO_CACHE_HEADERS }
      );
    }

    // 2. Fetch existing URLs from MySQL database to quickly identify duplicates
    const pool = getPool();
    const existingUrlSet = new Set<string>();

    if (pool) {
      try {
        const placeholders = urls.map(() => '?').join(', ');
        const [existingRows]: any = await pool.query(
          `SELECT url FROM groups_dir WHERE url IN (${placeholders})`,
          urls
        );
        if (Array.isArray(existingRows)) {
          for (const row of existingRows) {
            if (row.url) existingUrlSet.add(row.url.toLowerCase());
          }
        }
      } catch (err: any) {
        console.warn('[MySQL duplicate check notice]:', err?.message);
      }
    }

    // 3. Process URLs concurrently with bounded worker pool
    const workerConcurrency = Math.min(Math.max(1, Number(concurrency) || 5), 10);

    const results = await mapConcurrent(urls, workerConcurrency, async (rawUrl) => {
      try {
        const normalizedUrl = rawUrl.toLowerCase();
        if (existingUrlSet.has(normalizedUrl)) {
          return {
            url: rawUrl,
            success: true,
            status: 'duplicate',
            message: 'Group already exists in database',
          };
        }

        const platform = detectPlatformFromUrl(rawUrl);
        if (!platform) {
          return {
            url: rawUrl,
            success: false,
            error: 'Unsupported platform or invalid invitation format',
          };
        }

        let title = '';
        let description = '';
        let imageUrl = '';
        let memberCount = Math.floor(Math.random() * 850) + 150;
        let category = defaultCategory;
        let language = defaultLanguage;
        let region = defaultRegion;
        let customTags = Array.isArray(defaultTags) ? [...defaultTags] : [];

        // Scrape real metadata from social platform if enabled
        if (autoScrapeMetadata) {
          const isDisabledPlatform = platform === 'facebook' || platform === 'signal' || platform === 'snapchat' || platform === 'instagram';
          if (!isDisabledPlatform) {
            try {
              const scraped = await scrapeGroupMetadataDirect(rawUrl, platform);
              if (scraped && scraped.success) {
                if (scraped.title && scraped.title.trim()) title = scraped.title.trim();
                if (scraped.description && scraped.description.trim()) description = scraped.description.trim();
                if (scraped.imageUrl && scraped.imageUrl.trim()) {
                  const cleanImg = scraped.imageUrl.trim();
                  let finalImg = cleanImg;
                  try {
                    const r2Res = await uploadImageToR2(cleanImg, title || 'bulk-icon');
                    if (r2Res.success && r2Res.r2Url) {
                      finalImg = r2Res.r2Url;
                    }
                  } catch {}
                  imageUrl = finalImg;
                }
                if (scraped.memberCount && scraped.memberCount > 0) memberCount = scraped.memberCount;
              } else if (scraped && scraped.isExpired) {
                return {
                  url: rawUrl,
                  success: false,
                  error: scraped.expiredReason || 'Community invite link is expired or non-existent.',
                };
              }
            } catch {}
          }
        }

        if (!title) {
          const canonical = extractCanonicalGroupIdentifier(rawUrl, platform);
          const cleanPath = rawUrl.split('/').filter(Boolean).pop()?.replace(/[-_+]/g, ' ') || '';
          title = canonical 
            ? `${platform.toUpperCase()}: ${canonical}` 
            : (cleanPath ? `${platform.toUpperCase()} - ${cleanPath}` : `${platform.toUpperCase()} Community #${Math.floor(Math.random() * 8999 + 1000)}`);
        }

        if (!description) {
          description = `Active ${platform.toUpperCase()} community group for networking, discussions, and updates.`;
        }

        if (!imageUrl) {
          imageUrl = getCategoryFallbackImage(category, false, title);
        }

        const adultCheck = analyzeGroupContent({ title, description, customTags });
        const isNsfw = category === 'Adult / 18+' || adultCheck.isAdult;
        if (isNsfw) {
          category = 'Adult / 18+';
        }

        const id = `grp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const slug = generateSlug(title || id);
        const nowIso = new Date().toISOString();

        const groupPayload = {
          id,
          slug,
          title,
          description,
          url: rawUrl,
          platform,
          category,
          language,
          region,
          customTags,
          imageUrl,
          memberCount,
          verified: markVerified,
          isNsfw,
          status: 'approved' as const,
          isActive: true,
          safetyScore: isNsfw ? 40 : 95,
          growthRate: Math.floor(Math.random() * 15) + 5,
          clicks: 0,
          upvotes: 0,
          bookmarks: 0,
          createdAt: nowIso,
          publishedAt: nowIso,
          updatedAt: nowIso,
        };

        return {
          url: rawUrl,
          success: true,
          status: 'created',
          groupPayload,
        };
      } catch (err: any) {
        return {
          url: rawUrl,
          success: false,
          error: err.message || 'Failed to process group',
        };
      }
    });

    // 4. Batch insert all valid groups at once using native INSERT IGNORE INTO groups_dir
    const validGroupPayloads = results
      .filter((r): r is { url: string; success: true; status: string; groupPayload: any } => r.success && Boolean((r as any).groupPayload))
      .map(r => r.groupPayload);

    if (validGroupPayloads.length > 0) {
      if (pool) {
        try {
          const CHUNK_SIZE = 50;
          for (let i = 0; i < validGroupPayloads.length; i += CHUNK_SIZE) {
            const chunk = validGroupPayloads.slice(i, i + CHUNK_SIZE);
            const placeholders: string[] = [];
            const values: any[] = [];

            for (const g of chunk) {
              placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
              const customTagsJson = JSON.stringify(Array.isArray(g.customTags) ? g.customTags : []);
              const commentsJson = JSON.stringify([]);

              values.push(
                g.id,
                g.slug,
                g.title || 'Untitled Community',
                g.description || '',
                g.url,
                (g.platform || 'whatsapp').toLowerCase(),
                g.category || 'General',
                g.language || 'English',
                g.region || 'Global',
                customTagsJson,
                g.imageUrl || '',
                Number(g.memberCount) || 0,
                g.verified ? 1 : 0,
                g.isNsfw ? 1 : 0,
                g.status || 'approved',
                g.isActive ? 1 : 0,
                Number(g.safetyScore) || 95,
                Number(g.growthRate) || 12,
                Number(g.clicks) || 0,
                Number(g.upvotes) || 0,
                Number(g.bookmarks) || 0,
                g.createdAt,
                g.publishedAt,
                g.updatedAt,
                commentsJson
              );
            }

            const batchSql = `
              INSERT IGNORE INTO groups_dir (
                id, slug, title, description, url, platform, category,
                language, region, customTags, imageUrl, memberCount,
                verified, isNsfw, status, isActive, safetyScore,
                growthRate, clicks, upvotes, bookmarks, createdAt,
                publishedAt, updatedAt, comments
              ) VALUES ${placeholders.join(', ')}
            `;

            await pool.query(batchSql, values);
          }
        } catch (err: any) {
          console.warn('[MySQL batch INSERT IGNORE notice]:', err?.message);
          await batchUpsertGroups(validGroupPayloads);
        }
      } else {
        await batchUpsertGroups(validGroupPayloads);
      }
    }

    let successCount = 0;
    let failCount = 0;
    let duplicateCount = 0;

    for (const r of results) {
      if (r.success) {
        if (r.status === 'duplicate') duplicateCount++;
        else successCount++;
      } else {
        failCount++;
      }
    }

    // Instant Next.js Data Cache invalidation
    try {
      revalidateTag('groups');
      revalidatePath('/', 'layout');
    } catch {}

    return NextResponse.json({
      success: true,
      total: urls.length,
      successCount,
      duplicateCount,
      failCount,
      message: `Successfully processed ${urls.length} URLs in real-time (${successCount} published, ${duplicateCount} duplicates, ${failCount} errors).`,
      results,
    }, { headers: REALTIME_NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500, headers: REALTIME_NO_CACHE_HEADERS }
    );
  }
}
