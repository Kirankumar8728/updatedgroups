import fs from 'fs';
import path from 'path';
import type { Group } from '../types';

// Use /tmp on Vercel or serverless environments where process.cwd() is read-only (EROFS)
const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const DATA_DIR = isServerless ? path.join('/tmp', '.data') : path.join(process.cwd(), '.data');
const GROUPS_FILE = path.join(DATA_DIR, 'nexus-groups.json');
const REPORTS_FILE = path.join(DATA_DIR, 'nexus-reports.json');
const KEYWORDS_FILE = path.join(DATA_DIR, 'nexus-keywords.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    // Fallback to /tmp if process.cwd() is read-only
    try {
      if (DATA_DIR !== path.join('/tmp', '.data')) {
        fs.mkdirSync(path.join('/tmp', '.data'), { recursive: true });
      }
    } catch {}
  }
}

let cachedDiskGroups: {
  mtime: number;
  data: Group[];
} | null = null;

let cachedDiskReports: {
  mtime: number;
  data: any[];
} | null = null;

let cachedDiskKeywords: {
  mtime: number;
  data: string[];
} | null = null;

/**
 * Returns the last modified timestamp of the groups file on disk.
 */
export function getGroupsDiskMtime(): number {
  try {
    const targetFile = fs.existsSync(GROUPS_FILE) ? GROUPS_FILE : path.join('/tmp', '.data', 'nexus-groups.json');
    if (!fs.existsSync(targetFile)) return 0;
    return fs.statSync(targetFile).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Loads persisted groups from disk cache.
 */
export function loadGroupsFromDisk(): Group[] | null {
  try {
    ensureDataDir();
    const targetFile = fs.existsSync(GROUPS_FILE) ? GROUPS_FILE : path.join('/tmp', '.data', 'nexus-groups.json');
    if (!fs.existsSync(targetFile)) return null;
    const stat = fs.statSync(targetFile);
    if (cachedDiskGroups && cachedDiskGroups.mtime === stat.mtimeMs) {
      return cachedDiskGroups.data;
    }
    const raw = fs.readFileSync(targetFile, 'utf-8');
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedDiskGroups = {
        mtime: stat.mtimeMs,
        data: parsed,
      };
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('[GROUPS PERSISTENCE] Notice reading groups from disk:', err);
    return null;
  }
}

/**
 * Persists groups array to local storage synchronously (resilient to EROFS on Vercel).
 */
export function saveGroupsToDiskSync(groups: Group[]): boolean {
  try {
    ensureDataDir();
    if (!Array.isArray(groups)) return false;
    
    let filePath = GROUPS_FILE;
    try {
      fs.writeFileSync(filePath, JSON.stringify(groups), 'utf-8');
    } catch (writeErr: any) {
      if (writeErr?.code === 'EROFS' || writeErr?.code === 'EACCES') {
        filePath = path.join('/tmp', '.data', 'nexus-groups.json');
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(groups), 'utf-8');
      } else {
        throw writeErr;
      }
    }

    try {
      const stat = fs.statSync(filePath);
      cachedDiskGroups = {
        mtime: stat.mtimeMs,
        data: groups,
      };
    } catch {}
    return true;
  } catch (err) {
    // Never crash group submission on serverless environments if disk write fails
    console.warn('[GROUPS PERSISTENCE] Notice saving groups to disk:', err);
    return true;
  }
}

export function saveGroupsToDiskAsync(groups: Group[]): Promise<boolean> {
  return Promise.resolve(saveGroupsToDiskSync(groups));
}

export const saveGroupsToDisk = saveGroupsToDiskSync;

export function scheduleGroupsPersistence(groups: Group[], _immediate = false): void {
  saveGroupsToDiskSync(groups);
}

export function flushGroupsPersistenceSync(): boolean {
  return true;
}

export function loadReportsFromDisk(): any[] | null {
  try {
    ensureDataDir();
    const targetFile = fs.existsSync(REPORTS_FILE) ? REPORTS_FILE : path.join('/tmp', '.data', 'nexus-reports.json');
    if (!fs.existsSync(targetFile)) return null;
    const stat = fs.statSync(targetFile);
    if (cachedDiskReports && cachedDiskReports.mtime === stat.mtimeMs) {
      return cachedDiskReports.data;
    }
    const raw = fs.readFileSync(targetFile, 'utf-8');
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedDiskReports = {
        mtime: stat.mtimeMs,
        data: parsed,
      };
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveReportsToDisk(reports: any[]): boolean {
  try {
    ensureDataDir();
    let filePath = REPORTS_FILE;
    try {
      fs.writeFileSync(filePath, JSON.stringify(reports), 'utf-8');
    } catch {
      filePath = path.join('/tmp', '.data', 'nexus-reports.json');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(reports), 'utf-8');
    }
    try {
      const stat = fs.statSync(filePath);
      cachedDiskReports = {
        mtime: stat.mtimeMs,
        data: reports,
      };
    } catch {}
    return true;
  } catch (err) {
    console.warn('[GROUPS PERSISTENCE] Notice saving reports to disk:', err);
    return true;
  }
}

export function loadKeywordsFromDisk(): string[] | null {
  try {
    ensureDataDir();
    const targetFile = fs.existsSync(KEYWORDS_FILE) ? KEYWORDS_FILE : path.join('/tmp', '.data', 'nexus-keywords.json');
    if (!fs.existsSync(targetFile)) return null;
    const stat = fs.statSync(targetFile);
    if (cachedDiskKeywords && cachedDiskKeywords.mtime === stat.mtimeMs) {
      return cachedDiskKeywords.data;
    }
    const raw = fs.readFileSync(targetFile, 'utf-8');
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedDiskKeywords = {
        mtime: stat.mtimeMs,
        data: parsed,
      };
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveKeywordsToDisk(keywords: string[]): boolean {
  try {
    ensureDataDir();
    let filePath = KEYWORDS_FILE;
    try {
      fs.writeFileSync(filePath, JSON.stringify(keywords), 'utf-8');
    } catch {
      filePath = path.join('/tmp', '.data', 'nexus-keywords.json');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(keywords), 'utf-8');
    }
    try {
      const stat = fs.statSync(filePath);
      cachedDiskKeywords = {
        mtime: stat.mtimeMs,
        data: keywords,
      };
    } catch {}
    return true;
  } catch (err) {
    console.warn('[GROUPS PERSISTENCE] Notice saving keywords to disk:', err);
    return true;
  }
}

export function clearPersistenceCache(): void {
  cachedDiskReports = null;
  cachedDiskKeywords = null;
}
