import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { 
  getGroupsDatabase, 
  replaceGroupsDatabase, 
  mergeGroupsDatabase,
  getRestrictedKeywordsServer,
  addRestrictedKeywordServer
} from '@/src/lib/groups-store';
import { 
  getCustomScriptsServer, 
  saveCustomScriptsServer,
  getAdsTxtServer,
  saveAdsTxtServer
} from '@/src/lib/server-scripts-persistence';
import { requireAdmin } from '@/src/lib/admin-auth';
import { verifySameOrigin } from '@/src/lib/security';
import { Group, GroupComment } from '@/src/types';
import { getPool } from '@/src/lib/db';
import { parseMysqlGroupRow } from '@/src/lib/groups-dal';
import { generateSlug } from '@/src/utils/helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  const { searchParams } = new URL(req.url);
  const isFullBackup = searchParams.get('full') === 'true';

  try {
    const pool = getPool();
    let db: Group[] = [];

    // 1. Query raw MySQL database directly
    if (pool) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM groups_dir ORDER BY createdAt DESC');
        if (Array.isArray(rows) && rows.length > 0) {
          db = rows.map((r: any) => parseMysqlGroupRow(r));
        }
      } catch (err: any) {
        console.warn('[MySQL backup GET notice]:', err?.message);
      }
    }

    // 2. Resilient fallback to memory store if MySQL returned 0 rows
    if (db.length === 0) {
      db = getGroupsDatabase();
    }

    const restrictedKeywords = getRestrictedKeywordsServer();
    const customScripts = getCustomScriptsServer();
    const adsTxt = getAdsTxtServer();

    let totalComments = 0;
    const allFlatComments: (GroupComment & { groupTitle: string; groupPlatform: string })[] = [];

    db.forEach(g => {
      if (Array.isArray(g.comments)) {
        totalComments += g.comments.length;
        g.comments.forEach(c => {
          allFlatComments.push({
            ...c,
            groupTitle: g.title,
            groupPlatform: g.platform,
          });
        });
      }
    });

    const backupData = {
      success: true,
      appName: 'Group Links Community Master Backup',
      version: '4.0.0',
      storageEngine: pool ? 'MySQL (Native)' : 'In-Memory Fallback',
      exportedAt: new Date().toISOString(),
      totalGroups: db.length,
      totalComments,
      restrictedKeywords,
      customScripts,
      adsTxt,
      groups: db,
      allComments: allFlatComments,
    };

    if (isFullBackup) {
      const zip = new AdmZip();
      
      // Add the JSON data
      zip.addFile('backup_data.json', Buffer.from(JSON.stringify(backupData, null, 2)));
      
      // Add physical images from public/image and public/images
      const uploadDir = path.join(process.cwd(), 'public', 'image');
      const legacyUploadDir = path.join(process.cwd(), 'public', 'images');
      
      if (fs.existsSync(uploadDir)) {
        zip.addLocalFolder(uploadDir, 'public_image');
      }
      if (fs.existsSync(legacyUploadDir)) {
        zip.addLocalFolder(legacyUploadDir, 'public_images_legacy');
      }
      
      const zipBuffer = zip.toBuffer();
      const fileName = `grouplinks_backup_full_${new Date().toISOString().split('T')[0]}.zip`;

      return new Response(zipBuffer as any, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          ...NO_CACHE_HEADERS
        }
      });
    }

    return NextResponse.json(backupData, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  const originCheck = verifySameOrigin(req);
  if (!originCheck.valid) {
    return originCheck.response!;
  }

  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let body: any = null;
    let mode: 'merge' | 'replace' = 'merge';

    if (contentType.includes('application/zip')) {
      const arrayBuffer = await req.arrayBuffer();
      const zip = new AdmZip(Buffer.from(arrayBuffer));
      const zipEntries = zip.getEntries();
      
      const dataEntry = zipEntries.find(e => e.entryName === 'backup_data.json');
      if (!dataEntry) {
        return NextResponse.json({ success: false, error: 'Invalid ZIP: backup_data.json missing' }, { status: 400 });
      }
      
      body = JSON.parse(dataEntry.getData().toString('utf8'));
      mode = body.mode === 'replace' ? 'replace' : 'merge';

      // Restore physical images
      const uploadDir = path.join(process.cwd(), 'public', 'image');
      const legacyUploadDir = path.join(process.cwd(), 'public', 'images');

      zipEntries.forEach(entry => {
        if (entry.entryName.startsWith('public_image/') && !entry.isDirectory) {
          const relativePath = entry.entryName.replace('public_image/', '');
          const targetPath = path.join(uploadDir, relativePath);
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(targetPath, entry.getData());
        }
        if (entry.entryName.startsWith('public_images_legacy/') && !entry.isDirectory) {
          const relativePath = entry.entryName.replace('public_images_legacy/', '');
          const targetPath = path.join(legacyUploadDir, relativePath);
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(targetPath, entry.getData());
        }
      });
    } else {
      body = await req.json();
      mode = body.mode === 'replace' ? 'replace' : 'merge';
    }

    let incomingGroups: Group[] = [];
    if (Array.isArray(body)) {
      incomingGroups = body;
    } else if (body && Array.isArray(body.groups)) {
      incomingGroups = body.groups;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid backup file format. Expected a "groups" array or an array of groups.' },
        { status: 400 }
      );
    }

    // Restore restricted keywords if provided
    if (body && Array.isArray(body.restrictedKeywords) && body.restrictedKeywords.length > 0) {
      body.restrictedKeywords.forEach((kw: string) => {
        if (typeof kw === 'string' && kw.trim()) {
          addRestrictedKeywordServer(kw.trim());
        }
      });
    }

    // Restore custom scripts if provided
    if (body && body.customScripts && typeof body.customScripts === 'object') {
      saveCustomScriptsServer(body.customScripts);
    }

    // Restore ads.txt if provided
    if (body && typeof body.adsTxt === 'string') {
      saveAdsTxtServer(body.adsTxt);
    }

    const pool = getPool();

    if (mode === 'replace') {
      let totalInserted = 0;
      if (pool && incomingGroups.length > 0) {
        try {
          await pool.query('DELETE FROM groups_dir');
          const CHUNK_SIZE = 50;
          for (let i = 0; i < incomingGroups.length; i += CHUNK_SIZE) {
            const chunk = incomingGroups.slice(i, i + CHUNK_SIZE);
            const placeholders: string[] = [];
            const values: any[] = [];
            for (const g of chunk) {
              placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
              const id = g.id || `grp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              const slug = g.slug || generateSlug(g.title || id);
              const nowIso = new Date().toISOString();
              values.push(
                id,
                slug,
                g.title || 'Untitled Community',
                g.description || '',
                g.url || '#',
                (g.platform || 'whatsapp').toLowerCase(),
                g.category || 'General',
                g.language || 'English',
                g.region || 'Global',
                JSON.stringify(Array.isArray(g.customTags) ? g.customTags : []),
                g.imageUrl || '',
                Number(g.memberCount) || 0,
                g.verified ? 1 : 0,
                g.isNsfw ? 1 : 0,
                g.status || 'approved',
                g.isActive !== false ? 1 : 0,
                Number(g.safetyScore) || 95,
                Number(g.growthRate) || 12,
                Number(g.clicks) || 0,
                Number(g.upvotes) || 0,
                Number(g.bookmarks) || 0,
                g.createdAt || nowIso,
                g.publishedAt || nowIso,
                nowIso,
                JSON.stringify(Array.isArray(g.comments) ? g.comments : [])
              );
            }
            const batchSql = `
              INSERT IGNORE INTO groups_dir (
                id, slug, title, description, url, platform, category,
                language, region, customTags, imageUrl, memberCount,
                verified, isNsfw, status, isActive, safetyScore,
                growthRate, clicks, upvotes, bookmarks, createdAt,
                publishedAt, updatedAt, comments
              ) VALUES ${placeholders.join(', ')}
            `;
            await pool.query(batchSql, values);
            totalInserted += chunk.length;
          }
        } catch (err: any) {
          console.warn('[MySQL backup restore notice]:', err?.message);
        }
      }

      const res = replaceGroupsDatabase(incomingGroups);
      return NextResponse.json({
        success: true,
        mode: 'replace',
        total: totalInserted > 0 ? totalInserted : res.total,
        totalComments: res.totalComments,
        message: `Database replaced successfully: ${totalInserted > 0 ? totalInserted : res.total} groups restored.`,
      });
    } else {
      let totalInserted = 0;
      if (pool && incomingGroups.length > 0) {
        try {
          const CHUNK_SIZE = 50;
          for (let i = 0; i < incomingGroups.length; i += CHUNK_SIZE) {
            const chunk = incomingGroups.slice(i, i + CHUNK_SIZE);
            const placeholders: string[] = [];
            const values: any[] = [];
            for (const g of chunk) {
              placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
              const id = g.id || `grp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              const slug = g.slug || generateSlug(g.title || id);
              const nowIso = new Date().toISOString();
              values.push(
                id,
                slug,
                g.title || 'Untitled Community',
                g.description || '',
                g.url || '#',
                (g.platform || 'whatsapp').toLowerCase(),
                g.category || 'General',
                g.language || 'English',
                g.region || 'Global',
                JSON.stringify(Array.isArray(g.customTags) ? g.customTags : []),
                g.imageUrl || '',
                Number(g.memberCount) || 0,
                g.verified ? 1 : 0,
                g.isNsfw ? 1 : 0,
                g.status || 'approved',
                g.isActive !== false ? 1 : 0,
                Number(g.safetyScore) || 95,
                Number(g.growthRate) || 12,
                Number(g.clicks) || 0,
                Number(g.upvotes) || 0,
                Number(g.bookmarks) || 0,
                g.createdAt || nowIso,
                g.publishedAt || nowIso,
                nowIso,
                JSON.stringify(Array.isArray(g.comments) ? g.comments : [])
              );
            }
            const batchSql = `
              INSERT IGNORE INTO groups_dir (
                id, slug, title, description, url, platform, category,
                language, region, customTags, imageUrl, memberCount,
                verified, isNsfw, status, isActive, safetyScore,
                growthRate, clicks, upvotes, bookmarks, createdAt,
                publishedAt, updatedAt, comments
              ) VALUES ${placeholders.join(', ')}
            `;
            await pool.query(batchSql, values);
            totalInserted += chunk.length;
          }
        } catch (err: any) {
          console.warn('[MySQL backup merge notice]:', err?.message);
        }
      }

      const res = mergeGroupsDatabase(incomingGroups);
      return NextResponse.json({
        success: true,
        mode: 'merge',
        added: res.added,
        updated: res.updated,
        total: res.total,
        totalComments: res.totalComments,
        message: `Successfully merged backup: ${res.added} added, ${res.updated} updated (${res.total} total groups).`,
      });
    }
  } catch (error: any) {
    console.error('[Backup POST error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
