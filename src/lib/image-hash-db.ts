import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const HASH_DB_PATH = path.join(process.cwd(), 'data', 'adult-image-hashes.json');

// Ensure data directory exists
try {
  const dir = path.dirname(HASH_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
} catch {}

let adultHashMap: Set<string> = new Set();

// Load existing hashes on startup
function loadHashDb() {
  try {
    if (fs.existsSync(HASH_DB_PATH)) {
      const raw = fs.readFileSync(HASH_DB_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        adultHashMap = new Set(data);
      }
    }
  } catch (err) {
    console.warn('[ImageHashDB] Failed to load hash DB:', err);
  }
}

loadHashDb();

function saveHashDb() {
  try {
    const dir = path.dirname(HASH_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(HASH_DB_PATH, JSON.stringify(Array.from(adultHashMap), null, 2), 'utf-8');
  } catch (err) {
    console.warn('[ImageHashDB] Failed to save hash DB:', err);
  }
}

/**
 * Computes a SHA-256 hash for an image buffer or URL/data URI.
 */
export async function computeImageHash(source: Buffer | string): Promise<string | null> {
  try {
    let buffer: Buffer;

    if (Buffer.isBuffer(source)) {
      buffer = source;
    } else if (typeof source === 'string' && source.trim()) {
      const clean = source.trim();
      if (clean.startsWith('data:image/')) {
        const base64 = clean.includes(';base64,') ? clean.split(';base64,')[1] : clean.split(',')[1];
        if (!base64) return null;
        buffer = Buffer.from(base64, 'base64');
      } else {
        const res = await fetch(clean, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          referrerPolicy: 'no-referrer',
        }).catch(() => null);

        if (!res || !res.ok) return null;
        const arrayBuf = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      }
    } else {
      return null;
    }

    if (!buffer || buffer.length === 0) return null;

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return hash;
  } catch {
    return null;
  }
}

/**
 * Checks if an image SHA-256 hash is already recorded in the adult image database.
 */
export function isKnownAdultImageHash(hash?: string | null): boolean {
  if (!hash) return false;
  return adultHashMap.has(hash.toLowerCase());
}

/**
 * Registers an adult image SHA-256 hash into the database to instantly block repeat uploads.
 */
export function registerAdultImageHash(hash?: string | null): void {
  if (!hash) return;
  const clean = hash.toLowerCase();
  if (!adultHashMap.has(clean)) {
    adultHashMap.add(clean);
    saveHashDb();
  }
}
