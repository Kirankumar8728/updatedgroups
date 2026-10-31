import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadGroupsFromDisk, saveGroupsToDiskSync } from '@/src/lib/groups-persistence';
import { executeDml } from '@/src/lib/db';
import { uploadImageToR2, isR2Configured } from '@/src/lib/r2-storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = parseInt(searchParams.get('limit') || '50', 10);
  const offsetParam = parseInt(searchParams.get('offset') || '0', 10);
  const force = searchParams.get('force') === 'true';

  const r2Ready = isR2Configured();
  const cdnDomain = (process.env.R2_PUBLIC_DOMAIN || 'https://cdn.grouplinks.app').replace(/\/+$/, '');

  const groups = loadGroupsFromDisk();
  if (!groups || !Array.isArray(groups)) {
    return NextResponse.json({ error: 'Failed to load groups from storage' }, { status: 500 });
  }

  // Load backup map to recover original external URLs if available
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

  let alreadyCdnCount = 0;
  const pendingGroups: { group: any; sourceUrl: string }[] = [];

  for (const group of groups) {
    const isCdn = group.imageUrl && group.imageUrl.includes('cdn.grouplinks.app');
    if (isCdn && !force) {
      alreadyCdnCount++;
      continue;
    }

    let sourceUrl = group.imageUrl || '';
    const backupUrl = backupUrlMap.get(group.id) || backupUrlMap.get(group.slug);
    if (backupUrl && (!sourceUrl || sourceUrl.startsWith('data:') || sourceUrl.includes('fallback'))) {
      sourceUrl = backupUrl;
    }

    if (sourceUrl) {
      pendingGroups.push({ group, sourceUrl });
    }
  }

  const batch = pendingGroups.slice(offsetParam, offsetParam + limitParam);
  let migrated = 0;
  let failed = 0;
  const migratedDetails: { id: string; title: string; cdnUrl?: string; error?: string }[] = [];

  for (const item of batch) {
    const sanitizedId = (item.group.id || item.group.slug || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .slice(0, 50);

    const exactKey = `icons/group-${sanitizedId}.webp`;

    try {
      const result = await uploadImageToR2(item.sourceUrl, sanitizedId, exactKey);
      if (result.success && result.r2Url) {
        item.group.imageUrl = result.r2Url;
        if (!item.group.bannerUrl || item.group.bannerUrl.includes('fallback') || item.group.bannerUrl === item.sourceUrl) {
          item.group.bannerUrl = result.r2Url;
        }

        // Update database if configured
        try {
          await executeDml('UPDATE groups_dir SET imageUrl = ? WHERE id = ?', [result.r2Url, item.group.id]);
        } catch {}

        migrated++;
        migratedDetails.push({ id: item.group.id, title: item.group.title, cdnUrl: result.r2Url });
      } else {
        failed++;
        migratedDetails.push({ id: item.group.id, title: item.group.title, error: result.error });
      }
    } catch (err: any) {
      failed++;
      migratedDetails.push({ id: item.group.id, title: item.group.title, error: err.message });
    }
  }

  // Persist updated groups to disk
  if (migrated > 0) {
    saveGroupsToDiskSync(groups);
  }

  return NextResponse.json({
    success: true,
    r2Configured: r2Ready,
    cdnDomain,
    totalGroups: groups.length,
    alreadyCdn: alreadyCdnCount,
    pendingTotal: pendingGroups.length,
    batchOffset: offsetParam,
    batchLimit: limitParam,
    batchProcessed: batch.length,
    migrated,
    failed,
    remaining: Math.max(0, pendingGroups.length - (offsetParam + batch.length)),
    details: migratedDetails,
  }, {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}
