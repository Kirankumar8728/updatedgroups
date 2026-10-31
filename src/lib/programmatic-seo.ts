import { Group, Platform, Category } from '@/src/types';
import { getSiteUrl } from '@/src/lib/rank';
import { 
  PLATFORM_DISPLAY_NAMES, 
  PLATFORM_CANONICAL_HUBS, 
  CategoryDefinition,
  CATEGORY_BY_NAME,
  CATEGORY_BY_SLUG 
} from '@/src/lib/taxonomy';

export const CURRENT_YEAR = new Date().getFullYear();

export interface SeoHubCopy {
  h1: string;
  badge: string;
  introParagraphs: string[];
  totalGroupsCount: number;
  totalMembersCount: number;
}

export interface SeoMetadataConfig {
  title: string;
  description: string;
  pathname: string;
  noIndex?: boolean;
  canonicalUrl?: string;
  keywords?: string[];
}

/**
 * Generates programmatic copy for Platform Hubs (/telegram-channels, /whatsapp-groups, etc.)
 */
export function getPlatformHubCopy(
  platform: Platform,
  groups: Group[] = []
): SeoHubCopy {
  const platformName = PLATFORM_DISPLAY_NAMES[platform] || 'Community';
  const totalCount = groups.length;
  const totalMembers = groups.reduce((acc, g) => acc + (g.memberCount || 0), 0);
  const formattedMembers = totalMembers > 0 ? totalMembers.toLocaleString() : '10,000+';

  return {
    h1: `Active ${platformName} Directory (${CURRENT_YEAR})`,
    badge: 'Verified Daily • Real-Time Links',
    introParagraphs: [
      `Welcome to the verified ${platformName} directory on GroupLinks. Explore ${totalCount} active communities with over ${formattedMembers} members across top categories including Crypto, Gaming, Movies, Technology, Business, and Study.`,
      `Every ${platformName} invite link in our registry undergoes automated health checks and community verification to guarantee zero spam, active member engagement, and valid access tokens.`,
      `Use our real-time filters to discover groups by topic, spoken language, member range, or region, and join communities with a single click.`
    ],
    totalGroupsCount: totalCount,
    totalMembersCount: totalMembers,
  };
}

/**
 * Generates programmatic copy for Topical Category Hubs (/categories/:slug)
 */
export function getCategoryHubCopy(
  category: Category,
  groups: Group[] = []
): SeoHubCopy {
  const catDef = CATEGORY_BY_NAME.get(category.toLowerCase());
  const categoryName = catDef ? catDef.name : category;
  const totalCount = groups.length;
  const totalMembers = groups.reduce((acc, g) => acc + (g.memberCount || 0), 0);
  const formattedMembers = totalMembers > 0 ? totalMembers.toLocaleString() : '15,000+';

  return {
    h1: `Best ${categoryName} Groups & Communities (${CURRENT_YEAR})`,
    badge: 'Multi-Platform • Verified Links',
    introParagraphs: [
      `Welcome to the verified ${categoryName} directory on GroupLinks. Explore ${totalCount} active communities with over ${formattedMembers} members across WhatsApp, Telegram, Discord, Reddit, Signal, and Facebook.`,
      `Whether you are looking for breaking news, expert discussions, study materials, or community networking in ${categoryName}, our curated directory connects you with high-quality, verified chat groups.`,
      `Filter by platform, language, or country to find your ideal group and start engaging with passionate members worldwide.`
    ],
    totalGroupsCount: totalCount,
    totalMembersCount: totalMembers,
  };
}

/**
 * Generates programmatic copy for Combination Explore Hubs (/explore/:platform-:category-slug)
 */
export function getExploreHubCopy(
  platform: Platform,
  categoryDef: CategoryDefinition,
  groups: Group[] = []
): SeoHubCopy {
  const platformName = PLATFORM_DISPLAY_NAMES[platform] || 'Community';
  const categoryName = categoryDef.name;
  const totalCount = groups.length;
  const totalMembers = groups.reduce((acc, g) => acc + (g.memberCount || 0), 0);
  const formattedMembers = totalMembers > 0 ? totalMembers.toLocaleString() : '5,000+';

  return {
    h1: `Active ${categoryName} ${platformName} Links (${CURRENT_YEAR})`,
    badge: '100% Verified • Updated Daily',
    introParagraphs: [
      `Welcome to the verified ${categoryName} directory for ${platformName} on GroupLinks. Explore ${totalCount} active communities with over ${formattedMembers} members. Verified daily.`,
      `Find active ${platformName} channels and discussion groups dedicated exclusively to ${categoryName}. From beginner tips to advanced discussions, connect directly with verified members.`,
      `All links feature direct instant-join buttons and real-time member metrics to help you join the most active communities today.`
    ],
    totalGroupsCount: totalCount,
    totalMembersCount: totalMembers,
  };
}

/**
 * Builds Platform Hub Metadata according to Task 4 specifications
 */
export function buildPlatformHubMetadata(platform: Platform): SeoMetadataConfig {
  const platformName = PLATFORM_DISPLAY_NAMES[platform] || 'Community';
  const pathname = PLATFORM_CANONICAL_HUBS[platform] || `/${platform}-groups`;

  return {
    title: `Active ${platformName} Directory (${CURRENT_YEAR}) | GroupLinks`,
    description: `Browse verified ${platformName} invite links. Filter by category, language, and member count on GroupLinks.`,
    pathname,
    keywords: [
      `${platformName} directory`,
      `${platformName} groups ${CURRENT_YEAR}`,
      `${platformName} channels`,
      `active ${platformName} links`,
      `join ${platformName} communities`
    ],
  };
}

/**
 * Builds Category Hub Metadata according to Task 4 specifications
 */
export function buildCategoryHubMetadata(category: Category, slug: string): SeoMetadataConfig {
  const catDef = CATEGORY_BY_NAME.get(category.toLowerCase());
  const categoryName = catDef ? catDef.name : category;

  return {
    title: `Best ${categoryName} Groups & Communities (${CURRENT_YEAR}) | GroupLinks`,
    description: `Discover top ${categoryName} groups across WhatsApp, Telegram, Discord, and Reddit on GroupLinks.`,
    pathname: `/categories/${slug}`,
    keywords: [
      `${categoryName} groups`,
      `${categoryName} communities`,
      `best ${categoryName} chat links`,
      `${categoryName} WhatsApp and Telegram`,
      `${categoryName} online groups ${CURRENT_YEAR}`
    ],
  };
}

/**
 * Builds Explore Combination Metadata according to Task 4 specifications & Threshold rule
 */
export function buildExploreHubMetadata(
  platform: Platform,
  categoryDef: CategoryDefinition,
  activeCount: number
): SeoMetadataConfig {
  const platformName = PLATFORM_DISPLAY_NAMES[platform] || 'Community';
  const categoryName = categoryDef.name;
  const canonicalExploreSlug = `${platform}-${categoryDef.slug}`;
  const isIndexed = activeCount >= 5;

  return {
    title: `Active ${categoryName} ${platformName} Links (${CURRENT_YEAR}) | GroupLinks`,
    description: `Join ${activeCount > 0 ? activeCount : 'active'}+ verified ${categoryName} ${platformName} links. Updated daily with real-time member counts on GroupLinks.`,
    pathname: `/explore/${canonicalExploreSlug}`,
    noIndex: !isIndexed,
    canonicalUrl: isIndexed
      ? `${getSiteUrl().replace(/\/+$/, '')}/explore/${canonicalExploreSlug}`
      : `${getSiteUrl().replace(/\/+$/, '')}/categories/${categoryDef.slug}`,
    keywords: [
      `${categoryName} ${platformName} links`,
      `${platformName} ${categoryName} groups`,
      `active ${categoryName} channels`,
      `join ${categoryName} on ${platformName}`
    ],
  };
}


/**
 * Schema JSON-LD Generator for ItemList (top 10-15 groups on hub)
 */
export function generateItemListJsonLd(
  pageName: string,
  pageUrl: string,
  groups: Group[],
  maxItems = 15
) {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');
  const topGroups = groups.slice(0, maxItems);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pageName,
    url: `${baseUrl}${pageUrl}`,
    numberOfItems: topGroups.length,
    itemListElement: topGroups.map((group, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: group.title,
      description: group.metaDescription || group.description,
      url: `${baseUrl}/${group.slug || group.id}`,
      image: group.imageUrl,
    })),
  };
}

/**
 * Schema JSON-LD Generator for WebSite with SearchAction
 */
export function generateWebSiteJsonLd() {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'GroupLinks',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export { generateBreadcrumbsJsonLd } from '@/src/lib/rank';
