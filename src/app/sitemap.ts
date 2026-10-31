import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/src/lib/rank';
import { getActiveGroupsForSitemapChunk } from '@/src/lib/groups-dal';
import {
  CATEGORIES,
  REGIONS,
  LANGUAGES,
  categoryToSlug,
  countryToSlug,
  languageToSlug,
  getGroupUrlPath,
} from '@/src/utils/helpers';

export const revalidate = 3600; // Edge cached for 1 hour

/**
 * Native Next.js App Router dynamic XML sitemap (/sitemap.xml).
 * Dynamically aggregates all active groups, platform hubs, categories,
 * countries, languages, and programmatic landing pages to maximize
 * Google search engine indexing & organic search visibility.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');
  const now = new Date();

  // 1. Static Gateways & Platform Hubs
  const staticGateways: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/whatsapp-groups`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/telegram-channels`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/telegram-groups`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/discord-servers`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/discord-groups`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.90,
    },
    {
      url: `${baseUrl}/facebook-groups`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.90,
    },
    {
      url: `${baseUrl}/signal-groups`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/reddit-communities`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/snapchat-groups`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/active24hours`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.90,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.90,
    },
    {
      url: `${baseUrl}/countries`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/languages`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/tags`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/direct-promoted-groups`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.80,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.60,
    },
    {
      url: `${baseUrl}/guidelines`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.50,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.40,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.40,
    },
  ];

  // 2. Dynamic Category Hubs
  const categoryEntries: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${baseUrl}/category/${categoryToSlug(cat)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.85,
  }));

  // 3. Dynamic Country / Region Hubs
  const countryEntries: MetadataRoute.Sitemap = REGIONS.map((country) => ({
    url: `${baseUrl}/country/${countryToSlug(country)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.80,
  }));

  // 4. Dynamic Language Hubs
  const languageEntries: MetadataRoute.Sitemap = LANGUAGES.map((lang) => ({
    url: `${baseUrl}/language/${languageToSlug(lang)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.80,
  }));

  // 5. Dynamic Active Groups & Tags
  let groupEntries: MetadataRoute.Sitemap = [];
  let tagEntries: MetadataRoute.Sitemap = [];
  try {
    const activeGroups = await getActiveGroupsForSitemapChunk(0, 20000);
    const uniqueTags = new Set<string>();

    groupEntries = activeGroups.map((group) => {
      const canonicalPath = getGroupUrlPath(group as any);
      const lastModDate = group.updatedAt || group.publishedAt || group.createdAt;
      const parsedDate = lastModDate ? new Date(lastModDate) : now;
      const validDate = isNaN(parsedDate.getTime()) ? now : parsedDate;

      if (group.customTags && Array.isArray(group.customTags)) {
        for (const t of group.customTags) {
          if (t && t.trim()) {
            uniqueTags.add(t.trim().replace(/^#/, ''));
          }
        }
      }

      return {
        url: `${baseUrl}${canonicalPath}`,
        lastModified: validDate,
        changeFrequency: group.featured || group.isSticky ? 'daily' : 'weekly',
        priority: group.featured || group.isSticky ? 0.90 : 0.75,
      };
    });

    tagEntries = Array.from(uniqueTags).map((tag) => ({
      url: `${baseUrl}/tag/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'))}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.80,
    }));
  } catch (err) {
    console.warn('[Sitemap Notice] Dynamic group lookup fallback:', err);
  }

  // Deduplicate entries by URL to ensure pristine XML output
  const uniqueUrlMap = new Map<string, MetadataRoute.Sitemap[number]>();
  const combined = [
    ...staticGateways,
    ...categoryEntries,
    ...countryEntries,
    ...languageEntries,
    ...tagEntries,
    ...groupEntries,
  ];

  for (const entry of combined) {
    if (!uniqueUrlMap.has(entry.url)) {
      uniqueUrlMap.set(entry.url, entry);
    }
  }

  return Array.from(uniqueUrlMap.values());
}
