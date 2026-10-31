import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/src/lib/rank';
import { getActiveGroupsCount, getActiveGroupsForSitemapChunk } from '@/src/lib/groups-dal';
import { getGroupUrlPath } from '@/src/utils/helpers';

export const revalidate = 86400; // Edge cached for 24 hours

const CHUNK_SIZE = 20000; // 20,000 URLs per chunk

/**
 * Calculates how many sitemap chunks are needed based on total active group count.
 * Generates chunk IDs: [ { id: '0' }, { id: '1' }, ... ]
 */
export async function generateSitemaps() {
  try {
    const totalCount = await getActiveGroupsCount();
    const numberOfChunks = Math.max(1, Math.ceil(totalCount / CHUNK_SIZE));
    return Array.from({ length: numberOfChunks }, (_, index) => ({
      id: String(index),
    }));
  } catch {
    return [{ id: '0' }];
  }
}

/**
 * Paginated chunk generator: only queries the exact 20,000 groups for the given chunk ID.
 * Prevents loading entire database into memory and eliminates 504 timeouts.
 */
export default async function sitemap(props: {
  id: Promise<{ id: string }> | { id: string } | string;
}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');
  const now = new Date();

  // Safely extract chunk ID
  let chunkId = 0;
  try {
    const resolved: any = await props;
    const rawId = typeof resolved === 'object' ? (resolved?.id ?? '0') : resolved;
    chunkId = Math.max(0, parseInt(String(rawId), 10) || 0);
  } catch {
    chunkId = 0;
  }

  const offset = chunkId * CHUNK_SIZE;
  const groups = await getActiveGroupsForSitemapChunk(offset, CHUNK_SIZE);

  return groups.map((group) => {
    const groupPath = getGroupUrlPath(group);
    const loc = `${baseUrl}${groupPath}`;
    const lastMod = group.updatedAt || group.publishedAt || group.createdAt;
    const lastModified = lastMod ? new Date(lastMod) : now;
    const isSpecial = Boolean(group.featured || group.isSticky || group.isDailyTopRanked);
    const priority = isSpecial ? 0.85 : 0.75;
    const changeFrequency: 'hourly' | 'daily' | 'weekly' = group.isDailyTopRanked
      ? 'hourly'
      : isSpecial
      ? 'daily'
      : 'weekly';

    const entry: MetadataRoute.Sitemap[number] = {
      url: loc,
      lastModified,
      changeFrequency,
      priority,
    };

    if (group.imageUrl && group.imageUrl.startsWith('http') && !group.imageUrl.includes('unsplash.com')) {
      entry.images = [group.imageUrl];
    }

    return entry;
  });
}
