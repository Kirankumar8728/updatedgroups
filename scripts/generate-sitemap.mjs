#!/usr/bin/env node
/**
 * Automated Dynamic Sitemap Generator Script
 * 
 * Generates a comprehensive, production-grade sitemap.xml according to
 * the Sitemaps XML 0.9 protocol and Google Image Sitemap schema.
 * 
 * Includes:
 * 1. Core Landing Pages & Hubs (Home, Submit, Leaderboards, Categories, Countries)
 * 2. Platform Hubs (WhatsApp, Telegram, Discord, Facebook, Signal, Reddit, Snapchat)
 * 3. All 25 Taxonomy Category Hubs (/category/[slug] and /categories/[slug])
 * 4. Regional Country Hubs (/country/[code])
 * 5. All Active & Verified Communities with dynamic priorities, timestamps, and image metadata
 * 
 * Usage:
 *   node scripts/generate-sitemap.mjs
 *   npm run sitemap:generate
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const outputArgIdx = process.argv.indexOf('--output');
const outputPath = outputArgIdx !== -1 && process.argv[outputArgIdx + 1]
  ? path.resolve(ROOT_DIR, process.argv[outputArgIdx + 1])
  : path.join(PUBLIC_DIR, 'sitemap-generated.xml');
const SITEMAP_PATH = outputPath;

// Load environment variables if available
const envFiles = ['.env.local', '.env.production', '.env'];
for (const envFile of envFiles) {
  const fullPath = path.join(ROOT_DIR, envFile);
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...rest] = trimmed.split('=');
          const val = rest.join('=').replace(/^["']|["']$/g, '').trim();
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch {}
  }
}

// Determine canonical Base URL
function getCanonicalBaseUrl() {
  const raw =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://grouplinks.app';

  let cleaned = raw.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned.replace(/\/+$/, '');
}

// XML entity escaping
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Category Taxonomy definitions
const CATEGORIES = [
  { name: 'Tech & Programming', slug: 'tech-programming', priority: '0.85' },
  { name: 'Crypto & Web3', slug: 'crypto-web3', priority: '0.85' },
  { name: 'Gaming & Esports', slug: 'gaming-esports', priority: '0.85' },
  { name: 'Entertainment & Movies', slug: 'entertainment-movies', priority: '0.85' },
  { name: 'Music & Audio', slug: 'music-audio', priority: '0.85' },
  { name: 'Business & Startups', slug: 'business-startups', priority: '0.85' },
  { name: 'Finance & Investing', slug: 'finance-investing', priority: '0.85' },
  { name: 'Education & Study', slug: 'education-study', priority: '0.85' },
  { name: 'Fitness & Wellness', slug: 'fitness-wellness', priority: '0.80' },
  { name: 'Food & Cooking', slug: 'food-cooking', priority: '0.80' },
  { name: 'Travel & Adventure', slug: 'travel-adventure', priority: '0.80' },
  { name: 'Science & AI', slug: 'science-ai', priority: '0.85' },
  { name: 'Photography & Video', slug: 'photography-video', priority: '0.80' },
  { name: 'Sports & Outdoors', slug: 'sports-outdoors', priority: '0.80' },
  { name: 'Pets & Animals', slug: 'pets-animals', priority: '0.80' },
  { name: 'Anime & Manga', slug: 'anime-manga', priority: '0.80' },
  { name: 'Art & Design', slug: 'art-design', priority: '0.80' },
  { name: 'Fashion & Beauty', slug: 'fashion-beauty', priority: '0.80' },
  { name: 'Humor & Memes', slug: 'humor-memes', priority: '0.80' },
  { name: 'Dating & Social', slug: 'dating-social', priority: '0.75' },
  { name: 'Health & Medical', slug: 'health-medical', priority: '0.80' },
  { name: 'Hobbies & Crafts', slug: 'hobbies-crafts', priority: '0.75' },
  { name: 'Languages & Learning', slug: 'languages-learning', priority: '0.80' },
  { name: 'Local & Regional', slug: 'local-regional', priority: '0.75' },
  { name: 'Adult / 18+', slug: 'adult-18', priority: '0.60' },
];

// Major Platform Hubs
const PLATFORM_HUBS = [
  { path: '/whatsapp-groups', name: 'WhatsApp Groups', priority: '0.95', changefreq: 'daily' },
  { path: '/telegram-channels', name: 'Telegram Channels', priority: '0.95', changefreq: 'daily' },
  { path: '/discord-servers', name: 'Discord Servers', priority: '0.95', changefreq: 'daily' },
  { path: '/facebook-groups', name: 'Facebook Groups', priority: '0.85', changefreq: 'daily' },
  { path: '/signal-groups', name: 'Signal Groups', priority: '0.85', changefreq: 'daily' },
  { path: '/reddit-communities', name: 'Reddit Communities', priority: '0.85', changefreq: 'daily' },
  { path: '/snapchat-groups', name: 'Snapchat Groups', priority: '0.85', changefreq: 'daily' },
];

// Top Regional Countries
const TOP_COUNTRIES = [
  { code: 'in', name: 'India', priority: '0.80' },
  { code: 'us', name: 'United States', priority: '0.80' },
  { code: 'gb', name: 'United Kingdom', priority: '0.80' },
  { code: 'br', name: 'Brazil', priority: '0.80' },
  { code: 'ca', name: 'Canada', priority: '0.75' },
  { code: 'au', name: 'Australia', priority: '0.75' },
  { code: 'de', name: 'Germany', priority: '0.75' },
  { code: 'fr', name: 'France', priority: '0.75' },
  { code: 'pk', name: 'Pakistan', priority: '0.75' },
  { code: 'ng', name: 'Nigeria', priority: '0.75' },
  { code: 'id', name: 'Indonesia', priority: '0.75' },
];

// Helper to determine URL path for a group
function getGroupUrlPath(group) {
  const rawSlug = group.slug || group.id;
  const slug = String(rawSlug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const plat = (group.platform || 'whatsapp').toLowerCase();

  if (plat === 'telegram') return `/community/${slug}`;
  if (plat === 'discord') return `/server/${slug}`;
  if (plat === 'whatsapp') return `/group/${slug}`;
  return `/group/${slug}`;
}

// Retrieve active groups via multi-tier fallback
async function fetchActiveGroups() {
  const groups = [];
  const seenIds = new Set();

  // Tier 1: Try local Next.js API if dev/prod server is up
  try {
    const port = process.env.PORT || '3000';
    const res = await fetch(`http://127.0.0.1:${port}/api/groups?pageSize=50000`, {
      headers: { 'User-Agent': 'SitemapGenerator/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.groups) && data.groups.length > 0) {
        for (const g of data.groups) {
          if (g && g.id && !seenIds.has(g.id)) {
            seenIds.add(g.id);
            groups.push(g);
          }
        }
        if (groups.length > 0) {
          return groups.filter(g => g.isActive !== false && g.is_active !== false);
        }
      }
    }
  } catch {}

  // Tier 2: Read from local seed or backup files
  const backupPaths = [
    path.join(ROOT_DIR, 'Original 1500.json'),
    path.join(ROOT_DIR, 'data', 'groups.json'),
  ];

  for (const bPath of backupPaths) {
    if (fs.existsSync(bPath)) {
      try {
        const rawContent = fs.readFileSync(bPath, 'utf8');
        const parsed = JSON.parse(rawContent);
        const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.groups) ? parsed.groups : []);
        for (const g of list) {
          if (g && g.id && !seenIds.has(g.id)) {
            seenIds.add(g.id);
            groups.push(g);
          }
        }
      } catch {}
    }
  }

  // Tier 3: Parse from source seed file if needed
  if (groups.length === 0) {
    const seedPath = path.join(ROOT_DIR, 'src', 'data', 'seedGroups.ts');
    if (fs.existsSync(seedPath)) {
      try {
        const content = fs.readFileSync(seedPath, 'utf8');
        const idMatches = content.matchAll(/id:\s*['"]([^'"]+)['"]/g);
        const titleMatches = content.matchAll(/title:\s*['"]([^'"]+)['"]/g);
        const slugMatches = content.matchAll(/slug:\s*['"]([^'"]+)['"]/g);
        const ids = Array.from(idMatches, m => m[1]);
        const titles = Array.from(titleMatches, m => m[1]);
        const slugs = Array.from(slugMatches, m => m[1]);

        for (let i = 0; i < ids.length; i++) {
          if (ids[i] && !seenIds.has(ids[i])) {
            seenIds.add(ids[i]);
            groups.push({
              id: ids[i],
              title: titles[i] || 'Community',
              slug: slugs[i] || ids[i],
              platform: ids[i].includes('tg') ? 'telegram' : (ids[i].includes('dc') ? 'discord' : 'whatsapp'),
              createdAt: new Date().toISOString(),
              isActive: true,
            });
          }
        }
      } catch {}
    }
  }

  return groups.filter(g => g.isActive !== false && g.is_active !== false);
}

// Generate the complete XML sitemap content
export async function generateSitemapXml() {
  const baseUrl = getCanonicalBaseUrl();
  const now = new Date().toISOString();
  const activeGroups = await fetchActiveGroups();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  // 1. Core Pages
  const corePages = [
    { path: '', priority: '1.0', changefreq: 'daily' },
    { path: '/categories', priority: '0.90', changefreq: 'daily' },
    { path: '/countries', priority: '0.85', changefreq: 'daily' },
    { path: '/active24hours', priority: '0.90', changefreq: 'hourly' },
    { path: '/leaderboard', priority: '0.85', changefreq: 'daily' },
    { path: '/submit', priority: '0.80', changefreq: 'weekly' },
    { path: '/rules', priority: '0.60', changefreq: 'monthly' },
  ];

  for (const page of corePages) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}${page.path}`)}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // 2. Platform Hubs
  for (const hub of PLATFORM_HUBS) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}${hub.path}`)}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>${hub.changefreq}</changefreq>\n`;
    xml += `    <priority>${hub.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // 3. Category Hubs (both /categories/[slug] and /category/[slug])
  for (const cat of CATEGORIES) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}/categories/${cat.slug}`)}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>${cat.priority}</priority>\n`;
    xml += `  </url>\n`;

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}/category/${cat.slug}`)}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>${cat.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // 4. Regional Country Hubs
  for (const country of TOP_COUNTRIES) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}/country/${country.code}`)}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>${country.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // 5. Active Individual Communities
  for (const group of activeGroups) {
    const groupPath = getGroupUrlPath(group);
    const loc = `${baseUrl}${groupPath}`;
    const lastMod = group.updatedAt || group.publishedAt || group.createdAt || now;
    const isSpecial = Boolean(group.featured || group.isSticky || group.isDailyTopRanked);
    const priority = isSpecial ? '0.85' : '0.75';
    const changefreq = group.isDailyTopRanked ? 'hourly' : (isSpecial ? 'daily' : 'weekly');

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(loc)}</loc>\n`;
    xml += `    <lastmod>${escapeXml(new Date(lastMod).toISOString())}</lastmod>\n`;
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;

    // Only include external HTTP image URLs (avoid data URIs or Unsplash in sitemap images)
    if (group.imageUrl && group.imageUrl.startsWith('http') && !group.imageUrl.includes('unsplash.com')) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(group.imageUrl)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(group.title)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }

    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  return {
    xml,
    stats: {
      baseUrl,
      corePagesCount: corePages.length,
      platformHubsCount: PLATFORM_HUBS.length,
      categoriesCount: CATEGORIES.length * 2,
      countriesCount: TOP_COUNTRIES.length,
      activeGroupsCount: activeGroups.length,
      totalUrls: corePages.length + PLATFORM_HUBS.length + (CATEGORIES.length * 2) + TOP_COUNTRIES.length + activeGroups.length,
    }
  };
}

// Main execution when run via CLI
async function main() {
  const startTime = Date.now();
  console.log('🚀 Generating production sitemap.xml...');

  try {
    if (!fs.existsSync(PUBLIC_DIR)) {
      fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }

    const { xml, stats } = await generateSitemapXml();

    fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');

    const duration = Date.now() - startTime;
    const fileSizeKb = Math.round((Buffer.byteLength(xml, 'utf8') / 1024) * 10) / 10;

    console.log('✅ sitemap.xml successfully generated!');
    console.log(`📁 File: ${SITEMAP_PATH} (${fileSizeKb} KB)`);
    console.log(`🌐 Base URL: ${stats.baseUrl}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Platform Hubs:    ${stats.platformHubsCount}`);
    console.log(`   - Category Hubs:    ${stats.categoriesCount}`);
    console.log(`   - Country Hubs:     ${stats.countriesCount}`);
    console.log(`   - Core Pages:       ${stats.corePagesCount}`);
    console.log(`   - Active Groups:    ${stats.activeGroupsCount}`);
    console.log(`   -----------------------------`);
    console.log(`   - Total URLs:       ${stats.totalUrls}`);
    console.log(`⏱️ Completed in ${duration}ms`);
  } catch (err) {
    console.error('❌ Failed to generate sitemap.xml:', err);
    process.exit(1);
  }
}

// If executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
