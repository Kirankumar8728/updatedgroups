import { parse } from 'node-html-parser';
import { fetchWithBackoff, fetchMicrolinkFallback, normalizePlatformUrl, extractTelegramHandle, isGenericGroupImage } from '../metadata-scraper';
import { isGenericGroupTitle, isGenericGroupDescription, cleanCommunityTitle, getCommunityFallbackAvatar } from '../../utils/helpers';
import { decodeHtmlEntitiesAndClean, parseMemberCount } from './utils';

export async function scrapeTelegramDirect(targetUrl: string): Promise<{
  title?: string;
  description?: string;
  imageUrl?: string;
  memberCount?: number;
  isVerified?: boolean;
  isExpired?: boolean;
} | null> {
  const norm = normalizePlatformUrl(targetUrl);
  const handle = norm.platformHandle || extractTelegramHandle(targetUrl);
  const urlsToTry = [
    handle && !handle.startsWith('+') && handle !== 'joinchat' ? `https://t.me/s/${handle}` : null,
    handle ? `https://t.me/${handle}` : norm.normalizedUrl,
  ].filter(Boolean) as string[];

  const userAgentsToTry = [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'TelegramBot (like TwitterBot)',
    'Twitterbot/1.0',
    'curl/8.5.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  ];

  let fallbackCandidate: any = null;

  for (const fetchUrl of urlsToTry) {
    for (const ua of userAgentsToTry) {
      try {
        const fetchRes = await fetchWithBackoff(fetchUrl, {
          headers: {
            'User-Agent': ua,
            'Accept': '*/*',
          },
          timeoutMs: 5000,
          maxRetries: 1,
          baseDelayMs: 300,
        });

        if (!fetchRes.ok || !fetchRes.text || fetchRes.text.length < 100) continue;
        const html = fetchRes.text;
        const htmlLower = html.toLowerCase();
        // Check for definitive non-existence, banned status, or non-group user contact pages
        const textStripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
        const hasContactPrompt =
          (textStripped.includes('you can contact') && textStripped.includes('right away')) ||
          textStripped.includes('if you have telegram, you can contact') ||
          textStripped.includes('if you have telegram you can contact');
        const isUserProfilePage =
          htmlLower.includes('tgme_icon_user') ||
          (htmlLower.includes('tgme_action_button_new') && htmlLower.includes('send message') && !htmlLower.includes('subscribers') && !htmlLower.includes('members'));
        const isContactTitle =
          htmlLower.includes('<title>telegram: contact @') ||
          htmlLower.includes('content="telegram: contact @');

        if (
          hasContactPrompt ||
          isUserProfilePage ||
          isContactTitle ||
          htmlLower.includes('channel does not exist') ||
          htmlLower.includes('no channel with this link') ||
          htmlLower.includes('this channel has been banned') ||
          htmlLower.includes('this group has been banned') ||
          htmlLower.includes('chat not found') ||
          htmlLower.includes('channel not found') ||
          htmlLower.includes('page not found') ||
          htmlLower.includes('is not available') ||
          htmlLower.includes('does not exist') ||
          htmlLower.includes('the invite link has expired') ||
          htmlLower.includes('this invite link has expired') ||
          htmlLower.includes('invite link has expired')
        ) {
          return {
            title: 'Expired Telegram Group',
            description: 'This invite link got expired or the group is inactive.',
            imageUrl: '',
            memberCount: 0,
            isVerified: false,
            isExpired: true,
          };
        }

        const root = parse(html);

        let ogTitle = root.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
          root.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
          root.querySelector('.tgme_page_title')?.textContent?.trim() ||
          root.querySelector('.tgme_channel_info .tgme_channel_title')?.textContent?.trim();

        if (!ogTitle) {
          const rawDocTitle = root.querySelector('title')?.textContent?.trim() || '';
          if (!rawDocTitle.includes('Contact @') && !rawDocTitle.includes('View @')) {
            ogTitle = rawDocTitle;
          }
        }

        if (ogTitle) {
          ogTitle = ogTitle
            .replace(/^Telegram:\s*(?:Contact\s*@?|View\s*@?)/i, '')
            .replace(/^(?:Contact|View)\s*@/i, '')
            .replace(/\s*–\s*Telegram$/i, '')
            .replace(/\s*-\s*Telegram$/i, '')
            .trim();
        }

        if (!ogTitle && handle) {
          ogTitle = handle;
        }

        const ogDesc = root.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
          root.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
          root.querySelector('.tgme_page_description')?.textContent?.trim() ||
          root.querySelector('.tgme_channel_info_description')?.textContent?.trim();

        // 1. Extract avatar from .tgme_page_photo_image (src attribute) first
        let rawPhotoUrl: string | undefined = undefined;
        const photoImg = root.querySelector('img.tgme_page_photo_image') ||
          root.querySelector('.tgme_page_photo_image') ||
          root.querySelector('.tgme_page_photo img') ||
          root.querySelector('.tgme_page_photo_image img');

        if (photoImg) {
          rawPhotoUrl = photoImg.getAttribute('src') || photoImg.getAttribute('data-src') || undefined;
          if (!rawPhotoUrl) {
            const styleAttr = photoImg.getAttribute('style') || '';
            const bgMatch = styleAttr.match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
            if (bgMatch && bgMatch[2]) {
              rawPhotoUrl = bgMatch[2];
            }
          }
        }

        // 2. Fall back to meta[property="og:image"]
        if (!rawPhotoUrl) {
          rawPhotoUrl = root.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
            root.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || undefined;
        }

        // Fallback telesco.pe or t.me regex search
        if (!rawPhotoUrl) {
          const telescoMatch = html.match(/(?:https?:)?\/\/(?:cdn\d*\.telesco\.pe|telegram\.org)\/file\/[a-zA-Z0-9_-]+/i) ||
            html.match(/(?:https?:)?\/\/t\.me\/i\/userpic\/[a-zA-Z0-9_-]+/i);
          if (telescoMatch) {
            rawPhotoUrl = telescoMatch[0];
          }
        }

        let imageUrl = '';
        if (rawPhotoUrl) {
          let cleanImg = rawPhotoUrl.replace(/&amp;/g, '&').trim();
          // Normalize protocol-relative or relative URLs
          if (cleanImg.startsWith('//')) {
            cleanImg = `https:${cleanImg}`;
          } else if (cleanImg.startsWith('/')) {
            cleanImg = `https://telegram.org${cleanImg}`;
          }

          // Ignore generic Telegram logo placeholders (telegram-logo, t_logo, favicon.ico)
          if (!isGenericGroupImage(cleanImg) && !cleanImg.includes('telegram-logo') && !cleanImg.endsWith('/favicon.ico')) {
            imageUrl = cleanImg;
          }
        }

        const extraText = root.querySelector('.tgme_page_extra')?.textContent?.trim() ||
          root.querySelector('.tgme_channel_info_counters')?.textContent?.trim() ||
          root.querySelector('.tgme_page_counter')?.textContent?.trim() ||
          root.querySelector('.tgme_page_subscribers')?.textContent?.trim() || '';
        let memberCount: number | undefined = undefined;
        console.log('[DEBUG] Telegram scrape extraText:', extraText);
        if (extraText) {
          const parsedMembers = parseMemberCount(extraText);
          if (parsedMembers) memberCount = parsedMembers;
        }
        if (!memberCount) {
          const subMatch = html.match(/([0-9\s,.]+[KMkm]?)\s+(?:subscribers|members|users)/i);
          if (subMatch && subMatch[1]) {
            const parsedM = parseMemberCount(subMatch[1]);
            if (parsedM) memberCount = parsedM;
          }
        }

        let title = ogTitle ? decodeHtmlEntitiesAndClean(ogTitle) : '';
        title = cleanCommunityTitle(title, 'telegram');

        let description = ogDesc ? decodeHtmlEntitiesAndClean(ogDesc) : '';
        if (isGenericGroupDescription(description)) {
          description = '';
        }

        if (title && !isGenericGroupTitle(title)) {
          const candidate = {
            title,
            description: description || undefined,
            imageUrl: imageUrl || undefined,
            memberCount: memberCount || undefined,
            isVerified: html.includes('verified-icon') || html.includes('tgme_icon_verified'),
          };

          if (candidate.description && candidate.imageUrl && candidate.memberCount) {
            return candidate;
          }

          if (!fallbackCandidate) {
            fallbackCandidate = candidate;
          }
        }
      } catch {}
    }
  }

  // Microservice OpenGraph fallback for Telegram links with missing image/description/members
  if (handle) {
    if (!fallbackCandidate || !fallbackCandidate.description || !fallbackCandidate.imageUrl || !fallbackCandidate.memberCount) {
      try {
        const ml = await fetchMicrolinkFallback(targetUrl);
        if (ml) {
          if (fallbackCandidate) {
            if (ml.title && (!fallbackCandidate.title || fallbackCandidate.title.toLowerCase() === handle.toLowerCase())) {
              fallbackCandidate.title = ml.title;
            }
            if (ml.description) {
              fallbackCandidate.description = ml.description;
            }
            if (ml.imageUrl) {
              fallbackCandidate.imageUrl = ml.imageUrl;
            }
          } else if (ml.title || ml.imageUrl) {
            fallbackCandidate = {
              title: ml.title || handle,
              description: ml.description || undefined,
              imageUrl: ml.imageUrl || undefined,
              memberCount: undefined,
              isVerified: false,
            };
          }
        }
      } catch {}
    }

    if (fallbackCandidate) {
      if (!fallbackCandidate.imageUrl) {
        try {
          const uRes = await fetch(`https://unavatar.io/telegram/${encodeURIComponent(handle)}`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(2500),
          });
          if (uRes.ok && (uRes.headers.get('content-type') || '').includes('image/')) {
            fallbackCandidate.imageUrl = `https://unavatar.io/telegram/${encodeURIComponent(handle)}`;
          }
        } catch {}

        if (!fallbackCandidate.imageUrl) {
          fallbackCandidate.imageUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=tg-${encodeURIComponent(handle)}&backgroundColor=0088cc,229ed9`;
        }
      }

      if (!fallbackCandidate.description || isGenericGroupDescription(fallbackCandidate.description)) {
        const cleanName = cleanCommunityTitle(fallbackCandidate.title || handle, 'telegram');
        fallbackCandidate.description = `Official Telegram community for ${cleanName}. Connect, message, and engage with active members and administrators on Telegram.`;
      }

      fallbackCandidate.title = cleanCommunityTitle(fallbackCandidate.title || handle, 'telegram');
    }
  }

  return fallbackCandidate;
}
