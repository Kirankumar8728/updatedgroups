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

  const staticRoutes = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/active24hours', priority: '0.9', changefreq: 'hourly' },
    { path: '/categories', priority: '0.9', changefreq: 'daily' },
    { path: '/countries', priority: '0.8', changefreq: 'weekly' },
    { path: '/languages', priority: '0.8', changefreq: 'weekly' },
    { path: '/tags', priority: '0.8', changefreq: 'weekly' },
    { path: '/explore', priority: '0.8', changefreq: 'daily' },
    { path: '/leaderboard', priority: '0.8', changefreq: 'daily' },
    { path: '/submit-group', priority: '0.8', changefreq: 'weekly' },
    { path: '/about', priority: '0.6', changefreq: 'monthly' },
    { path: '/editorial-standards', priority: '0.6', changefreq: 'monthly' },
    { path: '/safety', priority: '0.6', changefreq: 'monthly' },
    { path: '/guidelines', priority: '0.6', changefreq: 'monthly' },
    { path: '/rules', priority: '0.6', changefreq: 'monthly' },
    { path: '/verification', priority: '0.6', changefreq: 'monthly' },
    { path: '/report', priority: '0.5', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.4', changefreq: 'monthly' },
    { path: '/terms', priority: '0.4', changefreq: 'monthly' },
    { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const route of staticRoutes) {
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
