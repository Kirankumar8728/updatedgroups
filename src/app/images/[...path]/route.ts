import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getCategoryFallbackImage } from '@/src/utils/categoryImages';
import { scrapeGroupMetadataDirect } from '@/src/lib/metadata-scraper';
import { queryRows } from '@/src/lib/db';
import { getGroupsDatabase } from '@/src/lib/groups-store';

export const dynamic = 'force-dynamic';

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.webp':
      return 'image/webp';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml; charset=utf-8';
    case '.gif':
      return 'image/gif';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'image/webp';
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: rawSegments } = await context.params;
    if (!rawSegments || !Array.isArray(rawSegments) || rawSegments.length === 0) {
      return new NextResponse('Invalid image path', { status: 400 });
    }

    // Sanitize path segments to prevent directory traversal
    const cleanSegments = rawSegments
      .map((s) => s.replace(/[^a-zA-Z0-9._-]/g, ''))
      .filter((s) => s && s !== '..' && s !== '.');

    if (cleanSegments.length === 0) {
      return new NextResponse('Invalid image path', { status: 400 });
    }

    // 1. Check local disk in public/images
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'images', ...cleanSegments),
      path.join(process.cwd(), 'images', ...cleanSegments),
      path.join(process.cwd(), '.next', 'standalone', 'public', 'images', ...cleanSegments),
    ];

    for (const diskPath of possiblePaths) {
      if (fs.existsSync(diskPath)) {
        try {
          const fileBuffer = await fs.promises.readFile(diskPath);
          return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
              'Content-Type': getMimeType(diskPath),
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        } catch {
          // File read failed, proceed to on-demand recovery
        }
      }
    }

    // 2. File not on disk - On-demand recovery from platform / database
    const platform = cleanSegments[0]?.toLowerCase() || 'telegram';
    const rawSlug = cleanSegments[1] || '';
    const isBanner = rawSlug.endsWith('-banner');
    const cleanSlug = isBanner ? rawSlug.replace(/-banner$/, '') : rawSlug;

    // Search for community in MySQL or local groups store
    let matchedGroup: { url?: string; title?: string; category?: string; imageUrl?: string; bannerUrl?: string } | null = null;

    try {
      const rows = await queryRows(
        'SELECT url, title, category, image_url AS imageUrl, banner_url AS bannerUrl FROM `groups` WHERE slug = ? OR slug LIKE ? OR LOWER(title) = ? LIMIT 1',
        [cleanSlug, `%${cleanSlug}%`, cleanSlug.replace(/-/g, ' ')]
      );
      if (rows && rows.length > 0) {
        matchedGroup = rows[0];
      }
    } catch {}

    if (!matchedGroup) {
      try {
        const storeGroups = getGroupsDatabase();
        matchedGroup = storeGroups.find(
          (g) =>
            g.slug === cleanSlug ||
            g.slug.includes(cleanSlug) ||
            g.title.toLowerCase() === cleanSlug.replace(/-/g, ' ').toLowerCase()
        ) || null;
      } catch {}
    }

    // If community found and has live URL
    let targetLiveUrl: string | undefined = undefined;
    if (matchedGroup) {
      const candidate = isBanner ? (matchedGroup.bannerUrl || matchedGroup.imageUrl) : matchedGroup.imageUrl;
      if (candidate && (candidate.startsWith('http://') || candidate.startsWith('https://')) && !candidate.includes('/images/')) {
        targetLiveUrl = candidate;
      }
    }

    // If no direct image URL available, re-scrape live platform metadata
    if (!targetLiveUrl && matchedGroup?.url) {
      try {
        const platformType = (matchedGroup as any)?.platform || (platform as any);
        const scraped = await scrapeGroupMetadataDirect(matchedGroup.url, platformType);
        if (scraped && scraped.imageUrl && (scraped.imageUrl.startsWith('http://') || scraped.imageUrl.startsWith('https://'))) {
          targetLiveUrl = isBanner && scraped.bannerUrl ? scraped.bannerUrl : scraped.imageUrl;
        }
      } catch {}
    }

    // If still no URL, attempt Telegram direct handle resolution
    if (!targetLiveUrl && platform === 'telegram' && cleanSlug.length >= 3) {
      try {
        const tgCandidate = `https://t.me/${cleanSlug.replace(/-/g, '_')}`;
        const scraped = await scrapeGroupMetadataDirect(tgCandidate, 'telegram');
        if (scraped && scraped.imageUrl && (scraped.imageUrl.startsWith('http://') || scraped.imageUrl.startsWith('https://'))) {
          targetLiveUrl = scraped.imageUrl;
        }
      } catch {}
    }

    // 3. If target live URL found, fetch, compress to WebP, write to disk, and return
    if (targetLiveUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const imgRes = await fetch(targetLiveUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          },
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (imgRes.ok) {
          const rawBuffer = Buffer.from(await imgRes.arrayBuffer());
          const size = isBanner ? { width: 1200, height: 400 } : { width: 150, height: 150 };

          const webpBuffer = await sharp(rawBuffer)
            .rotate()
            .resize(size.width, size.height, {
              fit: 'cover',
              position: 'attention',
            })
            .webp({ quality: 80, effort: 4 })
            .toBuffer();

          // Save to disk asynchronously for future requests
          const primaryDiskPath = path.join(process.cwd(), 'public', 'images', ...cleanSegments);
          try {
            const dir = path.dirname(primaryDiskPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFile(primaryDiskPath, webpBuffer, () => {});
          } catch {}

          return new NextResponse(webpBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'image/webp',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }
      } catch (fetchErr) {
        console.warn('[Images Route Handler] Failed to fetch target live image:', fetchErr);
      }
    }

    // 4. Graceful Fallback: Generate SVG and return 200 (never broken 404)
    const category = matchedGroup?.category || 'General';
    const title = matchedGroup?.title || cleanSlug.replace(/-/g, ' ');
    const fallbackDataUri = getCategoryFallbackImage(category, isBanner, title);
    const svgContent = decodeURIComponent(fallbackDataUri.replace(/^data:image\/svg\+xml;utf8,/, ''));

    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error: any) {
    console.error('[Images Route Error]:', error);
    const fallbackDataUri = getCategoryFallbackImage('General', false, 'Community');
    const svgContent = decodeURIComponent(fallbackDataUri.replace(/^data:image\/svg\+xml;utf8,/, ''));
    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}
