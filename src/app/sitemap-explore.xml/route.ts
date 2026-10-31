import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/src/lib/rank';
import { getGroups } from '@/src/lib/groups-dal';
import { TAXONOMY_CATEGORIES } from '@/src/lib/taxonomy';
import { Platform } from '@/src/types';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');
  const { groups: db } = await getGroups({ limit: 1000 });
  const activeGroups = db.filter(g => g.isActive !== false && g.is_active !== false);
  const now = new Date().toISOString();

  const platforms: Platform[] = ['telegram', 'whatsapp', 'discord', 'reddit', 'signal', 'facebook'];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Only expose and index an /explore/ route if it has >= 5 verified active groups
  for (const platform of platforms) {
    for (const cat of TAXONOMY_CATEGORIES) {
      const matchingCount = activeGroups.filter(
        g =>
          g.platform.toLowerCase() === platform.toLowerCase() &&
          g.category.toLowerCase() === cat.name.toLowerCase()
      ).length;

      if (matchingCount >= 5) {
        xml += `  <url>\n`;
        xml += `    <loc>${escapeXml(`${baseUrl}/explore/${platform}-${cat.slug}`)}</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }
  }

  xml += `</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
