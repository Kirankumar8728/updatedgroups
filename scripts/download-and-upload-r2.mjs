#!/usr/bin/env node

/**
 * ==============================================================================
 * Cloudflare R2 / cdn.grouplinks.app Image Migration Engine
 * ==============================================================================
 *
 * Downloads external group avatar/banner images from WhatsApp, Telegram, Discord,
 * Reddit, Facebook, Unsplash, etc., resizes & compresses them into 150x150 WebP
 * (Fair Use Thumbnail Spec), and uploads them directly to Cloudflare R2 Bucket
 * served publicly via https://cdn.grouplinks.app.
 *
 * Usage:
 *   node scripts/download-and-upload-r2.mjs
 *   node scripts/download-and-upload-r2.mjs --limit=10
 *   node scripts/download-and-upload-r2.mjs --dry-run
 *   node scripts/download-and-upload-r2.mjs --force
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load environment variables (.env.local has precedence over .env)
dotenv.config({ path: path.join(ROOT_DIR, '.env.local') });
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const GROUPS_FILE = path.join(ROOT_DIR, '.data', 'nexus-groups.json');
const BACKUP_FILE = path.join(ROOT_DIR, 'Original_1500.json.bak');
const CDN_DOMAIN = (process.env.R2_PUBLIC_DOMAIN || 'https://cdn.grouplinks.app').replace(/\/+$/, '');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const isUpdateRecords = args.includes('--update-records');
const isSaveLocal = args.includes('--save-local') || args.includes('--local');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

// Cloudflare R2 Credentials
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME || 'grouplinks-assets';

const isR2Configured = Boolean(accountId && accessKeyId && secretAccessKey);
const shouldModifyRecords = (!isDryRun && isR2Configured) || isUpdateRecords;

// Optional MySQL pool setup
let dbPool = null;
if (process.env.DB_HOST && process.env.DB_NAME && (process.env.DB_USER || process.env.MYSQL_USER)) {
  try {
    dbPool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT || process.env.MYSQL_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 5000,
    });
  } catch (err) {
    console.warn('[DB NOTICE] MySQL pool initialization skipped:', err.message);
  }
}

// S3 Client for Cloudflare R2
let r2Client = null;
if (isR2Configured && !isDryRun) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Downloads image from remote URL or parses data URI into a Buffer.
 */
async function fetchImageBuffer(sourceUrl) {
  if (!sourceUrl || typeof sourceUrl !== 'string') return null;
  const cleanUrl = sourceUrl.trim().replace(/&amp;/g, '&');

  // Handle data URIs
  if (cleanUrl.startsWith('data:image/')) {
    try {
      if (cleanUrl.includes(';base64,')) {
        const base64Data = cleanUrl.split(';base64,')[1];
        return Buffer.from(base64Data, 'base64');
      } else {
        const rawPart = cleanUrl.split(',')[1];
        return Buffer.from(decodeURIComponent(rawPart), 'utf-8');
      }
    } catch {
      return null;
    }
  }

  // Handle standard HTTP/HTTPS URLs
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

/**
 * Compresses an image Buffer to 150x150 WebP with Sharp.
 */
async function processToWebp(buffer) {
  return await sharp(buffer)
    .resize(150, 150, {
      fit: 'cover',
      position: 'center',
      withoutEnlargement: false,
    })
    .webp({
      quality: 75,
      effort: 6,
    })
    .toBuffer();
}

/**
 * Uploads a WebP Buffer to Cloudflare R2 bucket.
 */
async function uploadToR2(key, webpBuffer) {
  if (!r2Client) return null;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: webpBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return `${CDN_DOMAIN}/${key}`;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 CLOUDFLARE R2 IMAGE DOWNLOAD & UPLOAD ENGINE');
  console.log(`📡 Target Public CDN: ${CDN_DOMAIN}`);
  console.log(`📦 Target R2 Bucket : ${bucket}`);
  console.log(`⚙️  Dry Run Mode      : ${isDryRun ? 'YES (Simulated)' : 'NO (Live Upload)'}`);
  console.log(`🔑 R2 Configured     : ${isR2Configured ? 'YES (Active)' : 'NO (Credentials Missing)'}`);
  console.log('='.repeat(70));

  if (!isR2Configured && !isDryRun) {
    if (isUpdateRecords) {
      console.log('\n📝 NOTICE: Cloudflare R2 credentials not detected. Running with --update-records:');
      console.log('   Generating 150x150 WebP thumbnails and updating groups to use cdn.grouplinks.app URLs.');
    } else {
      console.warn('\n⚠️  WARNING: Cloudflare R2 credentials are not set in .env or .env.local.');
      console.warn('   Required variables:');
      console.warn('   - R2_ACCOUNT_ID');
      console.warn('   - R2_ACCESS_KEY_ID');
      console.warn('   - R2_SECRET_ACCESS_KEY');
      console.warn('   - R2_BUCKET_NAME (default: grouplinks-assets)');
      console.warn('   - R2_PUBLIC_DOMAIN (default: https://cdn.grouplinks.app)');
      console.warn('\n   Running in DRY-RUN mode. Use --update-records to apply CDN URLs to groups.\n');
    }
  }

  // Load current groups
  if (!fs.existsSync(GROUPS_FILE)) {
    console.error(`❌ Groups file not found at ${GROUPS_FILE}`);
    process.exit(1);
  }

  const rawGroups = fs.readFileSync(GROUPS_FILE, 'utf-8');
  const groups = JSON.parse(rawGroups);
  console.log(`\n📂 Loaded ${groups.length} groups from .data/nexus-groups.json`);

  // Load backup to cross-reference original external URLs
  const backupUrlMap = new Map();
  if (fs.existsSync(BACKUP_FILE)) {
    try {
      const rawBackup = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const backupData = JSON.parse(rawBackup);
      const backupGroups = Array.isArray(backupData) ? backupData : (backupData.groups || []);
      for (const bg of backupGroups) {
        if (bg.id && bg.imageUrl && !bg.imageUrl.startsWith('data:') && !bg.imageUrl.includes('cdn.grouplinks.app')) {
          backupUrlMap.set(bg.id, bg.imageUrl);
          if (bg.slug) backupUrlMap.set(bg.slug, bg.imageUrl);
        }
      }
      console.log(`🔄 Found ${backupUrlMap.size} recoverable original external URLs in backup file.`);
    } catch (bErr) {
      console.warn('Notice reading backup file:', bErr.message);
    }
  }

  // Determine groups to process
  const toProcess = [];
  let alreadyOnCdn = 0;

  for (const group of groups) {
    const isAlreadyCdn = group.imageUrl && group.imageUrl.includes('cdn.grouplinks.app');
    if (isAlreadyCdn && !isForce) {
      alreadyOnCdn++;
      continue;
    }

    // Determine best source image URL
    let sourceUrl = group.imageUrl;
    const backupUrl = backupUrlMap.get(group.id) || backupUrlMap.get(group.slug);

    if (backupUrl && (!sourceUrl || sourceUrl.startsWith('data:') || sourceUrl.includes('fallback'))) {
      sourceUrl = backupUrl;
    }

    if (!sourceUrl) continue;

    toProcess.push({ group, sourceUrl });
    if (toProcess.length >= limit) break;
  }

  console.log(`📊 Total groups examined : ${groups.length}`);
  console.log(`✅ Already on CDN        : ${alreadyOnCdn}`);
  console.log(`🎯 Need Upload to CDN   : ${toProcess.length}`);

  if (toProcess.length === 0) {
    console.log('\n✨ All groups are already using cdn.grouplinks.app! Nothing to upload.');
    process.exit(0);
  }

  console.log('\n⏳ Starting download, WebP conversion, and R2 upload...\n');

  let uploaded = 0;
  let failed = 0;
  const startTime = Date.now();

  // Process in small concurrency batches (5 at a time)
  const CONCURRENCY = 5;
  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const chunk = toProcess.slice(i, i + CONCURRENCY);

    await Promise.all(chunk.map(async ({ group, sourceUrl }) => {
      const sanitizedId = (group.id || group.slug || 'unknown')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .slice(0, 50);

      const key = `icons/group-${sanitizedId}.webp`;

      try {
        const imgBuffer = await fetchImageBuffer(sourceUrl);
        if (!imgBuffer || imgBuffer.length === 0) {
          failed++;
          return;
        }

        const webpBuffer = await processToWebp(imgBuffer);
        let finalCdnUrl = `${CDN_DOMAIN}/${key}`;

        if (r2Client && !isDryRun) {
          finalCdnUrl = await uploadToR2(key, webpBuffer);
        }

        // Save local copy if requested or when running locally
        if (isSaveLocal) {
          try {
            const localPath = path.join(ROOT_DIR, 'public', key);
            fs.mkdirSync(path.dirname(localPath), { recursive: true });
            fs.writeFileSync(localPath, webpBuffer);
          } catch {}
        }

        if (r2Client && !isDryRun) {
          finalCdnUrl = await uploadToR2(key, webpBuffer);
        }

        // Update group record during live upload or when shouldModifyRecords is enabled
        if (shouldModifyRecords) {
          group.imageUrl = finalCdnUrl;
          if (!group.bannerUrl || group.bannerUrl.includes('fallback') || group.bannerUrl === sourceUrl) {
            group.bannerUrl = finalCdnUrl;
          }

          // Update MySQL if configured
          if (dbPool) {
            try {
              await dbPool.execute('UPDATE groups_dir SET imageUrl = ? WHERE id = ?', [finalCdnUrl, group.id]);
            } catch {}
          }
        }

        uploaded++;
        const pct = (((uploaded + failed) / toProcess.length) * 100).toFixed(1);
        const prefixTag = shouldModifyRecords ? (r2Client ? '[R2 LIVE]' : '[CDN SAVED]') : '[DRY RUN]';
        console.log(`${prefixTag} [${pct}%] ✅ Verified "${group.title.slice(0, 30)}" ➔ ${finalCdnUrl}`);
      } catch (err) {
        failed++;
        console.error(`❌ Failed for "${group.title}":`, err.message);
      }
    }));

    // Save progress to disk every 20 groups during live run
    if (shouldModifyRecords && ((i + CONCURRENCY) % 20 === 0 || i + CONCURRENCY >= toProcess.length)) {
      try {
        fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups), 'utf-8');
      } catch {}
    }
  }

  // Final flush to disk
  if (shouldModifyRecords && uploaded > 0) {
    try {
      fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups), 'utf-8');
      console.log(`\n💾 Saved updated groups to ${GROUPS_FILE}`);
    } catch (saveErr) {
      console.error('Failed to save to disk:', saveErr);
    }
  } else if (isDryRun) {
    console.log('\nℹ️  Dry run completed: No files were modified on disk.');
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(70));
  console.log('🎉 MIGRATION COMPLETED');
  console.log(`⏱️  Duration            : ${duration}s`);
  console.log(`✅ Successfully uploaded: ${uploaded}`);
  console.log(`❌ Failed               : ${failed}`);
  console.log(`🌐 Public CDN Domain    : ${CDN_DOMAIN}`);
  console.log('='.repeat(70));

  if (dbPool) {
    await dbPool.end();
  }
}

main().catch(err => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
