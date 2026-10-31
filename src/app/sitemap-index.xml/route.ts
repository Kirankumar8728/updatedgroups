import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/src/lib/rank';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * GET /sitemap-index.xml
 * 
 * Provides standard Sitemap Index referencing all granular sub-sitemaps
 * for search engines that prefer index segmentation.
 */
export async function GET() {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');
  const now = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  const subSitemaps = [
    '/sitemap-static.xml',
    '/sitemap-groups.xml',
    '/sitemap-categories.xml',
    '/sitemap-platforms.xml',
    '/sitemap-countries.xml',
    '/sitemap-languages.xml',
    '/sitemap-tags.xml',
    '/sitemap-explore.xml',
  ];

  for (const sub of subSitemaps) {
    xml += `  <sitemap>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}${sub}`)}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `  </sitemap>\n`;
  }

  xml += `</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
