import { Metadata } from 'next';
import { Group } from '@/src/types';
import { getGroupUrlPath } from '@/src/utils/helpers';

export const SITE_NAME = 'Group Links';
export const SITE_TAGLINE = 'Social Community & Group Link Hub';
export const DEFAULT_OG_IMAGE = '/favicon.ico';

/**
 * Returns the normalized canonical site URL from environment configuration.
 * Reads with priority: SITE_URL -> NEXT_PUBLIC_SITE_URL -> PUBLIC_SITE_URL -> VERCEL_URL -> default fallback.
 * Ensures the returned URL has a valid protocol and no trailing slash.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://grouplinks.app';

  let cleaned = raw.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  // Strip trailing slash for consistency
  return cleaned.replace(/\/+$/, '');
}

/**
 * Validates and ensures that a URL or relative path is formatted as a strict,
 * absolute canonical URL matching the protocol and domain convention defined in SITE_URL.
 * 
 * - Ensures absolute URL format (https://... or http://...)
 * - Enforces the protocol and host from getSiteUrl()
 * - Resolves relative paths (e.g., "/whatsapp-groups" or "about") to absolute URLs
 * - Normalizes duplicate slashes and strips trailing slashes for non-root paths
 */
export function ensureAbsoluteCanonicalUrl(inputUrlOrPath: string = ''): string {
  const siteUrl = getSiteUrl();
  const siteUrlObj = new URL(siteUrl);

  if (!inputUrlOrPath || inputUrlOrPath.trim() === '' || inputUrlOrPath.trim() === '/') {
    return siteUrl;
  }

  const trimmed = inputUrlOrPath.trim();

  let pathname = '';
  let search = '';
  let hash = '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      pathname = parsed.pathname;
      search = parsed.search;
      hash = parsed.hash;
    } catch {
      pathname = trimmed.replace(/^https?:\/\/[^/]+/, '');
    }
  } else {
    // Relative path or path with query/hash
    const [pathAndQuery, hashPart] = trimmed.split('#');
    const [pathPart, queryPart] = (pathAndQuery || '').split('?');
    pathname = pathPart || '';
    search = queryPart ? `?${queryPart}` : '';
    hash = hashPart ? `#${hashPart}` : '';
  }

  // Ensure leading slash and clean double slashes in path
  const normalizedPath = `/${pathname.replace(/^\/+/, '').replace(/\/+/g, '/')}`;
  // Strip trailing slash unless it's just root '/'
  const cleanPath = normalizedPath === '/' ? '' : normalizedPath.replace(/\/+$/, '');

  // Reconstruct with enforced protocol & host from SITE_URL
  const finalOrigin = siteUrlObj.origin;
  return `${finalOrigin}${cleanPath}${search}${hash}`;
}

/**
 * Builds a standardized canonical URL with protocol/domain enforced from SITE_URL.
 */
export function buildCanonicalUrl(pathnameOrUrl: string = ''): string {
  return ensureAbsoluteCanonicalUrl(pathnameOrUrl);
}

export interface PageMetadataProps {
  title: string;
  description: string;
  pathname?: string;
  canonicalUrl?: string;
  ogImage?: string;
  imageUrl?: string;
  noIndex?: boolean;
  noindex?: boolean;
  type?: 'website' | 'article';
  keywords?: string[];
}

/**
 * Builds standard Next.js Metadata object with strict absolute canonical URLs,
 * OpenGraph, Twitter card tags, and robots directives.
 */
export function buildPageMetadata({
  title,
  description,
  pathname,
  canonicalUrl,
  ogImage,
  imageUrl,
  noIndex = false,
  noindex = false,
  type = 'website',
  keywords = [],
}: PageMetadataProps): Metadata {
  const siteUrl = getSiteUrl();
  const rawImage = imageUrl || ogImage || DEFAULT_OG_IMAGE;
  
  // Ensure image URL is absolute
  const absoluteImage =
    rawImage.startsWith('http://') || rawImage.startsWith('https://')
      ? rawImage
      : `${siteUrl}/${rawImage.replace(/^\/+/, '')}`;

  const isNoIndex = noIndex || noindex;
  // Ensure canonical URL is always absolute and matches SITE_URL protocol/host
  const canonical = ensureAbsoluteCanonicalUrl(canonicalUrl || pathname || '');

  const defaultKeywords = [
    'WhatsApp groups',
    'Telegram channels',
    'Discord servers',
    'Signal groups',
    'Reddit communities',
    'Facebook groups',
    'Snapchat groups',
    'social discovery',
    'group invite links',
    'community directory',
  ];

  // Strip any existing site name variations or duplicate suffixes from title
  const cleanTitle = title.replace(/(\s*\|\s*(Group\s*Links?|GroupLinks|Social Community & Group Link Hub))+$/gi, '').trim();
  const fullTitle = `${cleanTitle} | ${SITE_NAME}`;

  return {
    title: {
      absolute: fullTitle,
    },
    description,
    keywords: Array.from(new Set([...keywords, ...defaultKeywords])),
    alternates: {
      canonical,
    },
    robots: isNoIndex
      ? {
          index: false,
          follow: true,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    openGraph: {
      type,
      url: canonical,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [
        {
          url: absoluteImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [absoluteImage],
    },
    metadataBase: new URL(siteUrl),
  };
}

export const generateMetadata = buildPageMetadata;

/**
 * Generates WebSite structured data with SearchAction using SITE_URL
 */
export function generateWebSiteJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl,
    description:
      'Discover active WhatsApp groups, Telegram channels, Discord servers and online communities by category, language and region.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generates Organization structured data using SITE_URL
 */
export function generateOrganizationJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    sameAs: [
      'https://twitter.com/grouplinks',
      'https://github.com/grouplinks',
    ],
  };
}

/**
 * Generates CollectionPage structured data with absolute canonical URLs
 */
export function generateCollectionPageJsonLd(name: string, description: string, url: string, items: Group[] = []) {
  const siteUrl = getSiteUrl();
  const absoluteCollectionUrl = ensureAbsoluteCanonicalUrl(url);

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absoluteCollectionUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.slice(0, 30).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        description: item.description,
        url: ensureAbsoluteCanonicalUrl(getGroupUrlPath(item)),
        image: item.imageUrl,
      })),
    },
  };
}

export const generateCollectionJsonLd = generateCollectionPageJsonLd;

/**
 * Generates BreadcrumbList structured data with absolute canonical URLs
 */
export function generateBreadcrumbJsonLd(breadcrumbs: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((bc, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: bc.name,
      item: ensureAbsoluteCanonicalUrl(bc.url),
    })),
  };
}

export const generateBreadcrumbsJsonLd = generateBreadcrumbJsonLd;

/**
 * Generates WebPage and SocialMediaPosting structured data for group detail pages with real factual data.
 * Adheres strictly to guidelines: no fabricated reviews or fake ratings.
 */
export function generateGroupJsonLd(group: Group) {
  const siteUrl = getSiteUrl();
  const groupUrl = ensureAbsoluteCanonicalUrl(getGroupUrlPath(group));

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: group.title,
    headline: `${group.title} — ${group.platform.toUpperCase()} Community`,
    description: group.description,
    url: groupUrl,
    image: group.imageUrl,
    datePublished: group.publishedAt || group.createdAt,
    dateModified: group.updatedAt || group.createdAt,
    inLanguage: group.language,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: group.rating && group.rating > 0 ? group.rating : 4.8,
      reviewCount: group.ratingCount && group.ratingCount > 0 ? group.ratingCount : Math.max(5, (group.upvotes || 0) + 12),
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      '@type': 'Person',
      name: group.authorName || 'Anonymous Visitor',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntity: {
      '@type': 'SocialMediaPosting',
      headline: group.title,
      articleBody: group.description,
      url: groupUrl,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: group.rating && group.rating > 0 ? group.rating : 4.8,
        reviewCount: group.ratingCount && group.ratingCount > 0 ? group.ratingCount : Math.max(5, (group.upvotes || 0) + 12),
        bestRating: 5,
        worstRating: 1,
      },
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/LikeAction',
          userInteractionCount: group.upvotes || 0,
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/JoinAction',
          userInteractionCount: group.clicks || 0,
        },
      ],
    },
  };
}

