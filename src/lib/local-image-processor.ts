import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { computeImageHash, isKnownAdultImageHash } from './image-hash-db';

export interface ProcessedImageResult {
  success: boolean;
  imageUrl?: string;
  imageHash?: string;
  isKnownAdult?: boolean;
  error?: string;
}

function sanitizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'group';
}

/**
 * Validates, compresses and stores images as WebP.
 * Prevents non-image files (scripts/hacking tools) from being stored.
 * For adult groups, images are NEVER stored on the server disk.
 */
export async function processAndStoreImageLocally(
  sourceInput: string | Buffer,
  platform: string = 'whatsapp',
  groupTitle: string = 'group-icon',
  isAdult: boolean = false
): Promise<ProcessedImageResult> {
  try {
    let inputBuffer: Buffer;

    if (Buffer.isBuffer(sourceInput)) {
      inputBuffer = sourceInput;
    } else if (typeof sourceInput === 'string') {
      const cleanUrl = sourceInput.trim().replace(/&amp;/g, '&');
      if (cleanUrl.startsWith('data:image/')) {
        const base64Data = cleanUrl.includes(';base64,')
          ? cleanUrl.split(';base64,')[1]
          : cleanUrl.split(',')[1];
        if (!base64Data) {
          return { success: false, error: 'Invalid base64 data URI' };
        }
        inputBuffer = Buffer.from(base64Data, 'base64');
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(cleanUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          },
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (!res || !res.ok) {
          return await generateFallbackImage(platform, groupTitle);
        }

        const arrayBuffer = await res.arrayBuffer();
        inputBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      return { success: false, error: 'Invalid image input source' };
    }

    if (!inputBuffer || inputBuffer.length < 100) {
      return { success: false, error: 'Image file too small or empty' };
    }

    if (inputBuffer.length > 10 * 1024 * 1024) {
      return { success: false, error: 'Image file exceeds 10MB limit' };
    }

    // SECURITY: Verify it's actually an image and not a script/malicious file
    // Sharp will throw if it cannot parse the buffer as an image
    let metadata;
    try {
      metadata = await sharp(inputBuffer).metadata();
    } catch (e) {
      return { success: false, error: 'File is not a valid image or format is unsupported' };
    }

    if (!metadata.format || !['jpeg', 'png', 'webp', 'gif', 'avif', 'svg', 'heif'].includes(metadata.format)) {
      return { success: false, error: `Unsupported image format: ${metadata.format}` };
    }

    // Compute SHA-256 hash for adult check and unique naming
    const imageHash = await computeImageHash(inputBuffer);
    const isKnownAdult = imageHash ? isKnownAdultImageHash(imageHash) : false;

    // FOR ADULT GROUPS OR KNOWN ADULT IMAGES: Strictly do NOT store images on server disk.
    if (isAdult || isKnownAdult) {
      if (typeof sourceInput === 'string' && (sourceInput.startsWith('http') || sourceInput.startsWith('data:image/'))) {
        return { success: true, imageUrl: sourceInput, imageHash: imageHash || undefined, isKnownAdult: true };
      }
      return { success: true, imageUrl: '', imageHash: imageHash || undefined, isKnownAdult: true };
    }

    // Aggressive WebP compression & 600x600 thumbnail resizing using sharp (larger for banners)
    // Re-encoding through sharp guarantees any embedded scripts/malicious metadata are stripped.
    const resizedWebpBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(600, 600, {
        fit: 'cover',
        position: 'attention',
        withoutEnlargement: true,
      })
      .webp({ quality: 85, effort: 4, lossless: false })
      .toBuffer();

    // Store in public/image/{platform}/upload/{title}-{shortHash}.webp
    // format requested: "grouplinks.app/image/{platform}/upload/{title}.webp"
    // We add a short hash to ensure unique filenames and fix browser caching issues when updating images.
    const cleanPlatform = sanitizeTitle(platform || 'other');
    const cleanTitle = sanitizeTitle(groupTitle || 'group');
    const shortHash = imageHash ? imageHash.substring(0, 8) : crypto.randomBytes(4).toString('hex');
    
    const dirPath = path.join(process.cwd(), 'public', 'image', cleanPlatform, 'upload');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const fileName = `${cleanTitle}-${shortHash}.webp`;
    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, resizedWebpBuffer);

    // Also mirror to legacy public/images/{platform}/{title}/image1.webp for backward compatibility
    try {
      const legacyDirPath = path.join(process.cwd(), 'public', 'images', cleanPlatform, cleanTitle);
      if (!fs.existsSync(legacyDirPath)) {
        fs.mkdirSync(legacyDirPath, { recursive: true });
      }
      fs.writeFileSync(path.join(legacyDirPath, 'image1.webp'), resizedWebpBuffer);
    } catch {}

    const publicUrl = `/image/${cleanPlatform}/upload/${fileName}`;

    return {
      success: true,
      imageUrl: publicUrl,
      imageHash: imageHash || undefined,
      isKnownAdult: false,
    };
  } catch (err: any) {
    console.warn('[Local Image Processor Warning]:', err);
    if (typeof sourceInput === 'string' && sourceInput.startsWith('http')) {
      return { success: true, imageUrl: sourceInput };
    }
    return { success: false, error: err.message || 'Image processing failed' };
  }
}

export async function generateFallbackImage(platform: string, groupTitle: string): Promise<ProcessedImageResult> {
  const cleanPlatform = sanitizeTitle(platform || 'whatsapp');
  const cleanTitle = sanitizeTitle(groupTitle || 'group');
  const dirPath = path.join(process.cwd(), 'public', 'images', cleanPlatform, cleanTitle);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const initials = groupTitle.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const svg = `<svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#4f46e5" />
    <text x="50%" y="50%" font-family="sans-serif" font-size="60" fill="white" text-anchor="middle" dy=".3em">${initials}</text>
  </svg>`;
  
  const filePath = path.join(dirPath, 'image1.webp');
  await sharp(Buffer.from(svg)).webp().toFile(filePath);
  
  return {
    success: true,
    imageUrl: `/images/${cleanPlatform}/${cleanTitle}/image1.webp`
  };
}
