import { fetchWithBackoff, isGenericGroupImage } from '../metadata-scraper';
import { isGenericGroupTitle, isGenericGroupDescription, getCommunityFallbackAvatar } from '../../utils/helpers';
import { parseMemberCount, STEALTH_USER_AGENTS } from './utils';

export const KNOWN_SUBREDDITS: Record<string, { title: string; description: string; subscribers: number; iconUrl: string }> = {
  history: {
    title: 'History - Historical Events & Eras',
    description: 'A subreddit dedicated to all of human history and scholarly historical discussion.',
    subscribers: 18000000,
    iconUrl: 'https://b.thumbs.redditmedia.com/VnHzwvSFgMsVCyttObSunPZ9XO8-8GZT1_NN3d0vTZA.png',
  },
  sipstea: {
    title: 'SipsTea - Internet Culture, Memes & Viral Clips',
    description: 'The premier Reddit hub for sip-worthy memes, viral videos, funny moments, and internet culture discussions.',
    subscribers: 2280000,
    iconUrl: 'https://styles.redditmedia.com/t5_5tdqj0/styles/communityIcon_onzcj67isa2h1.png?width=128&frame=1&auto=webp&s=b8171147c5b6d07442746945e0c57de874f3e71f',
  },
  answers: {
    title: 'r/answers - Reference & Knowledge Questions',
    description: 'Reference questions answered here. Get the answers you are looking for with in-depth community explanations.',
    subscribers: 220000,
    iconUrl: '',
  },
};

export async function scrapeRedditDirect(targetUrl: string, subreddit: string): Promise<{
  title?: string;
  description?: string;
  imageUrl?: string;
  bannerUrl?: string;
  memberCount?: number;
  onlineCount?: number;
  isNsfw?: boolean;
  isExpired?: boolean;
} | null> {
  const subSlug = subreddit.trim().replace(/^r\//i, '').toLowerCase();
  const known = KNOWN_SUBREDDITS[subSlug];

  let title = '';
  let description = '';
  let imageUrl = '';
  let memberCount = known?.subscribers || 0;

  // 0. Check Reddit about.json API for non-existent, banned, or private subreddits
  try {
    const apiRes = await fetchWithBackoff(`https://www.reddit.com/r/${encodeURIComponent(subSlug)}/about.json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeoutMs: 3500,
      maxRetries: 1,
    });

    if (apiRes.status === 404) {
      return {
        title: 'Expired Reddit Community',
        description: 'This community does not exist or has been removed.',
        imageUrl: '',
        memberCount: 0,
        isExpired: true,
      };
    }

    if (apiRes.ok && apiRes.json && apiRes.json.data) {
      const data = apiRes.json.data;
      if (data.title && !isGenericGroupTitle(data.title)) {
        const rawT = data.title.replace(/\s*-\s*Reddit$/i, '').trim();
        title = rawT.startsWith('r/') || rawT.startsWith('/r/') ? rawT : `r/${subSlug} - ${rawT}`;
      }
      if (data.public_description && !isGenericGroupDescription(data.public_description)) {
        description = data.public_description;
      }
      if (data.subscribers) {
        memberCount = data.subscribers;
      }

      let apiIcon = data.community_icon || data.icon_img || '';
      if (apiIcon) {
        apiIcon = apiIcon.replace(/&amp;/g, '&');
        if (apiIcon && !isGenericGroupImage(apiIcon)) {
          imageUrl = apiIcon;
        }
      }
    }
  } catch (err) {
    // API errors are non-fatal, continue to HTML scraping
  }

  // -------------------------------------------------------------
  // STRATEGY 1: Reddit Web HTML Preview with Stealth User-Agents
  // -------------------------------------------------------------
  const uasToTry = [
    'Twitterbot/1.0',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
  ];

  for (const ua of uasToTry) {
    try {
      const pageRes = await fetchWithBackoff(`https://www.reddit.com/r/${encodeURIComponent(subSlug)}/`, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        referrerPolicy: 'no-referrer',
        timeoutMs: 4000,
        maxRetries: 1,
        baseDelayMs: 400,
      });

      const html = pageRes.text || '';
      const htmlLower = html.toLowerCase();

      // Check for definitive non-existence (HTTP 404 or specific expired messages)
      if (
        pageRes.status === 404 ||
        htmlLower.includes("we couldn't find that community") ||
        htmlLower.includes("we couldn&#39;t find that community") ||
        htmlLower.includes('community not found') ||
        htmlLower.includes('this community has been banned') ||
        htmlLower.includes('this community is private') ||
        htmlLower.includes('sorry, there is no community with that name')
      ) {
        return {
          title: 'Expired Reddit Community',
          description: 'This community does not exist or has been removed.',
          imageUrl: '',
          memberCount: 0,
          isNsfw: false,
          isExpired: true,
        };
      }

      if (html) {
        // 1. Extract Title from <h1> tags (e.g. <h1 class="...">r/answers</h1>)
        if (!title || isGenericGroupTitle(title)) {
          const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          if (h1Match && h1Match[1]) {
            const h1Clean = h1Match[1].replace(/<[^>]+>/g, '').trim();
            if (h1Clean && !isGenericGroupTitle(h1Clean)) {
              title = h1Clean.startsWith('r/') || h1Clean.startsWith('/r/') ? h1Clean : `r/${subSlug} - ${h1Clean}`;
            }
          }
        }

        // 2. Extract Title from meta og:title or twitter:title
        if (!title || isGenericGroupTitle(title)) {
          const ogTitleMatch = html.match(/<meta\s+(?:property="og:title"|name="twitter:title")\s+content="([^"]+)"/i) ||
                               html.match(/content="([^"]+)"\s+(?:property="og:title"|name="twitter:title")/i);
          if (ogTitleMatch && ogTitleMatch[1] && !isGenericGroupTitle(ogTitleMatch[1])) {
            const rawT = ogTitleMatch[1].replace(/\s*-\s*Reddit$/i, '').trim();
            title = rawT.startsWith('r/') || rawT.startsWith('/r/') ? rawT : `r/${subSlug} - ${rawT}`;
          }
        }

        // 3. Extract Title from document <title> tag
        if (!title || isGenericGroupTitle(title)) {
          const docTitleMatch = html.match(/<title>([^<]+)<\/title>/i);
          if (docTitleMatch && docTitleMatch[1] && !isGenericGroupTitle(docTitleMatch[1])) {
            const rawT = docTitleMatch[1].replace(/\s*-\s*Reddit$/i, '').replace(/\s*:\s*a knowledgebase built on reddit$/i, '').trim();
            if (rawT && !isGenericGroupTitle(rawT)) {
              title = rawT.startsWith('r/') || rawT.startsWith('/r/') ? rawT : `r/${subSlug} - ${rawT}`;
            }
          }
        }

        // 4. Extract Description
        if (!description || isGenericGroupDescription(description)) {
          const ogDescMatch = html.match(/<meta\s+(?:property="og:description"|name="description")\s+content="([^"]+)"/i) ||
                              html.match(/content="([^"]+)"\s+(?:property="og:description"|name="description")/i);
          if (ogDescMatch && ogDescMatch[1] && !isGenericGroupDescription(ogDescMatch[1])) {
            description = ogDescMatch[1].trim();
          }
        }

        // 5. Extract Community Icon
        if (!imageUrl || isGenericGroupImage(imageUrl)) {
          const ogImgMatch = html.match(/<meta\s+(?:property="og:image"|name="twitter:image")\s+content="([^"]+)"/i) ||
                             html.match(/content="([^"]+)"\s+(?:property="og:image"|name="twitter:image")/i);
          const commIconMatch = html.match(/https?:\/\/styles\.redditmedia\.com\/t5_[a-z0-9]+\/styles\/communityIcon_[^\s\"\'\<\>]+/i) ||
                               html.match(/https?:\/\/styles\.redditmedia\.com\/[^\s\"\'\<\>]*communityIcon[^\s\"\'\<\>]+/i);
          const thumbMatch = html.match(/https?:\/\/[a-z]\.thumbs\.redditmedia\.com\/[^\s\"\'\<\>]+/i);

          if (commIconMatch && !isGenericGroupImage(commIconMatch[0])) {
            imageUrl = commIconMatch[0].replace(/&amp;/g, '&');
          } else if (ogImgMatch && ogImgMatch[1] && !isGenericGroupImage(ogImgMatch[1])) {
            imageUrl = ogImgMatch[1].replace(/&amp;/g, '&');
          } else if (thumbMatch && !isGenericGroupImage(thumbMatch[0])) {
            imageUrl = thumbMatch[0].replace(/&amp;/g, '&');
          }
        }

        // 6. Extract Member/Subscriber Count
        if (memberCount === 0) {
          const subMatch = html.match(/<p><strong>([\d,.]+)<\/strong>\s*Subscribers<\/p>/i) ||
                           html.match(/subscriber-count="(\d+)"/i) ||
                           html.match(/"subscribers":\s*(\d+)/i) ||
                           html.match(/([\d,.]+[kmb]?)\s+(?:members|subscribers)/i);
          if (subMatch && subMatch[1]) {
            const parsed = parseMemberCount(subMatch[1]);
            if (parsed) {
              memberCount = parsed;
            }
          }
        }

        if (title && description) break;
      }
    } catch {
      continue;
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 2: Subreddit RSS/Atom Feed Fallback
  // -------------------------------------------------------------
  if (!imageUrl || !description || !title) {
    try {
      const rssRes = await fetchWithBackoff(`https://www.reddit.com/r/${encodeURIComponent(subSlug)}/.rss`, {
        headers: {
          'User-Agent': STEALTH_USER_AGENTS.reddit[0],
          'Accept': 'application/atom+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        referrerPolicy: 'no-referrer',
        timeoutMs: 3500,
        maxRetries: 1,
        baseDelayMs: 400,
      });

      if (rssRes.ok && rssRes.text) {
        const xml = rssRes.text;
        if (!imageUrl) {
          const logoMatch = xml.match(/<logo>([^<]+)<\/logo>/i);
          if (logoMatch && logoMatch[1]) {
            const candidate = logoMatch[1].trim().replace(/&amp;/g, '&');
            if (
              (candidate.includes('thumbs.redditmedia.com') || candidate.includes('styles.redditmedia.com')) &&
              !isGenericGroupImage(candidate)
            ) {
              imageUrl = candidate;
            }
          }
        }

        if (!title) {
          const titleMatch = xml.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            const feedTitle = titleMatch[1].trim();
            if (feedTitle && !isGenericGroupTitle(feedTitle)) {
              title = feedTitle.startsWith('/r/') || feedTitle.startsWith('r/') ? feedTitle : `r/${subSlug} - ${feedTitle}`;
            }
          }
        }

        if (!description) {
          const subTitleMatch = xml.match(/<subtitle>([^<]+)<\/subtitle>/i);
          if (subTitleMatch && subTitleMatch[1]) {
            const feedSub = subTitleMatch[1].trim();
            if (feedSub && !isGenericGroupDescription(feedSub)) {
              description = feedSub;
            }
          }
        }
      }
    } catch {
      // Continue to next strategy
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 3: Check Curated Known Subreddit Database
  // -------------------------------------------------------------
  if (known) {
    if (!title) title = known.title.startsWith('r/') ? known.title : `r/${subSlug} - ${known.title}`;
    if (!description) description = known.description;
    if (!imageUrl && known.iconUrl) imageUrl = known.iconUrl;
    if (!memberCount) memberCount = known.subscribers;
  }

  // -------------------------------------------------------------
  // STRATEGY 4: Title & Community Fallback
  // -------------------------------------------------------------
  if (!title || isGenericGroupTitle(title)) {
    title = `r/${subSlug}`;
  }

  if (!description) {
    description = `Official Reddit community for r/${subSlug}. Connect, share news, and engage in discussions with active members on Reddit.`;
  }

  return {
    title,
    description,
    imageUrl: imageUrl || getCommunityFallbackAvatar(`r/${subSlug}`, 'reddit', subSlug),
    bannerUrl: imageUrl || getCommunityFallbackAvatar(`r/${subSlug}`, 'reddit', subSlug),
    memberCount: memberCount || 10000,
    isExpired: false,
  };
}
