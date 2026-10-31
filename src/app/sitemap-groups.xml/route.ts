import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/src/lib/rank';
import { getGroups } from '@/src/lib/groups-dal';
import { getGroupUrlPath } from '@/src/utils/helpers';

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
  const { groups } = await getGroups({ pageSize: 50000 });
  const activeGroups = (groups || []).filter(g => g.isActive !== false && (g as any).is_active !== false);
  const now = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  for (const group of activeGroups) {
    const groupPath = getGroupUrlPath(group);
    const loc = `${baseUrl}${groupPath}`;
    const lastMod = group.updatedAt || group.publishedAt || group.createdAt || now;
    const priority = group.featured || group.isSticky || group.isPromoted ? '0.8' : '0.7';

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(loc)}</loc>\n`;
    xml += `    <lastmod>${escapeXml(new Date(lastMod).toISOString())}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    if (group.imageUrl && group.imageUrl.startsWith('http')) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(group.imageUrl)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(group.title)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
