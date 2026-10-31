import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/src/lib/rank';
import { getIndexableTags } from '@/src/lib/groups-dal';

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
  const tags = getIndexableTags();
  const now = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const item of tags) {
    const loc = `${baseUrl}/tag/${item.slug}`;
    const lastMod = item.lastModified ? new Date(item.lastModified).toISOString() : now;
    const count = item.count ?? 0;
    const priority = count >= 5 ? '0.8' : count >= 2 ? '0.7' : '0.6';

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(loc)}</loc>\n`;
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
