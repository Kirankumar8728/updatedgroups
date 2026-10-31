import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/src/lib/rank';
import { getVisibleTaxonomyCategories } from '@/src/lib/taxonomy';

export const revalidate = 86400; // Edge cached for 24 hours

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const cat of getVisibleTaxonomyCategories()) {
    // Canonical path: /categories/[slug]
    entries.push({
      url: `${baseUrl}/categories/${cat.slug}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    });
  }

  return entries;
}
