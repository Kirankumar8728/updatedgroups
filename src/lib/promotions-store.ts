import fs from 'fs';
import path from 'path';
import { ManualPromotionRequest, Group } from '@/src/types';
import { getGroupById } from './groups-dal';
import { persistCurrentGroups } from './groups-store';

const DATA_DIR = path.join(process.cwd(), '.data');
const PROMOTIONS_FILE = path.join(DATA_DIR, 'nexus-manual-promotions.json');

const globalForPromotions = globalThis as unknown as {
  nexusManualPromotions?: ManualPromotionRequest[];
};

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[PROMOTIONS PERSISTENCE] Failed to create data dir:', err);
  }
}

export function loadPromotionsFromDisk(): ManualPromotionRequest[] {
  try {
    ensureDataDir();
    if (fs.existsSync(PROMOTIONS_FILE)) {
      const raw = fs.readFileSync(PROMOTIONS_FILE, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('[PROMOTIONS PERSISTENCE] Error reading promotions from disk:', err);
  }
  return [];
}

export function savePromotionsToDisk(promotions: ManualPromotionRequest[]): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(PROMOTIONS_FILE, JSON.stringify(promotions, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[PROMOTIONS PERSISTENCE] Error saving promotions to disk:', err);
    return false;
  }
}

export function getManualPromotions(): ManualPromotionRequest[] {
  if (!globalForPromotions.nexusManualPromotions) {
    globalForPromotions.nexusManualPromotions = loadPromotionsFromDisk();
  }
  return globalForPromotions.nexusManualPromotions;
}

export function addManualPromotion(req: ManualPromotionRequest): ManualPromotionRequest {
  const promotions = getManualPromotions();
  // Add to top of list
  promotions.unshift(req);
  globalForPromotions.nexusManualPromotions = promotions;
  savePromotionsToDisk(promotions);
  return req;
}

export async function approveAndActivatePromotion(promoId: string): Promise<{ success: boolean; promotion?: ManualPromotionRequest; group?: Group; error?: string }> {
  const promotions = getManualPromotions();
  const promo = promotions.find(p => p.id === promoId);
  if (!promo) {
    return { success: false, error: 'Promotion request not found' };
  }

  const group = await getGroupById(promo.groupId);
  if (!group) {
    return { success: false, error: 'Associated group not found' };
  }

  // Calculate new stickyUntil
  const durationMs = promo.durationMs || (promo.durationMinutes ? promo.durationMinutes * 60 * 1000 : 3600000);
  const currentExpiry =
    group.isSticky && group.stickyUntil && new Date(group.stickyUntil).getTime() > Date.now()
      ? new Date(group.stickyUntil).getTime()
      : Date.now();

  const newExpiry = new Date(currentExpiry + durationMs).toISOString();

  // Activate Sticky on group
  group.isSticky = true;
  group.stickyUntil = newExpiry;
  group.stickyOrder = 1;
  group.featured = true;
  group.isPromoted = true;
  persistCurrentGroups();

  // Update promotion record
  promo.status = 'active';
  promo.approvedAt = new Date().toISOString();
  promo.stickyUntil = newExpiry;
  savePromotionsToDisk(promotions);

  return { success: true, promotion: promo, group };
}

export function updatePromotionStatus(promoId: string, status: 'pending' | 'approved' | 'active' | 'rejected', notes?: string): ManualPromotionRequest | null {
  const promotions = getManualPromotions();
  const promo = promotions.find(p => p.id === promoId);
  if (!promo) return null;

  promo.status = status;
  if (notes !== undefined) promo.notes = notes;
  savePromotionsToDisk(promotions);
  return promo;
}

export function deleteManualPromotion(promoId: string): boolean {
  const promotions = getManualPromotions();
  const index = promotions.findIndex(p => p.id === promoId);
  if (index === -1) return false;

  promotions.splice(index, 1);
  globalForPromotions.nexusManualPromotions = promotions;
  savePromotionsToDisk(promotions);
  return true;
}
