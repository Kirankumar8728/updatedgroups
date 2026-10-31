import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/src/lib/rank';
import { getIndexableCategories } from '@/src/lib/groups-dal';
import { TAXONOMY_CATEGORIES, getVisibleTaxonomyCategories } from '@/src/lib/taxonomy';

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
  const categories = getIndexableCategories();
  const now = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // 1. Index all taxonomy categories with real group counts and timestamps
  for (const cat of getVisibleTaxonomyCategories()) {
    const matched = categories.find(c => c.slug === cat.slug || c.name.toLowerCase() === cat.name.toLowerCase());
    const count = matched ? (matched as any).count || 0 : 0;
    const lastMod = matched && (matched as any).lastModified ? new Date((matched as any).lastModified).toISOString() : now;
    const priority = count > 0 ? '0.8' : '0.6';

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}/categories/${cat.slug}`)}</loc>\n`;
    xml += `    <lastmod>${escapeXml(lastMod)}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

