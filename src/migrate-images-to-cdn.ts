import fs from 'fs';
import path from 'path';
import { loadGroupsFromDisk, saveGroupsToDiskSync } from './lib/groups-persistence';
import { executeDml } from './lib/db';
import { uploadImageToR2, isR2Configured } from './lib/r2-storage';

async function migrateImagesToCDN() {
  console.log('[MIGRATION] Starting image migration to cdn.grouplinks.app...');
  const groups = loadGroupsFromDisk();
  
  if (!groups || !Array.isArray(groups)) {
    console.error('Failed to load groups from disk.');
    return;
  }

  // Load backup map for original external URLs if available
  const backupUrlMap = new Map<string, string>();
  try {
    const backupPath = path.join(process.cwd(), 'Original_1500.json.bak');
    if (fs.existsSync(backupPath)) {
      const raw = fs.readFileSync(backupPath, 'utf-8');
      const parsed = JSON.parse(raw);
      const backupGroups = Array.isArray(parsed) ? parsed : (parsed.groups || []);
      for (const bg of backupGroups) {
        if (bg.id && bg.imageUrl && !bg.imageUrl.startsWith('data:') && !bg.imageUrl.includes('cdn.grouplinks.app')) {
          backupUrlMap.set(bg.id, bg.imageUrl);
          if (bg.slug) backupUrlMap.set(bg.slug, bg.imageUrl);
        }
      }
    }
  } catch {}

  let processed = 0;
  let migrated = 0;
  let failed = 0;

  for (const group of groups) {
    processed++;
    if (group.imageUrl && group.imageUrl.includes('cdn.grouplinks.app')) {
      continue;
    }

    let sourceUrl = group.imageUrl;
    const backupUrl = backupUrlMap.get(group.id) || backupUrlMap.get(group.slug);
    if (backupUrl && (!sourceUrl || sourceUrl.startsWith('data:') || sourceUrl.includes('fallback'))) {
      sourceUrl = backupUrl;
    }

    if (!sourceUrl) continue;

    const sanitizedId = (group.id || group.slug || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .slice(0, 50);

    const exactKey = `icons/group-${sanitizedId}.webp`;

    console.log(`[MIGRATION] [${processed}/${groups.length}] Processing group ${group.id}: ${sourceUrl.slice(0, 60)}...`);

    try {
      const result = await uploadImageToR2(sourceUrl, sanitizedId, exactKey);
      if (result.success && result.r2Url) {
        group.imageUrl = result.r2Url;
        if (!group.bannerUrl || group.bannerUrl.includes('fallback') || group.bannerUrl === sourceUrl) {
          group.bannerUrl = result.r2Url;
        }

        try {
          await executeDml('UPDATE groups_dir SET imageUrl = ? WHERE id = ?', [result.r2Url, group.id]);
        } catch {}

        migrated++;
        console.log(`[MIGRATION] ✅ Successfully migrated image for ${group.id} ➔ ${result.r2Url}`);
      } else {
        failed++;
        console.error(`[MIGRATION] ❌ Failed to upload image for ${group.id}: ${result.error}`);
      }
    } catch (err: any) {
      failed++;
      console.error(`[MIGRATION] ❌ Error processing ${group.id}:`, err?.message || err);
    }

    if (migrated > 0 && migrated % 20 === 0) {
      saveGroupsToDiskSync(groups);
    }
  }

  if (migrated > 0) {
    saveGroupsToDiskSync(groups);
    console.log('[MIGRATION] Saved updated groups to disk cache.');
  }

  console.log(`[MIGRATION] Finished. Processed: ${processed}, Migrated: ${migrated}, Failed: ${failed}`);
}

migrateImagesToCDN().catch(console.error);
