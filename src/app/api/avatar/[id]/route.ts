import { NextRequest, NextResponse } from 'next/server';
import { getGroupById, updateGroup } from '@/src/lib/groups-dal';
import { getCommunityFallbackAvatar } from '@/src/utils/helpers';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const TIMEOUT_LIMIT_MS = 3500; // Strict 3.5 second timeout to prevent 504 Gateway Timeouts

/**
 * Strict fetch wrapper with an explicit AbortController and 3.5-second timeout.
 * Automatically aborts the external connection if the remote CDN hangs or stalls.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = TIMEOUT_LIMIT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Fetch to ${url} timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Live avatar refresher function.
 * Fetches the latest, active avatar URL from platform APIs on-the-fly:
 * - Telegram: parses public page https://t.me/${username}
 * - Discord: queries Discord Invites API for guild icon hash
 * - WhatsApp: parses https://chat.whatsapp.com/${code}
 * 
 * All requests enforce a 3.5s AbortController timeout.
 * Never writes images to server disk (100% copyright & DMCA safe).
 */
async function fetchFreshPlatformAvatar(url: string, platform: string): Promise<string | null> {
  if (!url) return null;
  const cleanUrl = url.trim();
  // 1. Telegram
  if (platform === 'telegram' || cleanUrl.includes('t.me') || cleanUrl.includes('telegram.me')) {
    const match = cleanUrl.match(/(?:t\.me|telegram\.me)\/(?:s\/)?([a-zA-Z0-9_]{4,})/i);
    const username = match ? match[1] : null;
    if (username && !['joinchat', 'addstickers', 'share', 'contact', 's'].includes(username.toLowerCase())) {
      const urlsToTry = [`https://t.me/${username}`, `https://t.me/s/${username}`];
      for (const u of urlsToTry) {
        try {
          const previewRes = await fetchWithTimeout(u, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          }, TIMEOUT_LIMIT_MS);
          if (previewRes.ok) {
            const html = await previewRes.text();
            const imgMatch = html.match(/class=["'][^"']*tgme_page_photo_image[^"']*["'][^>]*src=["']([^"']+)["']/i) ||
              html.match(/src=["']([^"']+)["'][^>]*class=["'][^"']*tgme_page_photo_image[^"']*["']/i) ||
              html.match(/class=["'][^"']*tgme_page_photo[^"']*["'][\s\S]*?<img[^>]+src=["']([^"']+)["']/i) ||
              html.match(/https:\/\/(?:cdn\d*\.telesco\.pe|telegram\.org)\/file\/[a-zA-Z0-9_-]+/i) ||
              html.match(/https:\/\/t\.me\/i\/userpic\/[a-zA-Z0-9_-]+/i);
            const foundImg = imgMatch ? (imgMatch[1] || imgMatch[0]) : null;
            if (foundImg) {
              return foundImg.replace(/&amp;/g, '&').trim();
            }
          }
        } catch {}
      }
    }
  }
  // 2. Discord
  if (platform === 'discord' || cleanUrl.includes('discord.gg') || cleanUrl.includes('discord.com/invite')) {
    const match = cleanUrl.match(/(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9_-]+)/i);
    const code = match ? match[1] : null;
    if (code) {
      try {
        const discordRes = await fetchWithTimeout(`https://discord.com/api/v10/invites/${code}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GroupDirectory/1.0)' },
        }, TIMEOUT_LIMIT_MS);
        if (discordRes.ok) {
          const data = await discordRes.json();
          const guildId = data?.guild?.id;
          const iconHash = data?.guild?.icon;
          if (guildId && iconHash) {
            return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.webp?size=160`;
          }
        }
      } catch {}
    }
  }
  // 3. WhatsApp
  if (platform === 'whatsapp' || cleanUrl.includes('chat.whatsapp.com')) {
    const match = cleanUrl.match(/chat\.whatsapp\.com\/([a-zA-Z0-9_-]{10,})/i);
    const code = match ? match[1] : null;
    if (code) {
      try {
        const waRes = await fetchWithTimeout(`https://chat.whatsapp.com/${code}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        }, TIMEOUT_LIMIT_MS);
        if (waRes.ok) {
          const html = await waRes.text();
          const ogMatch = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          if (ogMatch && ogMatch[1] && !ogMatch[1].includes('whatsapp.com/images/default')) {
            return ogMatch[1];
          }
        }
      } catch {}
    }
  }
  return null;
}
/**
 * Stream an image buffer with standard CDN edge caching without saving any file on disk.
 * Uses an explicit 3.5s AbortController timeout.
 */
async function streamImageResponse(imageUrl: string): Promise<NextResponse | null> {
  try {
    // If it's a data URI (e.g. SVG base64 from fallback)
    if (imageUrl.startsWith('data:')) {
      const [header, base64Data] = imageUrl.split(',');
      const mime = header.split(';')[0].replace('data:', '') || 'image/svg+xml';
      const buffer = Buffer.from(base64Data, 'base64');
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=604800, s-maxage=604800',
        },
      });
    }

    const res = await fetchWithTimeout(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    }, TIMEOUT_LIMIT_MS);

    if (res.ok) {
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      if (contentType.startsWith('image/')) {
        const buffer = await res.arrayBuffer();
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
          },
        });
      }
    }
  } catch {
    // AbortError or network failure: immediately return null to fallback seamlessly
  }

  return null;
}

/**
 * Seamlessly serves the Tier-1 deterministic SVG fallback avatar in 0ms.
 */
function serveSvgFallback(title?: string, platform?: string, id?: string | number): NextResponse {
  const dataUri = getCommunityFallbackAvatar(title || 'Community', platform || 'other', id || 'default');
  const svgContent = decodeURIComponent(dataUri.replace(/^data:image\/svg\+xml;utf8,/, ''));
  return new NextResponse(svgContent, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
      'X-Fallback-Reason': 'deterministic-svg',
    },
  });
}

/**
 * Internal resolver executing avatar proxy steps with timeout protection.
 */
async function resolveAvatar(id: string): Promise<NextResponse> {
  // Wrap database lookup in a 2.0s timeout to prevent database stalling
  const dbPromise = getGroupById(id);
  const dbTimeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
  const group = await Promise.race([dbPromise, dbTimeoutPromise]);

  const title = group?.title || 'Community';
  const platform = group?.platform || 'other';

  if (!group) {
    return serveSvgFallback(title, platform, id);
  }

  // 1. Try streaming the existing group.imageUrl if present (with 3.5s timeout)
  if (group.imageUrl && group.imageUrl.startsWith('http')) {
    const initialResponse = await streamImageResponse(group.imageUrl);
    if (initialResponse) {
      return initialResponse;
    }
  }

  // 2. If existing image was missing or expired (403/404/timeout) -> Retrieve fresh URL from platform live
  if (group.url) {
    const freshUrl = await fetchFreshPlatformAvatar(group.url, platform);
    if (freshUrl && freshUrl !== group.imageUrl) {
      const freshResponse = await streamImageResponse(freshUrl);
      if (freshResponse) {
        // Asynchronously auto-heal the database in background without blocking response
        updateGroup(group.id, { imageUrl: freshUrl }).catch(() => {});
        return freshResponse;
      }
    }
  }

  // 3. Upstream platform timed out or has no image -> Serve clean, deterministic SVG
  return serveSvgFallback(title, platform, id);
}

/**
 * GET /api/avatar/[id]
 * 
 * Auto-refreshing, zero-storage community avatar resolver:
 * - Employs strict 3.5s AbortController timeouts on all external CDN requests.
 * - Global 3.5s safety race prevents Nginx 504 Gateway Time-out under high concurrency.
 * - Instantly catches timeouts and returns Tier-1 deterministic SVG fallback.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  let fallbackTitle = 'Community';
  let fallbackPlatform = 'other';
  let resolvedId = 'default';

  try {
    const { id } = await params;
    resolvedId = id;

    // Race the entire resolution against a strict 3.5s global safety limit
    const response = await Promise.race([
      resolveAvatar(id),
      new Promise<NextResponse>((resolve) => {
        setTimeout(() => {
          resolve(serveSvgFallback(fallbackTitle, fallbackPlatform, resolvedId));
        }, TIMEOUT_LIMIT_MS);
      })
    ]);

    return response;
  } catch {
    return serveSvgFallback(fallbackTitle, fallbackPlatform, resolvedId);
  }
}
