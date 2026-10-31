import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/src/lib/rank';

export const revalidate = 86400; // Edge cached for 24 hours

const PLATFORM_HUBS = [
  { path: '/whatsapp-groups', priority: 0.95, changeFrequency: 'daily' as const },
  { path: '/telegram-channels', priority: 0.95, changeFrequency: 'daily' as const },
  { path: '/discord-servers', priority: 0.95, changeFrequency: 'daily' as const },
  { path: '/facebook-groups', priority: 0.85, changeFrequency: 'daily' as const },
  { path: '/signal-groups', priority: 0.85, changeFrequency: 'daily' as const },
  { path: '/reddit-communities', priority: 0.85, changeFrequency: 'daily' as const },
  { path: '/snapchat-groups', priority: 0.85, changeFrequency: 'daily' as const },
];

const CORE_PAGES = [
  { path: '', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/categories', priority: 0.90, changeFrequency: 'daily' as const },
  { path: '/countries', priority: 0.85, changeFrequency: 'daily' as const },
  { path: '/languages', priority: 0.85, changeFrequency: 'daily' as const },
  { path: '/tags', priority: 0.85, changeFrequency: 'daily' as const },
  { path: '/active24hours', priority: 0.90, changeFrequency: 'hourly' as const },
  { path: '/leaderboard', priority: 0.85, changeFrequency: 'daily' as const },
  { path: '/submit-group', priority: 0.80, changeFrequency: 'weekly' as const },
  { path: '/rules', priority: 0.60, changeFrequency: 'monthly' as const },
  { path: '/about', priority: 0.60, changeFrequency: 'monthly' as const },
  { path: '/guidelines', priority: 0.60, changeFrequency: 'monthly' as const },
  { path: '/verification', priority: 0.60, changeFrequency: 'monthly' as const },
  { path: '/editorial-standards', priority: 0.60, changeFrequency: 'monthly' as const },
  { path: '/safety', priority: 0.60, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.40, changeFrequency: 'monthly' as const },
  { path: '/terms', priority: 0.40, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.50, changeFrequency: 'monthly' as const },
];

const TOP_COUNTRIES = [
  { code: 'in', priority: 0.80 },
  { code: 'us', priority: 0.80 },
  { code: 'gb', priority: 0.80 },
  { code: 'br', priority: 0.80 },
  { code: 'ca', priority: 0.75 },
  { code: 'au', priority: 0.75 },
  { code: 'de', priority: 0.75 },
  { code: 'fr', priority: 0.75 },
  { code: 'pk', priority: 0.75 },
  { code: 'ng', priority: 0.75 },
  { code: 'id', priority: 0.75 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  // 1. Core pages
  for (const page of CORE_PAGES) {
    entries.push({
      url: `${baseUrl}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    });
  }

  // 2. Platform hubs
  for (const hub of PLATFORM_HUBS) {
    entries.push({
      url: `${baseUrl}${hub.path}`,
      lastModified: now,
      changeFrequency: hub.changeFrequency,
      priority: hub.priority,
    });
  }

  // 3. Country hubs
  for (const country of TOP_COUNTRIES) {
    entries.push({
      url: `${baseUrl}/country/${country.code}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: country.priority,
    });
  }

  return entries;
}
