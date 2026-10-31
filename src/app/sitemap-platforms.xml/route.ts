import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/src/lib/rank';

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
  const now = new Date().toISOString();

  const platformRoutes = [
    { path: '/telegram-channels', priority: '0.9', changefreq: 'daily' },
    { path: '/whatsapp-groups', priority: '0.9', changefreq: 'daily' },
    { path: '/discord-servers', priority: '0.9', changefreq: 'daily' },
    { path: '/reddit-communities', priority: '0.8', changefreq: 'daily' },
    { path: '/signal-groups', priority: '0.8', changefreq: 'daily' },
    { path: '/facebook-groups', priority: '0.8', changefreq: 'daily' },
    { path: '/instagram-groups', priority: '0.8', changefreq: 'daily' },
    { path: '/snapchat-groups', priority: '0.8', changefreq: 'daily' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const route of platformRoutes) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}${route.path}`)}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
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
