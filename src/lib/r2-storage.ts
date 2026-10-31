import { S3Client } from '@aws-sdk/client-s3';
import { processAndStoreImageLocally } from './local-image-processor';

interface R2UploadResult {
  success: boolean;
  r2Url?: string;
  key?: string;
  error?: string;
}

export function isR2Configured(): boolean {
  return false; // cdn.grouplinks.app storage disabled. Images stored on server only.
}

export function getR2Client(): { client: S3Client; bucket: string; publicDomain: string } | null {
  return null;
}

/**
 * Compresses and stores images as WebP at grouplinks.app/images/{platform}/{grouptitle}/image1.webp.
 * For adult groups, images are NEVER stored on the server.
 */
export async function uploadImageToR2(
  sourceImageUrl: string,
  imageKeyPrefix: string = 'group-icon',
  customExactKey?: string,
  platform: string = 'whatsapp',
  isAdult: boolean = false
): Promise<R2UploadResult> {
  const result = await processAndStoreImageLocally(sourceImageUrl, platform, imageKeyPrefix, isAdult);
  if (result.success && result.imageUrl) {
    return {
      success: true,
      r2Url: result.imageUrl,
      key: `local-server/${imageKeyPrefix}-${Date.now()}.webp`,
    };
  }
  return {
    success: false,
    error: result.error || 'Failed to process and store image locally on server.',
  };
}
