import fs from 'fs';
import path from 'path';
import { queryRows } from './db';

/**
 * Scans public/images for files not present in the database.
 */
export async function cleanupOrphanedImages(): Promise<{ deleted: number; error?: string }> {
  try {
    const dbImages = await queryRows<{ imageUrl: string; bannerUrl?: string }>('SELECT imageUrl, bannerUrl FROM groups_dir');
    const activePaths = new Set<string>();
    
    const extractPath = (url?: string) => {
      if (!url) return null;
      if (url.startsWith('/')) return url;
      try {
        const parsed = new URL(url);
        if (parsed.hostname === 'grouplinks.app' || parsed.hostname === 'localhost') {
          return parsed.pathname;
        }
      } catch {}
      return null;
    };

    dbImages.forEach(row => {
      const p1 = extractPath(row.imageUrl);
      const p2 = extractPath(row.bannerUrl);
      if (p1) activePaths.add(p1);
      if (p2) activePaths.add(p2);
    });

    const targetDirs = [
      path.join(process.cwd(), 'public', 'images'),
      path.join(process.cwd(), 'public', 'image')
    ];
    let deletedCount = 0;

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scanDir(fullPath);
        } else {
          const relativePath = '/' + path.relative(path.join(process.cwd(), 'public'), fullPath);
          // Only delete webp/png/jpg/jpeg files to be safe
          if (file.match(/\.(webp|png|jpg|jpeg)$/i) && !activePaths.has(relativePath)) {
            fs.unlinkSync(fullPath);
            deletedCount++;
          }
        }
      }
    }

    targetDirs.forEach(dir => scanDir(dir));

    return { deleted: deletedCount };
  } catch (error: any) {
    console.error('Error cleaning up orphaned images:', error);
    return { deleted: 0, error: error.message };
  }
}
