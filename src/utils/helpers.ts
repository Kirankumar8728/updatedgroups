import { Platform, PlatformConfig, Category, Language, Region, Group, SortOption } from '../types';
import { analyzeGroupContent } from './keywordFilter';

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  whatsapp: {
    name: 'WhatsApp',
    color: '#25D366',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
    borderColor: 'border-emerald-500',
    iconName: 'MessageCircle',
    badgeClass: 'bg-[#25D366] text-white',
    urlPatterns: [/chat\.whatsapp\.com\/[a-zA-Z0-9_-]+/i, /whatsapp\.com\/channel\/[a-zA-Z0-9_-]+/i],
    domain: 'chat.whatsapp.com',
    exampleUrl: 'https://chat.whatsapp.com/LUxzLfuCQas5EW3WiMO8in'
  },
  telegram: {
    name: 'Telegram',
    color: '#229ED9',
    bgColor: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/40',
    borderColor: 'border-sky-500',
    iconName: 'Send',
    badgeClass: 'bg-[#229ED9] text-white',
    urlPatterns: [/t\.me\/[a-zA-Z0-9_+]+/i, /telegram\.me\/[a-zA-Z0-9_+]+/i],
    domain: 't.me',
    exampleUrl: 'https://t.me/tech_community_hub'
  },
  discord: {
    name: 'Discord',
    color: '#5865F2',
    bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40',
    borderColor: 'border-indigo-500',
    iconName: 'Gamepad2',
    badgeClass: 'bg-[#5865F2] text-white',
    urlPatterns: [/discord\.gg\/[a-zA-Z0-9]+/i, /discord\.com\/invite\/[a-zA-Z0-9]+/i],
    domain: 'discord.gg',
    exampleUrl: 'https://discord.gg/dev-community'
  },
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
    borderColor: 'border-blue-500',
    iconName: 'Users',
    badgeClass: 'bg-[#1877F2] text-white',
    urlPatterns: [/facebook\.com\/groups\/[a-zA-Z0-9_.-]+/i, /fb\.com\/groups\/[a-zA-Z0-9_.-]+/i],
    domain: 'facebook.com/groups',
    exampleUrl: 'https://facebook.com/groups/startupsconnect'
  },
  signal: {
    name: 'Signal',
    color: '#3A76F0',
    bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/40',
    borderColor: 'border-cyan-500',
    iconName: 'ShieldCheck',
    badgeClass: 'bg-[#3A76F0] text-white',
    urlPatterns: [/signal\.group\//i],
    domain: 'signal.group',
    exampleUrl: 'https://signal.group/#CjQK...'
  },
  snapchat: {
    name: 'Snapchat',
    color: '#FFFC00',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
    borderColor: 'border-yellow-400',
    iconName: 'Camera',
    badgeClass: 'bg-[#FFFC00] text-black font-semibold',
    urlPatterns: [/snapchat\.com\/t\/[a-zA-Z0-9_-]+/i],
    domain: 'snapchat.com',
    exampleUrl: 'https://snapchat.com/t/sleuph1y'
  },
  reddit: {
    name: 'Reddit',
    color: '#FF4500',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/40',
    borderColor: 'border-orange-500',
    iconName: 'MessageSquare',
    badgeClass: 'bg-[#FF4500] text-white',
    urlPatterns: [/reddit\.com\/r\/[a-zA-Z0-9_]+/i],
    domain: 'reddit.com',
    exampleUrl: 'https://reddit.com/r/programming'
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    bgColor: 'bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800/40',
    borderColor: 'border-pink-500',
    iconName: 'Camera',
    badgeClass: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white font-semibold',
    urlPatterns: [/instagram\.com\/j\/[a-zA-Z0-9_-]+/i, /instagram\.com\/channel\/[a-zA-Z0-9_-]+/i, /ig\.me\/j\/[a-zA-Z0-9_-]+/i],
    domain: 'instagram.com',
    exampleUrl: 'https://instagram.com/j/ab12cd34ef'
  },
  other: {
    name: 'Community Link',
    color: '#8B5CF6',
    bgColor: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40',
    borderColor: 'border-purple-500',
    iconName: 'Globe',
    badgeClass: 'bg-purple-600 text-white',
    urlPatterns: [/^https?:\/\//i],
    domain: 'link',
    exampleUrl: 'https://grouplinks.app'
  }
};

export const CATEGORIES: Category[] = [
  'Adult / 18+',
  'Anime & Manga',
  'Art & Design',
  'Business & Startups',
  'Crypto & Web3',
  'Dating & Social',
  'Education & Study',
  'Entertainment & Movies',
  'Fashion & Beauty',
  'Finance & Investing',
  'Fitness & Wellness',
  'Food & Cooking',
  'Gaming & Esports',
  'Health & Medical',
  'Hobbies & Crafts',
  'Humor & Memes',
  'Languages & Learning',
  'Local & Regional',
  'Music & Audio',
  'Pets & Animals',
  'Photography & Video',
  'Science & AI',
  'Sports & Outdoors',
  'Tech & Programming',
  'Travel & Adventure'
];

export const GENERAL_CATEGORIES: Category[] = CATEGORIES.filter(c => c !== 'Adult / 18+');

export const LANGUAGES: Language[] = [
  'All / Multilingual',
  'Arabic',
  'Assamese',
  'Bengali',
  'Chinese',
  'Dutch',
  'English',
  'French',
  'German',
  'Gujarati',
  'Hindi',
  'Indonesian',
  'Italian',
  'Japanese',
  'Kannada',
  'Korean',
  'Malayalam',
  'Marathi',
  'Odia',
  'Polish',
  'Portuguese',
  'Punjabi',
  'Russian',
  'Spanish',
  'Tamil',
  'Telugu',
  'Turkish',
  'Urdu',
  'Vietnamese'
];

export const REGIONS: Region[] = [
  'Global',
  'Africa',
  'Asia Pacific',
  'Australia',
  'Brazil',
  'Canada',
  'Europe',
  'France',
  'Germany',
  'India',
  'Indonesia',
  'Italy',
  'Japan',
  'Latin America',
  'Mexico',
  'Middle East',
  'North America',
  'South Asia',
  'South Korea',
  'Spain',
  'United Kingdom',
  'United States'
];

export const ALLOWED_URL_RULES = [
  { platform: 'whatsapp', name: 'WhatsApp Group', prefix: 'https://chat.whatsapp.com/', example: 'https://chat.whatsapp.com/LUxzLfuCQas5EW3WiMO8in', mode: 'Auto fetched' },
  { platform: 'telegram', name: 'Telegram Channel', prefix: 'https://t.me/', example: 'https://t.me/tech_community_hub', mode: 'Auto Fetched' },
  { platform: 'discord', name: 'Discord Server', prefix: 'https://discord.gg/', example: 'https://discord.gg/bjBbbNytm', mode: 'Auto Fetched' },
  { platform: 'reddit', name: 'Reddit Communities', prefix: 'https://reddit.com/r/', example: 'https://www.reddit.com/r/programming/', mode: 'Auto Fetched' },
  { platform: 'signal', name: 'Signal Group', prefix: 'https://signal.group/', example: 'https://signal.group/#CjQKIHpOFusQRR8H10z1NoK9UistglFMI0u9R6hslOhKiGux', mode: 'Manual Edit' },
  { platform: 'facebook', name: 'Facebook Group', prefix: 'https://facebook.com/groups/', example: 'https://facebook.com/groups/3007338445957628/', mode: 'Manual Edit' },
  { platform: 'instagram', name: 'Instagram Group', prefix: 'https://instagram.com/j/', example: 'https://instagram.com/j/ab12cd34ef', mode: 'Auto cum Manual for description' },
  { platform: 'snapchat', name: 'Snapchat Group', prefix: 'https://snapchat.com/t/', example: 'https://snapchat.com/t/sleuph1y', mode: 'Manual Edit' }
];

export interface UrlValidationResult {
  isValid: boolean;
  platform: Platform;
  isBot?: boolean;
  errorMessage?: string;
}

export function validateGroupUrl(url: string): UrlValidationResult {
  if (!url || !url.trim()) {
    return { isValid: false, platform: 'other', errorMessage: 'Please provide a community invite link.' };
  }
  const cleanUrl = url.trim();
  if (cleanUrl.length > 500) {
    return { isValid: false, platform: 'other', errorMessage: 'URL exceeds maximum allowable length (500 characters).' };
  }

  let parsed: URL;
  try {
    parsed = new URL(cleanUrl);
  } catch {
    return { isValid: false, platform: 'other', errorMessage: 'Malformed URL. Please enter a complete HTTP or HTTPS link.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { isValid: false, platform: 'other', errorMessage: 'Invalid protocol. Only standard HTTPS/HTTP links are supported.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // Block localhost, link-local, loopback, private IP and internal network addresses
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '169.254.169.254' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    return { isValid: false, platform: 'other', errorMessage: 'Private or local network URLs are strictly forbidden.' };
  }

  // 1. Signal (Allow any signal.group/ invite link)
  if (hostname === 'signal.group' || hostname.endsWith('.signal.group') || cleanUrl.toLowerCase().includes('signal.group/')) {
    return { isValid: true, platform: 'signal' };
  }

  // 2. WhatsApp: Explicitly forbid wa.me personal DMs, require chat.whatsapp.com group invites
  if (hostname === 'wa.me' || hostname.endsWith('.wa.me')) {
    return {
      isValid: false,
      platform: 'whatsapp',
      errorMessage: 'wa.me links are direct personal chat links, not group communities. Please provide a valid WhatsApp group invite link starting with https://chat.whatsapp.com/.'
    };
  }

  if (
    hostname === 'chat.whatsapp.com' || 
    (hostname.endsWith('whatsapp.com') && (pathname.startsWith('/channel/') || pathname.startsWith('/invite/') || pathname.startsWith('/')))
  ) {
    const rawCode = pathname.startsWith('/invite/') ? pathname.substring(8) : (pathname.startsWith('/channel/') ? pathname.substring(9) : pathname.replace(/^\//, ''));
    const cleanCode = rawCode.replace(/\/+$/, '').split('?')[0].split('#')[0].trim();
    if (!cleanCode) {
      return { isValid: false, platform: 'whatsapp', errorMessage: 'Invalid WhatsApp Group link: missing group invite code in URL path.' };
    }
    if (cleanCode.length < 6) {
      return {
        isValid: false,
        platform: 'whatsapp',
        errorMessage: `Invalid WhatsApp Group Link: The invite code is too short. Please make sure you copy and submit the complete invite URL.`
      };
    }
    return { isValid: true, platform: 'whatsapp' };
  }

  // 3. Telegram
  if (hostname === 't.me' || hostname === 'telegram.me' || hostname.endsWith('.t.me') || hostname.endsWith('.telegram.me')) {
    const isBot = pathname.toLowerCase().endsWith('bot') || pathname.toLowerCase().includes('bot?') || parsed.searchParams.has('start');
    return { isValid: true, platform: 'telegram', isBot };
  }

  // 4. Discord
  if (hostname === 'discord.gg' || ((hostname === 'discord.com' || hostname.endsWith('.discord.com')) && pathname.startsWith('/invite/'))) {
    return { isValid: true, platform: 'discord' };
  }

  // 5. Snapchat: Disallow personal add/story links, only allow group links (snapchat.com/t/...)
  if (
    hostname === 'story.snapchat.com' ||
    hostname.endsWith('.story.snapchat.com') ||
    ((hostname === 'snapchat.com' || hostname.endsWith('.snapchat.com')) && (pathname.startsWith('/add/') || pathname.startsWith('/p/')))
  ) {
    return {
      isValid: false,
      platform: 'snapchat',
      errorMessage: 'Personal Snapchat add/story links are not accepted. Only Snapchat group links (e.g., https://snapchat.com/t/...) are allowed.'
    };
  }

  if ((hostname === 'snapchat.com' || hostname.endsWith('.snapchat.com')) && pathname.startsWith('/t/')) {
    return { isValid: true, platform: 'snapchat' };
  }

  // 6. Facebook
  if (
    (hostname === 'facebook.com' || hostname.endsWith('.facebook.com') || hostname === 'fb.com' || hostname === 'fb.me') &&
    (pathname.includes('/groups/') || pathname.includes('/share/g/'))
  ) {
    return { isValid: true, platform: 'facebook' };
  }

  // 7. Reddit
  if (
    (hostname === 'reddit.com' || hostname.endsWith('.reddit.com') || hostname === 'redd.it') &&
    (pathname.startsWith('/r/') || pathname.length > 1)
  ) {
    return { isValid: true, platform: 'reddit' };
  }

  // 8. Instagram Groups / Broadcast Channels / Direct Invites
  if (
    (hostname === 'instagram.com' || hostname.endsWith('.instagram.com') || hostname === 'ig.me') &&
    (pathname.startsWith('/j/') || pathname.startsWith('/channel/') || pathname.startsWith('/direct/') || pathname.includes('/group/'))
  ) {
    return { isValid: true, platform: 'instagram' };
  }

  // 8. Other Community Platforms (Matrix, Slack, Google Groups, Meetup, Guilded, etc.)
  if (hostname && hostname.includes('.') && pathname.length >= 1) {
    return { isValid: true, platform: 'other' };
  }

  return {
    isValid: false,
    platform: 'other',
    errorMessage: 'Invalid community link format. Please provide a valid public group or community URL.'
  };
}

export function detectPlatformFromUrl(url: string): Platform {
  const result = validateGroupUrl(url);
  return result.platform;
}

export function getDefaultUrlForPlatform(platform: Platform, identifier: string | number = 'group'): string {
  const cleanId = String(identifier).replace(/[^a-zA-Z0-9_-]/g, '') || 'community';
  switch (platform) {
    case 'whatsapp':
      return `https://chat.whatsapp.com/${cleanId}`;
    case 'telegram':
      return `https://t.me/${cleanId}`;
    case 'discord':
      return `https://discord.gg/${cleanId}`;
    case 'signal':
      return `https://signal.group/#${cleanId}`;
    case 'facebook':
      return `https://facebook.com/groups/${cleanId}`;
    case 'snapchat':
      return `https://snapchat.com/t/${cleanId}`;
    case 'reddit':
      return `https://reddit.com/r/${cleanId}`;
    default:
      return `https://chat.whatsapp.com/${cleanId}`;
  }
}

export function ensureUrlMatchesPlatform(url: string, platform: Platform, identifierFallback: string | number = 'group'): string {
  if (!url || !url.trim()) {
    return getDefaultUrlForPlatform(platform, identifierFallback);
  }
  // Keep the user-pasted invite link exactly as it is without mutation
  return url.trim();
}

export function formatMemberCount(num: number): string {
  if (!num || isNaN(num)) return '0';
  if (num < 0) return '-' + formatMemberCount(-num);

  const units = [
    { value: 1e24, symbol: 'Sp' }, // Septillion
    { value: 1e21, symbol: 'Sx' }, // Sextillion
    { value: 1e18, symbol: 'Qi' }, // Quintillion
    { value: 1e15, symbol: 'Q' },  // Quadrillion (1Q, 900Q)
    { value: 1e12, symbol: 'T' },  // Trillion (1T, 900T)
    { value: 1e9,  symbol: 'B' },  // Billion (1B, 10B)
    { value: 1e6,  symbol: 'M' },  // Million (1M, 10M, 100M, 900M)
    { value: 1e3,  symbol: 'k' },  // Thousand (10k, 100k)
  ];

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    if (num >= unit.value) {
      const quotient = num / unit.value;
      const formatted = quotient.toFixed(1).replace(/\.0$/, '');
      // If rounding caused it to become 1000 and there is a higher tier, roll over cleanly
      if (parseFloat(formatted) >= 1000 && i > 0) {
        const higherUnit = units[i - 1];
        const higherFormatted = (num / higherUnit.value).toFixed(1).replace(/\.0$/, '');
        return `${higherFormatted}${higherUnit.symbol}`;
      }
      return `${formatted}${unit.symbol}`;
    }
  }

  return num.toLocaleString();
}

/**
 * Calculates a Rank Quality Score (0-100) based on title, description, tags, keywords, and metadata completeness,
 * or based on numeric metrics (members, upvotes, clicks, rating).
 */
export function calculateRankScore(
  titleOrMembers: string | number, 
  descriptionOrUpvotes: string | number = '', 
  tagsOrClicks: string[] | number = [], 
  rulesOrRating?: string | number
): number {
  if (typeof titleOrMembers === 'number') {
    const members = titleOrMembers || 0;
    const upvotes = typeof descriptionOrUpvotes === 'number' ? descriptionOrUpvotes : 0;
    const clicks = typeof tagsOrClicks === 'number' ? tagsOrClicks : 0;
    const rating = typeof rulesOrRating === 'number' ? rulesOrRating : 4.5;

    let score = 50;
    if (members >= 1000) score += 20;
    else if (members >= 200) score += 10;

    if (upvotes >= 50) score += 15;
    else if (upvotes >= 10) score += 8;

    if (clicks >= 100) score += 10;
    if (rating >= 4.5) score += 5;

    return Math.min(100, Math.max(40, score));
  }

  const title = String(titleOrMembers || '');
  const description = typeof descriptionOrUpvotes === 'string' ? descriptionOrUpvotes : '';
  const tags = Array.isArray(tagsOrClicks) ? tagsOrClicks : [];
  const rulesSummary = typeof rulesOrRating === 'string' ? rulesOrRating : undefined;

  let score = 50; // Base score

  // Title optimization (ideal length 20 - 70 chars)
  if (title.length >= 20 && title.length <= 70) score += 15;
  else if (title.length >= 10) score += 8;

  // Description richness (ideal length > 80 chars)
  if (description.length >= 100) score += 15;
  else if (description.length >= 50) score += 8;

  // Keywords & Hashtag count (ideal >= 3 tags)
  if (tags.length >= 4) score += 10;
  else if (tags.length >= 2) score += 5;

  // Rules / safety metadata
  if (rulesSummary && rulesSummary.length >= 10) score += 10;

  return Math.min(100, Math.max(40, score));
}


export function calculateRankGrade(score: number): 'A+' | 'A' | 'B' | 'C' {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  return 'C';
}

/**
 * Calculates real-time popularity and rank score boosted by Rank Optimization
 * Highly Rank-optimized communities rank significantly higher in discovery feeds.
 */
export function calculatePopularityScore(
  clicks: number, 
  upvotes: number, 
  memberCount: number, 
  growthRate: number,
  rankScore: number = 85
): number {
  const basePopularity = clicks * 3.5 + upvotes * 8 + (memberCount > 0 ? Math.log10(memberCount) * 15 : 0) + growthRate * 4;
  
  // Rank Multiplier: Higher Rank optimization directly boosts ranking
  const rankMultiplier = 1 + (rankScore / 100) * 0.45;
  
  return Math.round(basePopularity * rankMultiplier);
}

/**
 * Extracts a normalized, canonical identifier for group invite links across platforms.
 * Strips protocols, trailing slashes, www, tracking query params, and extracts core invite codes/handles.
 */
export function extractCanonicalGroupIdentifier(rawUrl: string, platform?: Platform): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();

  // Special handling for Signal: Signal URLs store the entire unique invite hash after #
  if (trimmed.toLowerCase().includes('signal.group') || trimmed.toLowerCase().includes('signal.me')) {
    // Improved regex to handle trailing slashes and potential query params
    const sgMatch = trimmed.match(/signal\.(?:group|me)\/?(?:#\/?|\/)?([a-zA-Z0-9_.-]{20,})/i);
    if (sgMatch && sgMatch[1]) {
      // Signal hashes are CASE-SENSITIVE base64url. DO NOT lowerCase them as it causes duplicate collisions.
      return `signal:${sgMatch[1]}`;
    }
    // Fallback for custom or shorter signal links - preserve case and special characters to prevent collisions
    const fallback = trimmed.split('#').pop() || trimmed.split('/').pop() || 'custom';
    return `signal:custom_${fallback.replace(/[^a-zA-Z0-9_-]/g, '').slice(-64)}`;
  }

  let clean = trimmed.toLowerCase();
  clean = clean.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  
  // Remove query parameters and hash fragments (for other platforms)
  clean = clean.split('?')[0].split('#')[0];

  // WhatsApp: chat.whatsapp.com/invite/AbCdEf or chat.whatsapp.com/AbCdEf or whatsapp.com/channel/AbCdEf
  const waMatch = clean.match(/(?:chat\.whatsapp\.com|whatsapp\.com)\/(?:invite\/|channel\/)?([a-z0-9_-]+)/i);
  if (waMatch) return `whatsapp:${waMatch[1].toLowerCase()}`;

  // Telegram: t.me/joinchat/xxx or t.me/+xxx or t.me/username or telegram.me/... or telegram.dog/...
  const tgMatch = clean.match(/(?:t\.me|telegram\.me|telegram\.dog)\/(?:joinchat\/|\+|c\/)?([a-z0-9_+-]+)/i);
  if (tgMatch) return `telegram:${tgMatch[1].toLowerCase()}`;

  // Discord: discord.gg/xxx or discord.com/invite/xxx or discordapp.com/invite/xxx
  const dcMatch = clean.match(/(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/([a-z0-9_-]+)/i);
  if (dcMatch) return `discord:${dcMatch[1].toLowerCase()}`;

  // Reddit: reddit.com/r/subreddit or redd.it/subreddit
  const rdMatch = clean.match(/(?:reddit\.com\/r\/|redd\.it\/)([a-z0-9_]+)/i);
  if (rdMatch) return `reddit:${rdMatch[1].toLowerCase()}`;

  // Facebook: facebook.com/groups/xxx or fb.com/groups/xxx
  const fbMatch = clean.match(/(?:facebook\.com|fb\.com)\/groups\/([a-z0-9_.]+)/i);
  if (fbMatch) return `facebook:${fbMatch[1].toLowerCase()}`;

  // Snapchat: snapchat.com/add/xxx or snapchat.com/t/xxx
  const snapMatch = clean.match(/snapchat\.com\/(?:add\/|t\/)?([a-z0-9_.-]+)/i);
  if (snapMatch) return `snapchat:${snapMatch[1].toLowerCase()}`;

  return clean;
}

// Set of normalized generic titles that should NEVER cause duplicate blocking across different invite links
const GENERIC_NORMALIZED_TITLES = new Set([
  'whatsappgroup',
  'whatsappgroupinvite',
  'whatsappcommunity',
  'whatsappcommunitygroup',
  'joingroupchatonwhatsapp',
  'telegramgroup',
  'telegramchannel',
  'telegramcommunity',
  'discordserver',
  'discordcommunity',
  'jointhediscordserver',
  'facebookgroup',
  'facebookgroups',
  'facebookcommunitygroup',
  'redditcommunity',
  'redditgroup',
  'signalgroup',
  'signalsecurecommunity',
  'signalcommunity',
  'signalcommunitygroup',
  'signalsecuregroup',
  'signalsecuregroupinvite',
  'snapchatgroup',
  'snapchatcommunity',
  'snapchatcommunitygroup',
  'snapchatfriendsstoriesclub',
  'instagramgroup',
  'instagramcommunity',
  'instagramcommunitygroup',
  'onlinecommunity',
  'communitygroup',
  'generalcommunity',
  'discussiongroup',
  'newgroup',
  'group',
  'community',
  'mycommunity',
  'mysignalgroup',
  'mywhatsappgroup',
  'mytelegramgroup',
  'personalgroup',
  'privatecommunity',
  'securegroup',
]);

export function cleanCommunityTitle(title: string, platform?: string): string {
  if (!title) return '';
  let clean = title.trim();
  clean = clean
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s*–\s*Telegram(\s+(?:Group|Channel))?$/i, '')
    .replace(/\s*-\s*Telegram(\s+(?:Group|Channel))?$/i, '')
    .replace(/\s*\(Telegram(\s+(?:Group|Channel))?\)/gi, '')
    .replace(/^Telegram:\s*(?:Contact\s*@?|View\s*@?)?/i, '')
    .replace(/^(?:Contact|View)\s*@/i, '')
    .replace(/\s*\|\s*WhatsApp$/i, '')
    .replace(/\s*-\s*WhatsApp$/i, '')
    .replace(/\s*–\s*WhatsApp$/i, '')
    .replace(/\s*\(WhatsApp(\s+(?:Group|Channel))?\)/gi, '')
    .replace(/\s*\|\s*Discord$/i, '')
    .replace(/\s*-\s*Discord$/i, '')
    .replace(/\s*\(Discord(\s+(?:Server|Group))?\)/gi, '')
    .trim();

  // If title is just an all-lowercase alphanumeric handle, capitalize it cleanly
  if (/^[a-z][a-z0-9_]{2,}$/.test(clean)) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return clean;
}

export function isGenericGroupTitle(text: string): boolean {
  if (!text) return true;
  const clean = text.trim().toLowerCase();
  
  // Only flag as generic invite token if it's explicitly a random invite token starting with '+' or a 24+ char random token
  if (/^[+][a-zA-Z0-9_-]{12,}$/.test(clean) || (/^[a-zA-Z0-9_-]{24,}$/.test(clean) && /[0-9]/.test(clean) && /[a-z]/i.test(clean))) {
    return true;
  }

  return (
    clean === 'facebook' ||
    clean === 'facebook groups' ||
    clean === 'log in to facebook' ||
    clean === 'log into facebook' ||
    clean === 'log in or sign up to view' ||
    clean === 'log in or sign up' ||
    clean === 'sign up to view' ||
    clean === 'facebook - log in or sign up' ||
    clean === 'facebook – log in or sign up' ||
    clean.includes('log in to facebook') ||
    clean.includes('log into facebook') ||
    clean.includes('log in or sign up') ||
    clean.includes('sign up to view') ||
    clean === 'reddit' ||
    clean === 'reddit - dive into anything' ||
    clean === 'reddit: the front page of the internet' ||
    clean === 'whatsapp' ||
    clean === 'whatsapp group' ||
    clean === 'whatsapp group invite' ||
    clean === 'whatsapp community' ||
    clean === 'whatsapp community group' ||
    clean === 'join group chat on whatsapp' ||
    clean === 'whatsapp.com' ||
    clean.includes("looks like you don't have whatsapp") ||
    clean.includes("don't have whatsapp installed") ||
    clean.includes('download whatsapp') ||
    clean.includes('open in whatsapp') ||
    clean.includes('use whatsapp web') ||
    clean === 'whatsapp web' ||
    clean === 'group chat invite' ||
    clean === 'whatsapp group chat invite' ||
    clean.includes('continue to chat') ||
    clean.includes('join group chat on whatsapp') ||
    clean === 'telegram' ||
    clean === 'telegram channel' ||
    clean === 'telegram group' ||
    clean === 'telegram community' ||
    clean === 'telegram: contact' ||
    clean === 'telegram: join group chat' ||
    clean === 'join group chat on telegram' ||
    clean === 'join group chat' ||
    clean === 'join channel on telegram' ||
    clean === 'telegram: view channel' ||
    clean === 'telegram web' ||
    clean === 'telegram messenger' ||
    clean.startsWith('telegram: contact') ||
    clean.startsWith('telegram: join group chat') ||
    clean.startsWith('join group chat on telegram') ||
    clean.includes('join group chat on telegram') ||
    clean.includes('telegram: join group chat') ||
    clean === 'discord' ||
    clean === 'discord server' ||
    clean === 'join the discord server' ||
    clean === 'join the discord server!' ||
    clean === 'discord: organize, chat, have fun' ||
    clean.startsWith('discord: ') ||
    clean.startsWith('join the discord server') ||
    clean === 'signal' ||
    clean === 'signal group' ||
    clean === 'signal secure group' ||
    clean === 'signal community group' ||
    clean.includes('signal community group') ||
    clean === 'blocked' ||
    clean === 'security verification' ||
    clean === 'are you a robot?' ||
    clean === 'are you a human?' ||
    clean === 'just a moment...' ||
    clean.includes('are you a robot') ||
    clean.includes('robot verification') ||
    clean.includes('captcha') ||
    clean.includes('cloudflare') ||
    clean.includes('datadome') ||
    clean.includes('access denied') ||
    clean.includes('page not found') ||
    clean.includes('content not found') ||
    clean.includes('404 not found') ||
    clean.length < 2
  );
}

export function isGenericGroupDescription(text: string): boolean {
  if (!text) return true;
  const clean = text.trim().toLowerCase();
  return (
    clean === 'whatsapp group invite' ||
    clean === 'join group chat on whatsapp' ||
    clean.includes('you are invited to a group chat on telegram') ||
    clean.includes('if you have telegram') ||
    clean.includes('you can contact @') ||
    clean.includes('you can view and join') ||
    clean.includes('click to join:') ||
    clean.includes('log in to facebook') ||
    clean.includes('log into facebook') ||
    clean.includes('log in or sign up') ||
    clean.includes('sign up to view') ||
    clean.includes('see more of') ||
    clean.includes('facebook helps you connect') ||
    clean.includes('dive into anything') ||
    clean.includes('reddit is a network of communities') ||
    clean.includes('are you a robot') ||
    clean.includes('please verify that you are not a robot') ||
    clean.includes('security check') ||
    clean.includes('enable cookies') ||
    clean.includes('cloudflare') ||
    clean.includes('datadome') ||
    clean.includes('access denied') ||
    clean.length < 8
  );
}

function isGenericNormalizedTitle(normalized: string): boolean {
  if (!normalized || normalized.length < 4) return true;
  if (GENERIC_NORMALIZED_TITLES.has(normalized)) return true;
  if (normalized.startsWith('whatsappgroup') || normalized.startsWith('whatsappcommunity')) return true;
  if (normalized.startsWith('telegramgroup') || normalized.startsWith('telegramchannel')) return true;
  if (normalized.startsWith('discordserver') || normalized.startsWith('discordcommunity')) return true;
  if (normalized.startsWith('signalgroup') || normalized.startsWith('signalcommunity')) return true;
  if (normalized.startsWith('snapchatgroup') || normalized.startsWith('snapchatcommunity')) return true;
  if (normalized.startsWith('facebookgroup') || normalized.startsWith('facebookcommunity')) return true;
  if (normalized.startsWith('redditcommunity') || normalized.startsWith('redditgroup')) return true;
  if (normalized.includes('communitygroup')) return true;
  return false;
}

/**
 * Checks if a group already exists in the directory by canonical URL or title.
 * Prevents duplicate submissions.
 */
export function checkDuplicateCommunity(
  incoming: { url?: string; title?: string; platform?: Platform; id?: string },
  existingGroups: Group[]
): { isDuplicate: boolean; matchedGroup?: Group; reason?: string } {
  if (!Array.isArray(existingGroups) || existingGroups.length === 0) {
    return { isDuplicate: false };
  }

  const incomingUrl = (incoming.url || '').trim();
  const incomingTitle = (incoming.title || '').trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
  const incomingCanonical = extractCanonicalGroupIdentifier(incomingUrl, incoming.platform);

  for (const existing of existingGroups) {
    // Skip checking against itself if updating
    if (incoming.id && existing.id === incoming.id) continue;

    const existingUrl = (existing.url || '').trim();
    const existingCanonical = extractCanonicalGroupIdentifier(existingUrl, existing.platform);

    // 1. Direct canonical invite code match (authoritative uniqueness key)
    if (incomingCanonical && existingCanonical && incomingCanonical === existingCanonical) {
      return {
        isDuplicate: true,
        matchedGroup: existing,
        reason: `This community invite link is already listed as "${existing.title}".`,
      };
    }

    // 2. Direct clean URL match (exclude Signal as its hashes are case-sensitive)
    if (existing.platform !== 'signal' && incoming.platform !== 'signal') {
      const cleanIn = incomingUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
      const cleanEx = existingUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
      if (cleanIn && cleanEx && cleanIn === cleanEx) {
        return {
          isDuplicate: true,
          matchedGroup: existing,
          reason: `This group URL is already listed under "${existing.title}".`,
        };
      }
    }

    // 3. Exact normalized title match within the same platform IF title is non-generic (>= 6 alphanumeric chars)
    if (incomingTitle.length >= 6 && !isGenericNormalizedTitle(incomingTitle)) {
      const existingTitle = (existing.title || '').trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
      if (
        !isGenericNormalizedTitle(existingTitle) &&
        incomingTitle === existingTitle &&
        incoming.platform &&
        existing.platform === incoming.platform
      ) {
        return {
          isDuplicate: true,
          matchedGroup: existing,
          reason: `A community titled "${existing.title}" is already listed on ${existing.platform.toUpperCase()}.`,
        };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Deterministic pseudo-random number generator [0, 1) based on item ID and current hourly seed.
 * Ensures groups with zero real interactions rotate fairly and cleanly every single hour
 * without layout shifts during the same hour.
 */
export function getHourlyDeterministicRandom(id: string = '', salt: string = 'hourly'): number {
  const currentHourTimestamp = Math.floor(Date.now() / (3600 * 1000));
  const seedStr = `${id}-${currentHourTimestamp}-${salt}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 100000) / 100000;
}

/**
 * Calculates real-time 24-Hour Top Ranking Score based purely on REAL user interactions in today's cycle:
 * 1. 24h Real Shares (6.0x weight)
 * 2. 24h Real Upvotes (5.0x weight)
 * 3. 24h Real Joins / Clicks (3.0x weight)
 * Returns 0 if no real user activity has taken place in today's 24h cycle (no assumed or fabricated data).
 */
export function calculate24HourDailyScore(group: Group): number {
  const act = group.activity24h;
  const joins = (act && typeof act.joins === 'number') ? act.joins : 0;
  const upvotes = (act && typeof act.upvotes === 'number') ? act.upvotes : 0;
  const shares = (act && typeof act.shares === 'number') ? act.shares : 0;
  
  if (joins === 0 && upvotes === 0 && shares === 0) {
    return 0;
  }

  // Pure real user activity calculation:
  return Math.round((shares * 6.0) + (upvotes * 5.0) + (joins * 3.0));
}

/**
 * Calculates real-time 7-Day / Weekly Ranking Score based purely on REAL user interactions:
 * 1. Real Shares (6.0x weight)
 * 2. Real Upvotes (5.0x weight)
 * 3. Real Clicks / Joins (3.0x weight)
 * 4. Real Bookmarks (2.0x weight)
 * Returns 0 if all real user activity metrics are 0.
 */
export function calculate7DayScore(group: Group): number {
  const shares = typeof group.shares === 'number' ? group.shares : 0;
  const upvotes = typeof group.upvotes === 'number' ? group.upvotes : 0;
  const clicks = typeof group.clicks === 'number' ? group.clicks : 0;
  const bookmarks = typeof group.bookmarks === 'number' ? group.bookmarks : 0;

  if (shares === 0 && upvotes === 0 && clicks === 0 && bookmarks === 0) {
    return 0;
  }

  return Math.round((shares * 6.0) + (upvotes * 5.0) + (clicks * 3.0) + (bookmarks * 2.0));
}

/**
 * Returns the expiration details of the current 24-Hour ranking cycle (resets every 24 hours at 00:00 UTC)
 */
export function get24HourCycleExpiration(): { expiresAt: Date; expiresIso: string; formatted: string; hoursLeft: number; minutesLeft: number } {
  const now = new Date();
  const tomorrowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const diffMs = Math.max(0, tomorrowUtc.getTime() - now.getTime());
  const diffMins = Math.max(1, Math.floor(diffMs / 60000));
  const hoursLeft = Math.floor(diffMins / 60);
  const minutesLeft = diffMins % 60;
  
  const formatted = hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m left` : `${minutesLeft}m left`;

  return {
    expiresAt: tomorrowUtc,
    expiresIso: tomorrowUtc.toISOString(),
    formatted,
    hoursLeft,
    minutesLeft,
  };
}

/**
 * Injects the 24-Hour Top Ranked community into the 3rd place (index 2) of a group list.
 * Prioritizes groups with real 24h user activity; falls back to hourly deterministic rotation if all scores are 0.
 */
export function inject24HourTopRankedInThirdPlace(groups: Group[]): Group[] {
  if (!Array.isArray(groups) || groups.length < 3) return groups;

  const cycle = get24HourCycleExpiration();
  const listCopy = [...groups];

  // Check if an item is already tagged as isDailyTopRanked
  let topRankedIndex = listCopy.findIndex(g => g.isDailyTopRanked);

  // If not tagged, find the group with the highest 24-hour daily real score
  if (topRankedIndex === -1) {
    let bestScore = 0;
    let bestIdx = -1;

    listCopy.forEach((g, idx) => {
      const score = calculate24HourDailyScore(g);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });

    // If no group has real 24h score > 0, rotate top group based on hourly deterministic random
    if (bestIdx === -1) {
      let bestRandom = -1;
      listCopy.forEach((g, idx) => {
        const rnd = getHourlyDeterministicRandom(g.id || g.slug || '', '3rd_place_hourly');
        if (rnd > bestRandom) {
          bestRandom = rnd;
          bestIdx = idx;
        }
      });
    }

    topRankedIndex = bestIdx !== -1 ? bestIdx : 0;
  }

  if (topRankedIndex === -1 || topRankedIndex >= listCopy.length) return listCopy;

  // Extract the top ranked group
  const [topGroup] = listCopy.splice(topRankedIndex, 1);

  const crownedGroup: Group = {
    ...topGroup,
    isDailyTopRanked: true,
    dailyRankScore: calculate24HourDailyScore(topGroup),
    dailyRankExpiresAt: cycle.expiresIso,
  };

  // Place it directly at 3rd place (index 2)
  listCopy.splice(2, 0, crownedGroup);
  return listCopy;
}

export function generateSlug(title: string): string {
  if (!title || !title.trim()) {
    return `community-${Date.now().toString(36)}`;
  }

  const cleanTitle = title.trim().toLowerCase();

  // 1. Unicode letters and numbers support (e.g. Hindi Devanagari, Arabic, Tamil, etc.)
  try {
    const unicodeSlug = cleanTitle
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (unicodeSlug && unicodeSlug.length >= 1) {
      return unicodeSlug;
    }
  } catch {
    // Fallback if environment doesn't support unicode property escapes
  }

  // 2. ASCII fallback
  const asciiSlug = cleanTitle
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (asciiSlug && asciiSlug.length >= 1) {
    return asciiSlug;
  }

  // 3. Guaranteed non-empty unique fallback
  return `community-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

export function isAdultGroup(group: { 
  category?: string; 
  isNsfw?: boolean; 
  title?: string; 
  description?: string; 
  customTags?: string[]; 
  url?: string;
  rulesSummary?: string;
}): boolean {
  if (!group) return false;
  // A group is strictly adult only if explicitly flagged as NSFW or assigned to the Adult / 18+ category
  return Boolean(group.isNsfw || group.category === 'Adult / 18+');
}

export function getRankBadgeColor(rank: number): { bg: string; text: string; border: string } {
  if (rank === 1) return { bg: 'bg-amber-400 text-amber-950 font-bold shadow-amber-500/20 shadow-md', text: 'text-amber-500', border: 'border-amber-400' };
  if (rank === 2) return { bg: 'bg-slate-300 text-slate-900 font-bold shadow-slate-400/20 shadow-md', text: 'text-slate-400', border: 'border-slate-300' };
  if (rank === 3) return { bg: 'bg-amber-700 text-amber-50 font-bold shadow-amber-800/20 shadow-md', text: 'text-amber-700', border: 'border-amber-700' };
  return { bg: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium', text: 'text-neutral-500', border: 'border-neutral-200 dark:border-neutral-700' };
}

export function isGroupCurrentlySticky(
  group: { isSticky?: boolean; isPromoted?: boolean; isDirectPromoted?: boolean; stickyUntil?: string },
  forDirectPromotedPage: boolean = false
): boolean {
  if (!group.isSticky && !group.isPromoted) return false;
  if (!forDirectPromotedPage && group.isDirectPromoted) return false;
  if (forDirectPromotedPage && !group.isDirectPromoted) return false;
  if (!group.stickyUntil) return true; // sticky without timer
  if (typeof group.stickyUntil === 'string' && group.stickyUntil.trim() === '') return false;
  const expireTime = new Date(group.stickyUntil).getTime();
  return !isNaN(expireTime) && expireTime > Date.now();
}

export function getRemainingStickyTime(param?: string | { stickyUntil?: string }): { 
  formatted: string; 
  isExpired: boolean; 
  totalMinutes: number;
  isUrgent: boolean;
} {
  const stickyUntilStr = typeof param === 'string' ? param : (param && typeof param === 'object' ? param.stickyUntil : undefined);
  if (!stickyUntilStr) {
    return { formatted: 'Pinned Indefinitely', isExpired: false, totalMinutes: 999999, isUrgent: false };
  }

  const target = new Date(stickyUntilStr).getTime();
  const now = Date.now();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return { formatted: 'Expired', isExpired: true, totalMinutes: 0, isUrgent: true };
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(diffMins / (60 * 24));
  const hours = Math.floor((diffMins % (60 * 24)) / 60);
  const minutes = diffMins % 60;

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m left`;
  } else {
    formatted = `${minutes}m left`;
  }

  return {
    formatted,
    isExpired: false,
    totalMinutes: diffMins,
    isUrgent: diffMins <= 60
  };
}

export function mergeGroupsWithStickyRanks(stickyGroups: Group[], nonStickyGroups: Group[]): Group[] {
  if (stickyGroups.length === 0) return nonStickyGroups;
  if (nonStickyGroups.length === 0) {
    return [...stickyGroups].sort((a, b) => {
      const orderA = a.stickyOrder && a.stickyOrder > 0 ? a.stickyOrder : 999;
      const orderB = b.stickyOrder && b.stickyOrder > 0 ? b.stickyOrder : 999;
      if (orderA !== orderB) return orderA - orderB;
      const timeA = a.stickyUntil ? new Date(a.stickyUntil).getTime() : 0;
      const timeB = b.stickyUntil ? new Date(b.stickyUntil).getTime() : 0;
      return timeB - timeA;
    });
  }

  const sortedSticky = [...stickyGroups].sort((a, b) => {
    const orderA = a.stickyOrder && a.stickyOrder > 0 ? a.stickyOrder : 999;
    const orderB = b.stickyOrder && b.stickyOrder > 0 ? b.stickyOrder : 999;
    if (orderA !== orderB) return orderA - orderB;
    const timeA = a.stickyUntil ? new Date(a.stickyUntil).getTime() : 0;
    const timeB = b.stickyUntil ? new Date(b.stickyUntil).getTime() : 0;
    return timeB - timeA;
  });

  const resultSlots: (Group | null)[] = [];
  const nonStickyQueue = [...nonStickyGroups];

  for (const sGroup of sortedSticky) {
    let targetIndex = (sGroup.stickyOrder && sGroup.stickyOrder > 0 ? sGroup.stickyOrder : 1) - 1;
    while (resultSlots[targetIndex] !== undefined) {
      targetIndex++;
    }
    resultSlots[targetIndex] = sGroup;
  }

  const finalMerged: Group[] = [];
  const totalItemsCount = stickyGroups.length + nonStickyGroups.length;
  let i = 0;

  while (finalMerged.length < totalItemsCount) {
    if (resultSlots[i] !== undefined && resultSlots[i] !== null) {
      finalMerged.push(resultSlots[i]!);
    } else if (nonStickyQueue.length > 0) {
      finalMerged.push(nonStickyQueue.shift()!);
    } else {
      const nextSticky = resultSlots.slice(i).find((item): item is Group => item !== null && item !== undefined);
      if (nextSticky) {
        finalMerged.push(nextSticky);
        const idx = resultSlots.indexOf(nextSticky);
        if (idx !== -1) resultSlots[idx] = null;
      } else {
        break;
      }
    }
    i++;
  }

  return finalMerged;
}

export function sortGroupsWithSticky(
  groups: Group[], 
  sortOption: SortOption = 'newest', 
  isAdultContext: boolean = false,
  injectDailyTopRanked: boolean = true
): Group[] {
  const stickyGroups: Group[] = [];
  const nonStickyGroups: Group[] = [];

  for (const g of groups) {
    const isAdult = isAdultGroup(g);
    if (isGroupCurrentlySticky(g)) {
      if (isAdult) {
        // Adult groups are ONLY displayed as sticky promotions in adult categories & adult filters
        if (isAdultContext) {
          stickyGroups.push(g);
        } else {
          nonStickyGroups.push(g);
        }
      } else {
        if (!isAdultContext) {
          stickyGroups.push(g);
        } else {
          nonStickyGroups.push(g);
        }
      }
    } else {
      nonStickyGroups.push(g);
    }
  }

  nonStickyGroups.sort((a, b) => {
    if (sortOption === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortOption === 'trending' || sortOption === 'rank_index') {
      const scoreA = calculatePopularityScore(a.clicks, a.upvotes, a.memberCount, a.growthRate, a.rankScore || 80);
      const scoreB = calculatePopularityScore(b.clicks, b.upvotes, b.memberCount, b.growthRate, b.rankScore || 80);
      return scoreB - scoreA;
    } else if (sortOption === 'popularity') {
      return (b.clicks + b.upvotes * 2) - (a.clicks + a.upvotes * 2);
    } else if (sortOption === 'members') {
      return b.memberCount - a.memberCount;
    } else if (sortOption === 'growth') {
      return b.growthRate - a.growthRate;
    } else if (sortOption === 'upvotes') {
      return b.upvotes - a.upvotes;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const merged = mergeGroupsWithStickyRanks(stickyGroups, nonStickyGroups);
  return injectDailyTopRanked ? inject24HourTopRankedInThirdPlace(merged) : merged;
}

export function getJoinButtonLabel(
  platformOrGroup: Platform | string | { platform?: Platform | string; url?: string; isBot?: boolean; title?: string },
  isBot?: boolean
): string {
  let platform: string = 'other';
  let url = '';
  let botFlag = Boolean(isBot);

  if (typeof platformOrGroup === 'object' && platformOrGroup !== null) {
    platform = String(platformOrGroup.platform || 'other').toLowerCase();
    url = String(platformOrGroup.url || '').toLowerCase();
    if (platformOrGroup.isBot) botFlag = true;
  } else {
    platform = String(platformOrGroup || 'other').toLowerCase();
  }

  if (botFlag) return 'Open Telegram Bot';

  switch (platform) {
    case 'discord':
      return 'Join Discord Server';
    case 'telegram':
      if (url.includes('/s/') || url.includes('/channel/')) {
        return 'Join Telegram Channel';
      }
      return 'Join Telegram Channel';
    case 'whatsapp':
      if (url.includes('/channel/')) {
        return 'Follow WhatsApp Channel';
      }
      return 'Join WhatsApp Group';
    case 'facebook':
      return 'Join Facebook Group';
    case 'signal':
      return 'Join Signal Group';
    case 'instagram':
      if (url.includes('/channel/')) {
        return 'Join Instagram Channel';
      }
      return 'Join Instagram Group';
    case 'snapchat':
      return 'Join Snapchat Group';
    case 'reddit':
      return 'Join Reddit Community';
    default:
      return 'Join Community';
  }
}

/**
 * Returns proper singular platform entity label (e.g., "Reddit Community", "Discord Server", "WhatsApp Group", "Telegram Channel", "Instagram Group")
 */
export function getPlatformEntityLabel(platform: Platform | string, isBot?: boolean): string {
  if (isBot) return 'Telegram Bot';
  switch (platform) {
    case 'reddit':
      return 'Reddit Community';
    case 'discord':
      return 'Discord Server';
    case 'telegram':
      return 'Telegram Channel';
    case 'whatsapp':
      return 'WhatsApp Group';
    case 'facebook':
      return 'Facebook Group';
    case 'signal':
      return 'Signal Group';
    case 'instagram':
      return 'Instagram Group';
    case 'snapchat':
      return 'Snapchat Group';
    default:
      return 'Community';
  }
}

/**
 * Returns proper plural platform entity label (e.g., "Reddit Communities", "Discord Servers", "WhatsApp Groups", "Telegram Channels", "Instagram Groups")
 */
export function getPlatformPluralLabel(platform: Platform | string): string {
  switch (platform) {
    case 'reddit':
      return 'Reddit Communities';
    case 'discord':
      return 'Discord Servers';
    case 'telegram':
      return 'Telegram Channels';
    case 'whatsapp':
      return 'WhatsApp Groups';
    case 'facebook':
      return 'Facebook Groups';
    case 'signal':
      return 'Signal Groups';
    case 'instagram':
      return 'Instagram Groups';
    case 'snapchat':
      return 'Snapchat Groups';
    default:
      return 'Communities';
  }
}

/**
 * Returns canonical directory listing route URL for each platform
 */
export function getPlatformListingUrl(platform: Platform | string): string {
  switch (platform) {
    case 'reddit':
      return '/reddit-communities';
    case 'discord':
      return '/discord-servers';
    case 'telegram':
      return '/telegram-channels';
    case 'whatsapp':
      return '/whatsapp-groups';
    case 'facebook':
      return '/facebook-groups';
    case 'signal':
      return '/signal-groups';
    case 'instagram':
      return '/instagram-groups';
    case 'snapchat':
      return '/snapchat-groups';
    default:
      return '/';
  }
}

/**
 * Extracts subreddit name (e.g., "sipstea", "Damnthatsinteresting") from group URL, handle, slug, or title.
 */
export function getRedditSubredditName(group: { url?: string; platformHandle?: string; title?: string; slug?: string }): string {
  if (group.url) {
    const match = group.url.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)/i) || group.url.match(/redd\.it\/([a-zA-Z0-9_]+)/i);
    if (match && match[1]) return match[1];
  }
  if (group.platformHandle) {
    return group.platformHandle.replace(/^r\//i, '').replace(/^\/+/, '');
  }
  if (group.title) {
    const match = group.title.match(/r\/([a-zA-Z0-9_]+)/i);
    if (match && match[1]) return match[1];
  }
  if (group.slug) {
    const match = group.slug.match(/r-([a-z0-9_]+)/i) || group.slug.match(/^([a-z0-9_]+)-community-reddit/i);
    if (match && match[1]) return match[1];
  }
  return '';
}

/**
 * Returns clean Reddit display title (e.g. "SipsTea" or "Damn, that's interesting!").
 */
export function getRedditDisplayTitle(group: { title: string; url?: string; platformHandle?: string; slug?: string }): string {
  let title = (group.title || '').trim();
  
  // Strip trailing "• r/Subreddit" or "- r/Subreddit"
  title = title.replace(/\s*[•|-]\s*r\/[a-zA-Z0-9_]+/gi, '');
  // Strip leading "r/Subreddit •" or "r/Subreddit -"
  title = title.replace(/^r\/[a-zA-Z0-9_]+\s*[-:•]\s*/gi, '');
  // Strip "Reddit Community" or "Community" suffix if preceded by a title
  if (title.length > 15 && /\s+(?:Reddit\s+Community|Community)$/i.test(title)) {
    title = title.replace(/\s+(?:Reddit\s+Community|Community)$/i, '').trim();
  }
  title = title.trim();

  if (!title || /^r\/[a-zA-Z0-9_]+$/i.test(title)) {
    const sub = getRedditSubredditName(group);
    if (sub) {
      // Capitalize first letter or camelCase
      return sub.charAt(0).toUpperCase() + sub.slice(1);
    }
    return group.title;
  }

  return title;
}

/**
 * Standardized Reddit subtitle:
 * "r/[subreddit] also known as Reddit community [Title]"
 * e.g. "r/sipstea also known as Reddit community SipsTea"
 */
export function getRedditCommunitySubtitle(group: { title: string; url?: string; platformHandle?: string; slug?: string }): string {
  const subName = getRedditSubredditName(group);
  const displayTitle = getRedditDisplayTitle(group);
  
  if (subName) {
    const cleanSub = subName.toLowerCase().startsWith('r/') ? subName : `r/${subName}`;
    return `${cleanSub} also known as Reddit community ${displayTitle}`;
  }
  return `Reddit community ${displayTitle}`;
}

/**
 * Returns distinct brand-colored button styling for each chat / social platform
 * e.g. WhatsApp is WhatsApp Emerald Green, Telegram is Sky Blue, Discord is Blurple, etc.
 */
export function getPlatformJoinButtonClasses(platform: Platform): string {
  switch (platform) {
    case 'whatsapp':
      return 'bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-emerald-500/20';
    case 'telegram':
      return 'bg-[#229ED9] hover:bg-[#1d8cc2] text-white shadow-sky-500/20';
    case 'discord':
      return 'bg-[#5865F2] hover:bg-[#4752c4] text-white shadow-indigo-500/20';
    case 'facebook':
      return 'bg-[#1877F2] hover:bg-[#1567d3] text-white shadow-blue-500/20';
    case 'signal':
      return 'bg-[#3A76F0] hover:bg-[#2c65db] text-white shadow-blue-500/20';
    case 'snapchat':
      return 'bg-[#FFFC00] hover:bg-[#e6e300] text-black font-black shadow-yellow-500/20';
    case 'reddit':
      return 'bg-[#FF4500] hover:bg-[#d93a00] text-white shadow-orange-500/20';
    default:
      return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20';
  }
}

const UPVOTED_GROUPS_STORAGE_KEY = 'nexus_user_upvoted_group_ids';

export function getUpvotedGroupIds(): string[] {
  try {
    const raw = localStorage.getItem(UPVOTED_GROUPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasUserUpvotedGroup(groupId: string): boolean {
  const ids = getUpvotedGroupIds();
  return ids.includes(groupId);
}

export function toggleUserUpvoteGroup(groupId: string): { isUpvoted: boolean; upvotedIds: string[] } {
  try {
    const current = getUpvotedGroupIds();
    let updated: string[];
    let isUpvoted: boolean;

    if (current.includes(groupId)) {
      // Remove upvote (toggle off)
      updated = current.filter(id => id !== groupId);
      isUpvoted = false;
    } else {
      // Add upvote (1 per person)
      updated = [...current, groupId];
      isUpvoted = true;
    }

    localStorage.setItem(UPVOTED_GROUPS_STORAGE_KEY, JSON.stringify(updated));
    return { isUpvoted, upvotedIds: updated };
  } catch (err) {
    console.error('Error toggling upvote in storage:', err);
    return { isUpvoted: false, upvotedIds: [] };
  }
}

/**
 * Converts a category name to a clean, URL-safe slug.
 */
export function categoryToSlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves a URL slug to an exact Category type, or null if invalid.
 */
export function resolveCategoryFromSlug(slug: string): Category | null {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug).toLowerCase().replace(/[-_]/g, ' ').trim();
  const matched = CATEGORIES.find(c => {
    const norm = c.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const slugNorm = decoded.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    return norm === slugNorm || norm.replace(/\s+/g, '') === slugNorm.replace(/\s+/g, '');
  });
  return (matched as Category) || null;
}

/**
 * Detects if a community item is a bot (e.g. Telegram Bot)
 */
export function isBotCommunity(group: {
  platform?: string;
  customTags?: string[];
  url?: string;
  title?: string;
  category?: string;
  description?: string;
}): boolean {
  if (group.customTags?.some(t => t.toLowerCase().includes('bot'))) return true;
  if (group.title?.toLowerCase().includes('bot') && (group.platform === 'telegram' || !group.platform)) return true;
  if (group.url?.toLowerCase().includes('bot') || group.url?.toLowerCase().includes('?start=')) return true;
  return false;
}

/**
 * Returns the route prefix based on community type:
 * /group/ for WhatsApp group, Telegram group, Signal group, Facebook group, Snapchat group
 * /server/ for Discord server
 * /bot/ for Telegram bot
 * /community/ for Reddit community
 */
export function getGroupRoutePrefix(group: {
  platform?: Platform | string;
  customTags?: string[];
  url?: string;
  title?: string;
  category?: string;
  description?: string;
}): 'group' | 'server' | 'bot' | 'community' {
  if (group.platform === 'discord') return 'server';
  if (group.platform === 'reddit') return 'community';
  if (group.platform === 'telegram' && isBotCommunity(group)) return 'bot';
  return 'group';
}

/**
 * Converts a country/region name to a clean, URL-safe slug.
 */
export function countryToSlug(country: string): string {
  return country
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves a URL slug to a Region/Country name, or formatted name if valid.
 */
export function resolveCountryFromSlug(slug: string): string | null {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug).toLowerCase().replace(/[-_]/g, ' ').trim();
  const matched = REGIONS.find(r => {
    const norm = r.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const slugNorm = decoded.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    return norm === slugNorm || norm.replace(/\s+/g, '') === slugNorm.replace(/\s+/g, '');
  });
  if (matched) return matched;
  // If not in predefined list, capitalize words
  if (decoded.length >= 2) {
    return decoded
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return null;
}

/**
 * Converts a language name to a clean, URL-safe slug.
 */
export function languageToSlug(language: string): string {
  return language
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves a URL slug to a Language name, or formatted name if valid.
 */
export function resolveLanguageFromSlug(slug: string): string | null {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug).toLowerCase().replace(/[-_]/g, ' ').trim();
  const matched = LANGUAGES.find(l => {
    const norm = l.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const slugNorm = decoded.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    return norm === slugNorm || norm.replace(/\s+/g, '') === slugNorm.replace(/\s+/g, '');
  });
  if (matched) return matched;
  if (decoded.length >= 2) {
    return decoded
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return null;
}

/**
 * Converts a tag name to a clean, URL-safe slug.
 */
export function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves a tag slug to clean tag format.
 */
export function resolveTagFromSlug(slug: string): string | null {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug).toLowerCase().replace(/^#+/, '').replace(/[^a-z0-9-_]/g, '').trim();
  return decoded || null;
}

/**
 * Generates the specific canonical relative path for a group:
 * - /server/[slug] (Discord server)
 * - /bot/[slug] (Telegram bot)
 * - /community/[slug] (Reddit community)
 * - /group/[slug] (WhatsApp, Telegram group, Signal, Facebook, Snapchat)
 */
export function getGroupUrlPath(group: {
  id: string;
  slug?: string;
  platform?: Platform | string;
  customTags?: string[];
  url?: string;
  title?: string;
  category?: string;
  description?: string;
}): string {
  const prefix = getGroupRoutePrefix(group);
  const titleSlug = (group.title && !isGenericGroupTitle(group.title)) ? generateSlug(group.title) : '';
  const identifier = titleSlug || group.slug || group.id;
  return `/${prefix}/${identifier}`;
}

/**
 * Resolves or deterministically calculates a positive numeric ID for a group.
 * Ensures URLs or string identifiers (e.g. 'grp-lang-assamese-2', 'grp-1788058308286-i0jpf')
 * are never used in routing parameters for /join or /rules.
 */
export function getNumericGroupId(
  groupOrId?: { id?: string | number; numericId?: number; slug?: string; [key: string]: any } | string | number | null
): number {
  if (!groupOrId) return 0;
  if (typeof groupOrId === 'number' && Number.isFinite(groupOrId)) {
    return Math.abs(Math.floor(groupOrId));
  }
  if (typeof groupOrId === 'object') {
    if (typeof groupOrId.numericId === 'number' && Number.isFinite(groupOrId.numericId) && groupOrId.numericId > 0) {
      return Math.floor(groupOrId.numericId);
    }
    if (groupOrId.id !== undefined && groupOrId.id !== null) {
      return getNumericGroupId(groupOrId.id);
    }
    if (groupOrId.slug) {
      return getNumericGroupId(groupOrId.slug);
    }
    return 0;
  }
  const str = String(groupOrId).trim();
  if (!str) return 0;
  if (/^\d+$/.test(str)) {
    const parsed = parseInt(str, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // Deterministic FNV-1a 31-bit positive integer (1 to 2,147,483,646)
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const positive = (hash >>> 0) % 2147483647;
  return positive === 0 ? 1 : positive;
}

/**
 * Generates the relative path for a group's rules page:
 * Canonical: /rules?join-id={NUMERIC_ID}
 * Always uses positive numeric ID (e.g. join-id=1234), never URLs or string identifiers.
 */
export function getGroupRulesPath(group: {
  id?: string | number;
  numericId?: number;
  slug?: string;
  platform?: Platform | string;
  customTags?: string[];
  url?: string;
  title?: string;
  category?: string;
  description?: string;
}): string {
  const numericId = getNumericGroupId(group);
  const path = numericId ? `/rules?join-id=${numericId}` : '/rules';

  if (typeof window !== 'undefined') {
    const host = window.location.host.toLowerCase();
    if (host.startsWith('adult.') || host.includes('adult.grouplinks.app')) {
      return `https://grouplinks.app${path}`;
    }
  }
  return path;
}

/**
 * Generates the relative path for a group's join gateway page:
 * Canonical: /join?join-id={NUMERIC_ID}
 * Always uses positive numeric ID (e.g. join-id=1234), never URLs or string identifiers.
 */
export function getGroupJoinPath(group: {
  id?: string | number;
  numericId?: number;
  slug?: string;
  platform?: Platform | string;
  customTags?: string[];
  url?: string;
  title?: string;
  category?: string;
  description?: string;
}): string {
  const numericId = getNumericGroupId(group);
  const path = numericId ? `/join?join-id=${numericId}` : '/join';

  if (typeof window !== 'undefined') {
    const host = window.location.host.toLowerCase();
    if (host.startsWith('adult.') || host.includes('adult.grouplinks.app')) {
      return `https://grouplinks.app${path}`;
    }
  }
  return path;
}

export const DEFAULT_AUTHOR_NAME = 'Anonymous Visitor';

/**
 * Returns formatted author name with fallback to 'Anonymous Visitor'
 */
export function getAuthorName(authorName?: string): string {
  if (!authorName || !authorName.trim()) {
    return DEFAULT_AUTHOR_NAME;
  }
  return authorName.trim();
}

/**
 * Formats a published/creation date into an elegant readable string (e.g. "Aug 28, 2026")
 * Uses UTC methods for deterministic matching between SSR (server) and client in any timezone.
 */
const FORMATTED_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatPublishedDate(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    const month = FORMATTED_MONTHS[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    return `${month} ${day}, ${year}`;
  } catch {
    return 'Recently';
  }
}

export { getCategoryFallbackImage, resolveValidGroupImage, isUnsplashUrl } from './categoryImages';
import { getCategoryFallbackImage, isUnsplashUrl } from './categoryImages';

/**
 * Optimizes image URLs to serve modern WebP/AVIF formats at exact display dimensions.
 * Strictly avoids Unsplash: if an Unsplash link or empty URL is provided,
 * seamlessly returns a category-related unique SVG image in 0ms with CLS = 0.
 */
/**
 * Checks if a given image URL belongs to external social CDNs that block server-side
 * optimization proxies or hotlinking when referer is sent.
 */
export function isExternalSocialCdn(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.toLowerCase();
  return (
    clean.includes('redditmedia.com') ||
    clean.includes('redd.it') ||
    clean.includes('telesco.pe') ||
    clean.includes('t.me') ||
    clean.includes('whatsapp.net') ||
    clean.includes('fbcdn.net') ||
    clean.includes('cdninstagram.com') ||
    clean.includes('telegram.org')
  );
}

/**
 * Sanitizes and normalizes an image URL:
 * - Decodes HTML entities like &amp; to &
 * - Normalizes protocol-relative // to https://
 */
export function sanitizeImageUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim().replace(/&amp;/g, '&');
  if (clean.startsWith('//')) {
    clean = `https:${clean}`;
  }
  return clean;
}

export function optimizeImageUrl(
  url?: string, 
  width: number = 300, 
  quality: number = 75,
  category?: string,
  title?: string,
  isBanner: boolean = false
): string {
  if (!url || typeof url !== 'string') {
    return getCategoryFallbackImage(category, isBanner, title);
  }
  const trimmed = sanitizeImageUrl(url);
  if (!trimmed || trimmed.includes('unsplash.com')) {
    return getCategoryFallbackImage(category, isBanner, title);
  }

  return trimmed;
}

/**
 * Zero-storage, 100% copyright-free deterministic SVG avatar generator.
 * Creates an instant data:image/svg+xml Data URI based on platform gradient,
 * community initials, and platform watermark.
 * Requires 0 external network requests, 0 server disk storage, and never expires.
 */
export function getCommunityFallbackAvatar(
  title?: string,
  platform?: string,
  id?: string | number
): string {
  const cleanTitle = (title || 'Community').trim();
  const words = cleanTitle.split(/\s+/).filter(Boolean);
  let initials = 'C';
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length > 0) {
    initials = words[0].slice(0, 2).toUpperCase();
  }

  const plat = (platform || 'other').toLowerCase();
  let gradStart = '#6366f1';
  let gradEnd = '#4338ca';
  let badgeSymbol = '👥';

  if (plat === 'telegram') {
    gradStart = '#0284c7';
    gradEnd = '#0369a1';
    badgeSymbol = '✈';
  } else if (plat === 'whatsapp') {
    gradStart = '#059669';
    gradEnd = '#047857';
    badgeSymbol = '💬';
  } else if (plat === 'discord') {
    gradStart = '#5865f2';
    gradEnd = '#4752c4';
    badgeSymbol = '🎮';
  } else if (plat === 'reddit') {
    gradStart = '#ea580c';
    gradEnd = '#c2410c';
    badgeSymbol = '🤖';
  } else if (plat === 'facebook') {
    gradStart = '#2563eb';
    gradEnd = '#1d4ed8';
    badgeSymbol = '🌐';
  } else if (plat === 'signal') {
    gradStart = '#3b82f6';
    gradEnd = '#1d4ed8';
    badgeSymbol = '🔒';
  } else if (plat === 'snapchat') {
    gradStart = '#eab308';
    gradEnd = '#ca8a04';
    badgeSymbol = '👻';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${gradStart}"/><stop offset="100%" stop-color="${gradEnd}"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g)"/><circle cx="106" cy="22" r="14" fill="#ffffff" fill-opacity="0.25"/><text x="106" y="27" font-size="13" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" text-anchor="middle" fill="#ffffff">${badgeSymbol}</text><text x="64" y="74" font-size="44" font-weight="800" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" text-anchor="middle" fill="#ffffff" letter-spacing="-1">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Extracts and cleans valid community URLs from raw text blocks, CSVs, or multi-line files.
 * Supports full URLs with http(s) as well as bare domain links (chat.whatsapp.com, t.me, discord.gg, etc.).
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  const uniqueUrls: string[] = [];
  const seen = new Set<string>();

  const addUrlIfValid = (candidate: string) => {
    let clean = candidate.trim().replace(/^["']|["']$/g, '').replace(/[.,;!?)]+$/, '').trim();
    if (!clean) return;

    // If it starts with common community domains without protocol, add https://
    const bareDomainRegex = /^(chat\.whatsapp\.com|whatsapp\.com\/channel|t\.me|telegram\.me|telegram\.dog|discord\.gg|discord\.com\/invite|discordapp\.com\/invite|reddit\.com\/r|facebook\.com\/groups|fb\.com\/groups|signal\.group|snapchat\.com\/add)/i;
    if (bareDomainRegex.test(clean)) {
      clean = `https://${clean}`;
    }

    // Must be http/https URL now
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return;
    }

    try {
      const parsed = new URL(clean);
      if (!parsed.hostname || parsed.hostname.length < 3) return;

      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueUrls.push(clean);
      }
    } catch {
      // Invalid URL format
    }
  };

  // 1. Process line by line (supports CSV, tab-separated, comma-separated lists)
  const lines = text.split(/\r\n|\r|\n/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check if line contains CSV tokens
    const tokens = trimmedLine.split(/[\t,;|\s]+/);
    for (const token of tokens) {
      if (
        token.includes('http://') ||
        token.includes('https://') ||
        token.includes('whatsapp.com') ||
        token.includes('t.me') ||
        token.includes('telegram.me') ||
        token.includes('discord.gg') ||
        token.includes('discord.com') ||
        token.includes('reddit.com') ||
        token.includes('facebook.com') ||
        token.includes('signal.group') ||
        token.includes('snapchat.com')
      ) {
        addUrlIfValid(token);
      }
    }
  }

  // 2. Also run comprehensive regex sweep across entire text block to catch any embedded URLs
  const regexPattern = /(https?:\/\/[^\s<>"'{}|\\^`[\]]+|(?:chat\.whatsapp\.com|whatsapp\.com\/channel|t\.me|telegram\.me|discord\.gg|discord\.com\/invite|reddit\.com\/r|facebook\.com\/groups|signal\.group|snapchat\.com\/add)\/[^\s<>"'{}|\\^`[\]]+)/gi;
  const matches = text.match(regexPattern) || [];
  for (const match of matches) {
    addUrlIfValid(match);
  }

  return uniqueUrls;
}

/**
 * Safely fetches a URL and parses JSON response, preventing "Unexpected token '<'" SyntaxError
 * when the server returns an HTML error page (e.g. 504 Gateway Timeout or 404).
 */
export async function safeFetchJson(url: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!text || !text.trim()) {
      return {
        ok: res.ok,
        status: res.status,
        data: null,
        error: res.ok ? undefined : `Request failed with status ${res.status} (empty response)`,
      };
    }
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      if (text.trim().startsWith('<')) {
        return {
          ok: false,
          status: res.status || 500,
          data: null,
          error: `Server error (${res.status || 500}): HTML response received instead of JSON`,
        };
      }
      data = { rawText: text };
    }
    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok ? undefined : (data?.error || data?.message || `Request failed with status ${res.status}`),
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      data: null,
      error: err?.message || 'Network request failed',
    };
  }
}
export { isGenericGroupImage } from '../lib/metadata-scraper';
