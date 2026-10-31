/**
 * Ad Management & Delivery Engine
 * Handles ad placement rendering, targeting (everywhere vs. safe-places only),
 * custom ad code injection, banner clicks/impressions, global/user show-hide controls, and local persistence.
 */

import { AdPlacement, AdSlot } from '../types';

const ADS_STORAGE_KEY = 'nexus_ad_placements_v1';
const GLOBAL_ADS_VISIBILITY_KEY = 'nexus_ads_global_visible_v1';
const USER_ADS_VISIBILITY_KEY = 'nexus_ads_user_visible_v1';

export const DEFAULT_ADS: AdPlacement[] = [
  {
    id: 'ad-1787669811177',
    title: 'Developer Tools & SaaS Suite',
    slot: 'above_join_button',
    target: 'safe_only',
    format: 'banner_image',
    sponsorName: 'Featured Partner',
    bannerText: 'Get exclusive deals and tools for your online community.',
    imageUrl: '',
    targetUrl: 'https://github.com',
    ctaText: 'Learn More',
    isActive: true,
    impressions: 46,
    clicks: 0,
    createdAt: '2026-08-25T14:56:51.177Z',
    code: ''
  },
  {
    id: 'ad-1787667252094',
    title: 'Community Moderation Bot',
    slot: 'rules_banner',
    target: 'safe_only',
    format: 'banner_image',
    sponsorName: 'Featured Partner',
    bannerText: 'Get exclusive deals and tools for your online community.',
    imageUrl: '',
    targetUrl: 'https://github.com',
    ctaText: 'Learn More',
    isActive: true,
    impressions: 8,
    clicks: 0,
    createdAt: '2026-08-25T14:14:12.094Z',
    code: ''
  },
  {
    id: 'ad-header-1',
    title: 'Top Cloud VPS & Server Hosting',
    slot: 'header_top',
    target: 'safe_only',
    format: 'banner_image',
    sponsorName: 'CloudScale Infrastructure',
    bannerText: 'Deploy high-performance Discord & Telegram bot servers with 99.99% uptime and instant SSD storage.',
    imageUrl: '',
    targetUrl: 'https://github.com',
    ctaText: 'Deploy Server Free',
    isActive: true,
    impressions: 48896,
    clicks: 86,
    createdAt: '2026-08-18T10:00:00.000Z'
  },
  {
    id: 'ad-feed-1',
    title: 'Ultra-Fast Dedicated VPN & Privacy Shield',
    slot: 'feed_native',
    target: 'safe_only',
    format: 'banner_image',
    sponsorName: 'NordProtect Security',
    bannerText: 'Browse chat groups, torrents, and global servers with zero logs, AES-256 encryption, and 10Gbps servers in 110+ countries.',
    imageUrl: '',
    targetUrl: 'https://github.com',
    ctaText: 'Get 70% Off Now',
    isActive: true,
    impressions: 55189,
    clicks: 174,
    createdAt: '2026-08-18T11:00:00.000Z'
  },
  {
    id: 'ad-detail-1',
    title: 'AI Community Growth & Bot Automation',
    slot: 'detail_banner',
    target: 'safe_only',
    format: 'banner_image',
    sponsorName: 'AutoBot Growth Suite',
    bannerText: 'Automate welcome messages, AI anti-spam moderation, and invite tracking for WhatsApp & Discord communities.',
    imageUrl: '',
    targetUrl: 'https://github.com',
    ctaText: 'Explore AI Bots',
    isActive: true,
    impressions: 1010,
    clicks: 62,
    createdAt: '2026-08-18T12:00:00.000Z'
  },
  {
    id: 'ad-rules-1',
    title: 'Verified Global Crypto Exchange & Staking Hub',
    slot: 'rules_banner',
    target: 'safe_only',
    format: 'banner_image',
    sponsorName: 'Apex Trade Global',
    bannerText: 'Join 10M+ traders. Zero-fee spot trading and 12% APY staking on top Web3 crypto assets.',
    imageUrl: '',
    targetUrl: 'https://github.com',
    ctaText: 'Claim $100 Bonus',
    isActive: true,
    impressions: 680,
    clicks: 45,
    createdAt: '2026-08-18T13:00:00.000Z'
  },
  {
    id: 'ad-footer-1',
    title: 'Nexus Community Advertising & Brand Sponsorships',
    slot: 'footer_banner',
    target: 'safe_only',
    format: 'banner_image',
    sponsorName: 'Nexus Partner Network',
    bannerText: 'Promote your Discord server, Telegram group, or SaaS product to 500,000+ active group members worldwide.',
    imageUrl: '',
    targetUrl: '/ad',
    ctaText: 'Advertise With Us',
    isActive: true,
    impressions: 48592,
    clicks: 94,
    createdAt: '2026-08-18T14:00:00.000Z'
  },
  {
    id: 'ad-join-button-1',
    title: 'Join button ad',
    slot: 'join_button_ad',
    target: 'safe_only',
    format: 'banner_image',
    sponsorName: 'Sponsored Partner',
    bannerText: 'Explore verified developer tools, servers, and high-speed VPN gateways for group chats.',
    imageUrl: '',
    targetUrl: 'https://github.com',
    ctaText: 'Visit Partner',
    isActive: true,
    impressions: 420,
    clicks: 35,
    createdAt: '2026-08-25T06:00:00.000Z'
  },
  {
    id: 'ad-adult-header-1',
    title: 'Adult Creator Network & Streaming Hub',
    slot: 'header_top',
    target: 'adult_only',
    format: 'banner_image',
    sponsorName: 'Exclusive Creators 18+',
    bannerText: 'Discover top-tier verified adult content creators, live cams, and exclusive community rooms.',
    imageUrl: '',
    targetUrl: 'https://github.com',
    ctaText: 'Explore VIP Creators',
    isActive: true,
    impressions: 1250,
    clicks: 42,
    createdAt: '2026-08-28T10:00:00.000Z'
  },
  {
    id: 'ad-adult-feed-1',
    title: 'Uncensored Dating & Social Lounge',
    slot: 'feed_native',
    target: 'adult_only',
    format: 'banner_image',
    sponsorName: 'Adult Connect Global',
    bannerText: 'Join active verified singles and adult social chatrooms with instant video and private messaging.',
    imageUrl: '',
    targetUrl: 'https://github.com',
    ctaText: 'Join Live Chat',
    isActive: true,
    impressions: 3400,
    clicks: 110,
    createdAt: '2026-08-28T11:00:00.000Z'
  }
];

export function getStoredAds(): AdPlacement[] {
  if (typeof window === 'undefined') return DEFAULT_ADS;
  try {
    const raw = localStorage.getItem(ADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge missing default items from DEFAULT_ADS into parsed list if any default slot is missing
        const existingIds = new Set(parsed.map((a: AdPlacement) => a.id));
        const missingDefaults = DEFAULT_ADS.filter(def => !existingIds.has(def.id));
        if (missingDefaults.length > 0) {
          const merged = [...parsed, ...missingDefaults];
          try {
            localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load ads from storage:', err);
  }
  return DEFAULT_ADS;
}

export function saveStoredAds(ads: AdPlacement[], notifyListeners: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
    if (notifyListeners) {
      window.dispatchEvent(new CustomEvent('nexus_ads_visibility_changed', { detail: { ads } }));
    }
  } catch (err) {
    console.warn('Failed to save ads to storage:', err);
  }
}

/**
 * Check if ads are globally enabled by Admin
 */
export function isGlobalAdsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(GLOBAL_ADS_VISIBILITY_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setGlobalAdsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GLOBAL_ADS_VISIBILITY_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('nexus_ads_visibility_changed', { detail: { global: enabled } }));
  } catch (err) {
    console.warn('Error saving global ads state:', err);
  }
}

/**
 * Check if ads are visible to the user (Client-side toggle preference)
 */
export function isUserAdsVisible(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(USER_ADS_VISIBILITY_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setUserAdsVisible(visible: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_ADS_VISIBILITY_KEY, visible ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('nexus_ads_visibility_changed', { detail: { user: visible } }));
  } catch (err) {
    console.warn('Error saving user ads state:', err);
  }
}

export function getActiveAdsForSlot(
  slot: AdSlot, 
  isCurrentContextSafe: boolean = true
): AdPlacement[] {
  // If globally disabled by admin or toggled off by user, return empty
  if (!isGlobalAdsEnabled() || !isUserAdsVisible()) {
    return [];
  }

  const normalizedSlot = slot === 'footer' ? 'footer_banner' : slot;
  const ads = getStoredAds();
  return ads.filter(ad => {
    if (!ad.isActive) return false;
    const adNormalizedSlot = ad.slot === 'footer' ? 'footer_banner' : ad.slot;
    const isSlotMatch = 
      adNormalizedSlot === normalizedSlot ||
      (normalizedSlot === 'above_join_button' && adNormalizedSlot === 'join_button_ad') ||
      (normalizedSlot === 'join_button_ad' && adNormalizedSlot === 'above_join_button');

    if (!isSlotMatch) return false;

    // Granular Targeting Rules:
    // 1. safe_only: Only show in safe, non-adult contexts
    if (ad.target === 'safe_only' && !isCurrentContextSafe) {
      return false;
    }
    // 2. adult_only: Only show in adult / 18+ contexts
    if (ad.target === 'adult_only' && isCurrentContextSafe) {
      return false;
    }
    // 3. 'all' / 'everywhere': Show across all contexts
    return true;
  });
}

export function trackAdClick(adId: string): void {
  const ads = getStoredAds();
  const updated = ads.map(a => {
    if (a.id === adId) {
      return { ...a, clicks: (a.clicks || 0) + 1 };
    }
    return a;
  });
  saveStoredAds(updated, false);
}

export function trackAdImpression(adId: string): void {
  const ads = getStoredAds();
  const updated = ads.map(a => {
    if (a.id === adId) {
      return { ...a, impressions: (a.impressions || 0) + 1 };
    }
    return a;
  });
  saveStoredAds(updated, false);
}
