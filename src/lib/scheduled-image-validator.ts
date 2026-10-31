/**
 * Scheduled Health & Night-Time Automation Engine
 *
 * Runs scheduled off-peak / night-time batch audits and provides manual triggers
 * to proactively detect, flag, and heal broken group image links & invite URLs.
 */

import { runBatchImageHealthCheck, validateGroupImageUrl, updateGroup, getGroupByIdOrSlug, clearGroupsDalCache, getGroups } from '@/src/lib/groups-dal';
import { checkGroupLinkHealth, LinkHealthResult } from '@/src/lib/link-health';
import { Group } from '@/src/types';

export type AutomationMode = 'nightly' | 'interval' | 'manual';

export interface HealthAuditItem {
  id: string;
  slug: string;
  title: string;
  platform: string;
  category: string;
  imageUrl?: string;
  url?: string;
  imageValid: boolean;
  imageStatusCode?: number;
  imageError?: string;
  replacedImageUrl?: string;
  imageFixed: boolean;
  linkStatus?: 'active' | 'revoked' | 'expired' | 'dead' | 'unverified';
  linkStatusCode?: number;
  linkReason?: string;
  checkedAt: string;
}

export interface HealthAuditReport {
  id: string;
  runType: 'nightly' | 'interval' | 'manual';
  checkedAt: string;
  durationMs: number;
  totalChecked: number;
  validImages: number;
  brokenImages: number;
  fixedImages: number;
  activeLinks: number;
  brokenLinks: number;
  items: HealthAuditItem[];
}

export interface HealthAutomationSettings {
  mode: AutomationMode;
  nightHour: number; // 0-23 UTC (e.g., 2 for 02:00 AM off-peak night)
  intervalHours: number; // e.g., 6, 12, 24
  batchSize: number; // 10-200
  autoFixImages: boolean;
  checkLinks: boolean;
}

export interface HealthAutomationState {
  settings: HealthAutomationSettings;
  isStarted: boolean;
  isRunning: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalRuns: number;
  latestReport: HealthAuditReport | null;
  historySummary: Array<{
    id: string;
    checkedAt: string;
    runType: string;
    totalChecked: number;
    brokenImages: number;
    fixedImages: number;
    brokenLinks: number;
    durationMs: number;
  }>;
}

const DEFAULT_SETTINGS: HealthAutomationSettings = {
  mode: 'nightly',
  nightHour: 2, // 02:00 AM UTC (Off-peak night time)
  intervalHours: 24,
  batchSize: 50,
  autoFixImages: true,
  checkLinks: true,
};

const globalForAutomation = globalThis as unknown as {
  _healthAutomationState?: HealthAutomationState;
  _healthAutomationTimer?: NodeJS.Timeout | null;
};

export function getHealthAutomationState(): HealthAutomationState {
  if (!globalForAutomation._healthAutomationState) {
    globalForAutomation._healthAutomationState = {
      settings: { ...DEFAULT_SETTINGS },
      isStarted: false,
      isRunning: false,
      lastRunAt: null,
      nextRunAt: calculateNextRunTime(DEFAULT_SETTINGS),
      totalRuns: 0,
      latestReport: null,
      historySummary: [],
    };
  }
  return globalForAutomation._healthAutomationState;
}

/**
 * Calculates the exact next scheduled timestamp based on current settings.
 */
export function calculateNextRunTime(settings: HealthAutomationSettings): string | null {
  if (settings.mode === 'manual') {
    return null;
  }

  const now = new Date();

  if (settings.mode === 'nightly') {
    const nextNight = new Date(now);
    nextNight.setUTCHours(settings.nightHour, 0, 0, 0);

    // If target hour has already passed today, schedule for tomorrow
    if (nextNight.getTime() <= now.getTime()) {
      nextNight.setUTCDate(nextNight.getUTCDate() + 1);
    }
    return nextNight.toISOString();
  }

  if (settings.mode === 'interval') {
    const intervalMs = Math.max(1, settings.intervalHours) * 60 * 60 * 1000;
    return new Date(now.getTime() + intervalMs).toISOString();
  }

  return null;
}

/**
 * Starts or reconfigures the automated scheduler timer in the background.
 */
export function startDailyImageValidationCron(): void {
  const state = getHealthAutomationState();
  if (state.isStarted) return;
  state.isStarted = true;

  scheduleNextAutomationTick();
}

export function startHealthAutomationCron(): void {
  startDailyImageValidationCron();
}

function scheduleNextAutomationTick() {
  const state = getHealthAutomationState();

  if (globalForAutomation._healthAutomationTimer) {
    clearTimeout(globalForAutomation._healthAutomationTimer);
    globalForAutomation._healthAutomationTimer = null;
  }

  if (state.settings.mode === 'manual') {
    state.nextRunAt = null;
    return;
  }

  const nextRunIso = calculateNextRunTime(state.settings);
  state.nextRunAt = nextRunIso;

  if (!nextRunIso) return;

  const delayMs = Math.max(1000, new Date(nextRunIso).getTime() - Date.now());

  // Cap setTimeout to avoid 32-bit int overflow (max ~24.8 days)
  const safeDelay = Math.min(delayMs, 2147483647);

  globalForAutomation._healthAutomationTimer = setTimeout(async () => {
    try {
      if (state.settings.mode !== 'manual' && !state.isRunning) {
        console.log(`[Health Automation] 🌙 Executing scheduled ${state.settings.mode} batch validation...`);
        await executeHealthValidationBatch({
          batchSize: state.settings.batchSize,
          autoFix: state.settings.autoFixImages,
          checkLinks: state.settings.checkLinks,
          runType: state.settings.mode === 'nightly' ? 'nightly' : 'interval',
        });
      }
    } catch (err: any) {
      console.warn('[Health Automation Cron error]:', err?.message);
    } finally {
      // Re-arm for subsequent cycle
      scheduleNextAutomationTick();
    }
  }, safeDelay);
}

/**
 * Updates automation settings and immediately re-arms the schedule.
 */
export function updateAutomationSettings(newSettings: Partial<HealthAutomationSettings>): HealthAutomationState {
  const state = getHealthAutomationState();
  state.settings = {
    ...state.settings,
    ...newSettings,
    nightHour: typeof newSettings.nightHour === 'number' ? Math.max(0, Math.min(23, newSettings.nightHour)) : state.settings.nightHour,
    batchSize: typeof newSettings.batchSize === 'number' ? Math.max(10, Math.min(200, newSettings.batchSize)) : state.settings.batchSize,
    intervalHours: typeof newSettings.intervalHours === 'number' ? Math.max(1, Math.min(168, newSettings.intervalHours)) : state.settings.intervalHours,
  };

  scheduleNextAutomationTick();
  return { ...state };
}

/**
 * Executes a full health validation batch across images and links.
 */
export async function executeHealthValidationBatch(options: {
  batchSize?: number;
  autoFix?: boolean;
  checkLinks?: boolean;
  runType?: 'nightly' | 'interval' | 'manual';
  offset?: number;
} = {}): Promise<HealthAuditReport> {
  const state = getHealthAutomationState();
  if (state.isRunning) {
    if (state.latestReport) return state.latestReport;
  }

  state.isRunning = true;
  const startTime = Date.now();
  const checkedAt = new Date().toISOString();
  const batchSize = options.batchSize ?? state.settings.batchSize;
  const autoFix = options.autoFix ?? state.settings.autoFixImages;
  const checkLinks = options.checkLinks ?? state.settings.checkLinks;
  const runType = options.runType ?? 'manual';
  const offset = options.offset ?? 0;

  try {
    const groupsResult = await getGroups({
      pageSize: Math.min(batchSize, 100),
      offset: Math.max(0, offset),
      status: 'all',
      includeAdult: true,
    });

    const groupsToCheck: Group[] = groupsResult.groups || [];
    const auditItems: HealthAuditItem[] = [];

    let validImages = 0;
    let brokenImages = 0;
    let fixedImages = 0;
    let activeLinks = 0;
    let brokenLinks = 0;

    // Concurrent micro-batching
    const CHUNK_SIZE = 5;
    for (let i = 0; i < groupsToCheck.length; i += CHUNK_SIZE) {
      const chunk = groupsToCheck.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (group) => {
          // 1. Image Validation
          const rawImg = group.imageUrl;
          const imgVal = await validateGroupImageUrl(rawImg, group.category, group.title, false);

          let imageFixed = false;
          let replacedImageUrl: string | undefined = undefined;

          if (imgVal.isValid) {
            validImages++;
          } else {
            brokenImages++;
            if (autoFix && imgVal.sanitizedUrl) {
              try {
                await updateGroup(group.id, {
                  imageUrl: imgVal.sanitizedUrl,
                  bannerUrl: group.bannerUrl ? undefined : imgVal.sanitizedUrl,
                });
                imageFixed = true;
                fixedImages++;
                replacedImageUrl = imgVal.sanitizedUrl;
              } catch (upErr: any) {
                console.warn(`[HealthAutomation] Failed to fix image for group ${group.id}:`, upErr?.message);
              }
            }
          }

          // 2. Link Health Validation
          let linkRes: LinkHealthResult | null = null;
          if (checkLinks && group.url) {
            try {
              linkRes = await checkGroupLinkHealth(group);
              if (linkRes.isActive) {
                activeLinks++;
              } else {
                brokenLinks++;
              }
            } catch (linkErr) {
              linkRes = {
                groupId: group.id,
                url: group.url,
                isActive: false,
                status: 'unverified',
                reason: 'Link validation timed out',
                checkedAt: new Date().toISOString(),
              };
            }
          }

          auditItems.push({
            id: group.id,
            slug: group.slug,
            title: group.title,
            platform: group.platform,
            category: group.category,
            imageUrl: rawImg,
            url: group.url,
            imageValid: imgVal.isValid,
            imageStatusCode: imgVal.statusCode,
            imageError: imgVal.error,
            replacedImageUrl,
            imageFixed,
            linkStatus: linkRes?.status,
            linkStatusCode: linkRes?.statusCode,
            linkReason: linkRes?.reason,
            checkedAt,
          });
        })
      );
    }

    clearGroupsDalCache();

    const durationMs = Date.now() - startTime;
    const report: HealthAuditReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      runType,
      checkedAt,
      durationMs,
      totalChecked: groupsToCheck.length,
      validImages,
      brokenImages,
      fixedImages,
      activeLinks,
      brokenLinks,
      items: auditItems,
    };

    state.lastRunAt = checkedAt;
    state.totalRuns += 1;
    state.latestReport = report;
    state.historySummary.unshift({
      id: report.id,
      checkedAt: report.checkedAt,
      runType: report.runType,
      totalChecked: report.totalChecked,
      brokenImages: report.brokenImages,
      fixedImages: report.fixedImages,
      brokenLinks: report.brokenLinks,
      durationMs: report.durationMs,
    });

    if (state.historySummary.length > 20) {
      state.historySummary = state.historySummary.slice(0, 20);
    }

    return report;
  } finally {
    state.isRunning = false;
    state.nextRunAt = calculateNextRunTime(state.settings);
  }
}

/**
 * Re-validates a single group on demand.
 */
export async function revalidateSingleGroup(
  groupId: string,
  autoFix = true
): Promise<{ success: boolean; item?: HealthAuditItem; error?: string }> {
  try {
    const group = await getGroupByIdOrSlug(groupId);
    if (!group) {
      return { success: false, error: 'Group not found' };
    }

    const now = new Date().toISOString();
    const rawImg = group.imageUrl;
    const imgVal = await validateGroupImageUrl(rawImg, group.category, group.title, false);

    let imageFixed = false;
    let replacedImageUrl: string | undefined = undefined;

    if (!imgVal.isValid && autoFix && imgVal.sanitizedUrl) {
      await updateGroup(group.id, {
        imageUrl: imgVal.sanitizedUrl,
        bannerUrl: group.bannerUrl ? undefined : imgVal.sanitizedUrl,
      });
      imageFixed = true;
      replacedImageUrl = imgVal.sanitizedUrl;
    }

    let linkRes: LinkHealthResult | null = null;
    if (group.url) {
      linkRes = await checkGroupLinkHealth(group);
    }

    const item: HealthAuditItem = {
      id: group.id,
      slug: group.slug,
      title: group.title,
      platform: group.platform,
      category: group.category,
      imageUrl: imageFixed ? replacedImageUrl : rawImg,
      url: group.url,
      imageValid: imgVal.isValid || imageFixed,
      imageStatusCode: imgVal.statusCode,
      imageError: imgVal.error,
      replacedImageUrl,
      imageFixed,
      linkStatus: linkRes?.status,
      linkStatusCode: linkRes?.statusCode,
      linkReason: linkRes?.reason,
      checkedAt: now,
    };

    // Update the item in the latest report if present
    const state = getHealthAutomationState();
    if (state.latestReport) {
      const idx = state.latestReport.items.findIndex((i) => i.id === groupId || i.slug === groupId);
      if (idx !== -1) {
        state.latestReport.items[idx] = item;
      } else {
        state.latestReport.items.unshift(item);
      }
    }

    clearGroupsDalCache();

    return { success: true, item };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to revalidate group' };
  }
}

export const executeDailyImageValidation = executeHealthValidationBatch;
export const getDailyImageValidationStatus = getHealthAutomationState;
