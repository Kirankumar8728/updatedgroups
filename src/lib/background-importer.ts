import fs from 'fs';
import path from 'path';
import { Platform, Category, Language, Region, Group } from '@/src/types';
import { 
  detectPlatformFromUrl, 
  extractUrlsFromText, 
  checkDuplicateCommunity,
  CATEGORIES, 
  LANGUAGES, 
  REGIONS, 
  categoryToSlug, 
  countryToSlug, 
  languageToSlug, 
  tagToSlug 
} from '@/src/utils/helpers';
import { createNewGroup, getGroupsDatabase } from '@/src/lib/groups-store';
import { createGroup as createGroupInDal } from '@/src/lib/groups-dal';
import { scrapeGroupMetadataDirect } from '@/src/lib/metadata-scraper';
import { analyzeGroupContent } from '@/src/utils/keywordFilter';
import { revalidatePath } from 'next/cache';

export interface BackgroundImportJobLog {
  id: string;
  url: string;
  platform: Platform;
  title?: string;
  category?: string;
  status: 'success' | 'duplicate' | 'error' | 'scraping' | 'publishing';
  message?: string;
  timestamp: string;
}

export interface BackgroundImportJobOptions {
  autoScrape: boolean;
  category: Category | 'auto';
  language: Language;
  region: Region;
  markVerified: boolean;
  concurrency: number;
  delayMs: number;
}

export interface BackgroundImportJob {
  id: string;
  fileName?: string;
  total: number;
  processed: number;
  successful: number;
  skippedDuplicates: number;
  failed: number;
  currentIndex: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  startedAt?: string;
  completedAt?: string;
  lastActiveAt: string;
  ratePerMinute: number;
  estimatedSecondsRemaining: number;
  options: BackgroundImportJobOptions;
  recentLogs: BackgroundImportJobLog[];
  failedUrls: { url: string; reason: string }[];
  errorSummary?: string;
}

interface InternalJobState extends BackgroundImportJob {
  queue: string[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'background_import_job.json');

const globalForWorker = globalThis as unknown as {
  nexusBackgroundJob?: InternalJobState;
  nexusWorkerActive?: boolean;
};

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Ignore directory creation failure
  }
}

function saveStateToDisk(job: InternalJobState): void {
  try {
    ensureDataDir();
    // Do not serialize more than 100 recent logs to keep file compact
    const clone = {
      ...job,
      recentLogs: job.recentLogs.slice(0, 100),
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(clone, null, 2), 'utf-8');
  } catch {
    // Ignore persistence errors
  }
}

function loadStateFromDisk(): InternalJobState | null {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && Array.isArray(parsed.queue)) {
        return parsed as InternalJobState;
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

/**
 * Get or initialize current background job state
 */
export function getBackgroundImportJob(): BackgroundImportJob {
  if (!globalForWorker.nexusBackgroundJob) {
    const fromDisk = loadStateFromDisk();
    if (fromDisk) {
      // If it was marked running when server restarted, transition to paused
      if (fromDisk.status === 'running') {
        fromDisk.status = 'paused';
      }
      globalForWorker.nexusBackgroundJob = fromDisk;
    } else {
      globalForWorker.nexusBackgroundJob = {
        id: `job-${Date.now()}`,
        total: 0,
        processed: 0,
        successful: 0,
        skippedDuplicates: 0,
        failed: 0,
        currentIndex: 0,
        status: 'idle',
        lastActiveAt: new Date().toISOString(),
        ratePerMinute: 0,
        estimatedSecondsRemaining: 0,
        options: {
          autoScrape: true,
          category: 'auto',
          language: 'English',
          region: 'Global',
          markVerified: false,
          concurrency: 3,
          delayMs: 300,
        },
        recentLogs: [],
        failedUrls: [],
        queue: [],
      };
    }
  }

  const { queue: _queue, ...publicJob } = globalForWorker.nexusBackgroundJob;
  return publicJob;
}

/**
 * Initialize a new import job with URLs from a text/csv file
 */
export function initializeBackgroundImport(
  rawInput: string,
  fileName?: string,
  options?: Partial<BackgroundImportJobOptions>
): BackgroundImportJob {
  const extracted = extractUrlsFromText(rawInput);
  // Deduplicate within the file itself
  const uniqueUrls: string[] = [];
  const seen = new Set<string>();

  for (const u of extracted) {
    const clean = u.trim();
    const lower = clean.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueUrls.push(clean);
    }
  }

  const mergedOptions: BackgroundImportJobOptions = {
    autoScrape: options?.autoScrape ?? true,
    category: options?.category ?? 'auto',
    language: options?.language ?? 'English',
    region: options?.region ?? 'Global',
    markVerified: options?.markVerified ?? false,
    concurrency: Math.max(1, Math.min(10, options?.concurrency ?? 3)),
    delayMs: Math.max(50, Math.min(3000, options?.delayMs ?? 300)),
  };

  const newJob: InternalJobState = {
    id: `job-${Date.now()}`,
    fileName: fileName || `Bulk-Links-${new Date().toISOString().slice(0, 10)}.txt`,
    total: uniqueUrls.length,
    processed: 0,
    successful: 0,
    skippedDuplicates: 0,
    failed: 0,
    currentIndex: 0,
    status: uniqueUrls.length > 0 ? 'running' : 'idle',
    startedAt: uniqueUrls.length > 0 ? new Date().toISOString() : undefined,
    lastActiveAt: new Date().toISOString(),
    ratePerMinute: 0,
    estimatedSecondsRemaining: 0,
    options: mergedOptions,
    recentLogs: [],
    failedUrls: [],
    queue: uniqueUrls,
  };

  globalForWorker.nexusBackgroundJob = newJob;
  saveStateToDisk(newJob);

  if (uniqueUrls.length > 0) {
    startWorkerLoop();
  }

  const { queue: _queue, ...publicJob } = newJob;
  return publicJob;
}

/**
 * Control worker state: pause, resume, cancel, clear
 */
export function controlBackgroundWorker(action: 'pause' | 'resume' | 'cancel' | 'clear'): BackgroundImportJob {
  const job = globalForWorker.nexusBackgroundJob || (loadStateFromDisk() as InternalJobState);

  if (!job) {
    return getBackgroundImportJob();
  }

  globalForWorker.nexusBackgroundJob = job;

  if (action === 'pause') {
    if (job.status === 'running') {
      job.status = 'paused';
      job.lastActiveAt = new Date().toISOString();
      addLogEntry(job, {
        id: `log-${Date.now()}`,
        url: '',
        platform: 'whatsapp',
        status: 'publishing',
        message: '⏸️ Background worker paused by admin',
        timestamp: new Date().toISOString(),
      });
    }
  } else if (action === 'resume') {
    if (job.status === 'paused' && job.currentIndex < job.total) {
      job.status = 'running';
      job.lastActiveAt = new Date().toISOString();
      addLogEntry(job, {
        id: `log-${Date.now()}`,
        url: '',
        platform: 'whatsapp',
        status: 'publishing',
        message: '▶️ Background worker resumed',
        timestamp: new Date().toISOString(),
      });
      startWorkerLoop();
    }
  } else if (action === 'cancel') {
    job.status = 'cancelled';
    job.completedAt = new Date().toISOString();
    job.lastActiveAt = new Date().toISOString();
    addLogEntry(job, {
      id: `log-${Date.now()}`,
      url: '',
      platform: 'whatsapp',
      status: 'publishing',
      message: '⏹️ Background worker stopped / cancelled by admin',
      timestamp: new Date().toISOString(),
    });
  } else if (action === 'clear') {
    globalForWorker.nexusBackgroundJob = {
      id: `job-${Date.now()}`,
      total: 0,
      processed: 0,
      successful: 0,
      skippedDuplicates: 0,
      failed: 0,
      currentIndex: 0,
      status: 'idle',
      lastActiveAt: new Date().toISOString(),
      ratePerMinute: 0,
      estimatedSecondsRemaining: 0,
      options: {
        autoScrape: true,
        category: 'auto',
        language: 'English',
        region: 'Global',
        markVerified: false,
        concurrency: 3,
        delayMs: 300,
      },
      recentLogs: [],
      failedUrls: [],
      queue: [],
    };
    saveStateToDisk(globalForWorker.nexusBackgroundJob);
    return getBackgroundImportJob();
  }

  saveStateToDisk(job);
  const { queue: _queue, ...publicJob } = job;
  return publicJob;
}

function addLogEntry(job: InternalJobState, log: BackgroundImportJobLog): void {
  job.recentLogs.unshift(log);
  if (job.recentLogs.length > 100) {
    job.recentLogs = job.recentLogs.slice(0, 100);
  }
}

/**
 * Main Background Worker Loop
 */
async function startWorkerLoop(): Promise<void> {
  if (globalForWorker.nexusWorkerActive) {
    return;
  }
  globalForWorker.nexusWorkerActive = true;

  const job = globalForWorker.nexusBackgroundJob;
  if (!job) {
    globalForWorker.nexusWorkerActive = false;
    return;
  }

  const startTime = Date.now();
  let itemsProcessedThisRun = 0;

  try {
    while (job.status === 'running' && job.currentIndex < job.queue.length) {
      const concurrency = Math.max(1, job.options.concurrency || 3);
      const batchStartIndex = job.currentIndex;
      const batchUrls = job.queue.slice(batchStartIndex, batchStartIndex + concurrency);

      if (batchUrls.length === 0) {
        break;
      }

      // Process batch concurrently
      const batchPromises = batchUrls.map(async (rawUrl, offset) => {
        const itemIndex = batchStartIndex + offset;
        const platform = detectPlatformFromUrl(rawUrl);

        try {
          // 1. Fast duplicate check against DB before scraping to save network
          const isDuplicate = checkDuplicateCommunity({ url: rawUrl, platform }, getGroupsDatabase());
          if (isDuplicate.isDuplicate) {
            job.skippedDuplicates++;
            addLogEntry(job, {
              id: `log-${itemIndex}-${Date.now()}`,
              url: rawUrl,
              platform,
              title: isDuplicate.matchedGroup?.title || `${platform.toUpperCase()} Group`,
              status: 'duplicate',
              message: `Duplicate detected: already listed on GroupLinks`,
              timestamp: new Date().toISOString(),
            });
            return;
          }

          let title = '';
          let description = '';
          let imageUrl = '';
          let category: Category =
            job.options.category === 'auto' ? 'Tech & Programming' : (job.options.category as Category);
          let language: Language = job.options.language;
          let region: Region = job.options.region;
          let customTags = [`#${platform}`, '#community'];
          let memberCount = 250;

          // 2. Perform metadata scraping if enabled
          if (job.options.autoScrape) {
            try {
              const scData = await scrapeGroupMetadataDirect(rawUrl, platform);
              if ((scData as any).isExpired || (scData as any).expiredReason) {
                job.failed++;
                job.failedUrls.push({ url: rawUrl, reason: (scData as any).expiredReason || (scData as any).error || 'Expired invite link skipped' });
                addLogEntry(job, {
                  id: `log-${itemIndex}-${Date.now()}`,
                  url: rawUrl,
                  platform,
                  title: scData.title || `${platform.toUpperCase()} Group`,
                  status: 'error',
                  message: `Skipped expired group invite: ${(scData as any).expiredReason || (scData as any).error || 'Expired invite link'}`,
                  timestamp: new Date().toISOString(),
                });
                return;
              }
              if (scData.success) {
                title = scData.title || '';
                description = scData.description || '';
                imageUrl = scData.imageUrl || '';

                if (job.options.category === 'auto' && scData.suggestedCategory) {
                  category = scData.suggestedCategory;
                }
                if (scData.suggestedLanguage && (LANGUAGES as readonly string[]).includes(scData.suggestedLanguage)) {
                  language = scData.suggestedLanguage as Language;
                }
                if (scData.suggestedTags && Array.isArray(scData.suggestedTags) && scData.suggestedTags.length > 0) {
                  customTags = scData.suggestedTags;
                }
                if (scData.memberCount) {
                  memberCount = scData.memberCount;
                }
              }
            } catch {
              // Ignore scrape network failure and proceed with fallback
            }
          }

          // Fallback title / description
          if (!title) {
            try {
              const parsed = new URL(rawUrl);
              const pathPart = parsed.pathname.replace(/^\/|\/$/g, '').split('/').pop() || '';
              title = pathPart
                ? pathPart.replace(/[-_+]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                : `${platform.toUpperCase()} Group`;
            } catch {
              title = `${platform.toUpperCase()} Group`;
            }
          }

          if (!description) {
            description = `Join ${title} on ${platform.toUpperCase()}. Connect with active members and discuss shared topics.`;
          }

          const adultAnalysis = analyzeGroupContent({ title, description, customTags });
          const isNsfw = category === 'Adult / 18+' || adultAnalysis.isAdult;
          if (isNsfw) {
            category = 'Adult / 18+';
          }

          // 3. Register group in server database and store
          const created = await createGroupInDal({
            title,
            description,
            url: rawUrl,
            platform,
            category,
            language,
            region,
            customTags,
            imageUrl: imageUrl || '',
            memberCount,
            verified: job.options.markVerified,
            isNsfw,
            status: 'approved',
            isActive: true,
          });

          job.successful++;
          addLogEntry(job, {
            id: `log-${itemIndex}-${Date.now()}`,
            url: rawUrl,
            platform,
            title: created.title,
            category: created.category,
            status: 'success',
            message: `Published successfully as #${created.slug}`,
            timestamp: new Date().toISOString(),
          });
        } catch (err: any) {
          const errMsg = err?.message || 'Unknown processing error';
          if (errMsg.includes('already listed') || errMsg.includes('Duplicate')) {
            job.skippedDuplicates++;
            addLogEntry(job, {
              id: `log-${itemIndex}-${Date.now()}`,
              url: rawUrl,
              platform,
              status: 'duplicate',
              message: `Duplicate skipped: already in database`,
              timestamp: new Date().toISOString(),
            });
          } else {
            job.failed++;
            job.failedUrls.push({ url: rawUrl, reason: errMsg });
            addLogEntry(job, {
              id: `log-${itemIndex}-${Date.now()}`,
              url: rawUrl,
              platform,
              status: 'error',
              message: errMsg,
              timestamp: new Date().toISOString(),
            });
          }
        }
      });

      await Promise.all(batchPromises);

      job.currentIndex += batchUrls.length;
      job.processed = job.currentIndex;
      job.lastActiveAt = new Date().toISOString();
      itemsProcessedThisRun += batchUrls.length;

      // Calculate speed and ETA
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      if (elapsedMinutes > 0.05 && itemsProcessedThisRun > 0) {
        job.ratePerMinute = Math.round(itemsProcessedThisRun / elapsedMinutes);
        const remaining = job.total - job.processed;
        if (job.ratePerMinute > 0) {
          job.estimatedSecondsRemaining = Math.round((remaining / job.ratePerMinute) * 60);
        }
      }

      // Save state every batch
      saveStateToDisk(job);

      // Revalidate sitemaps every 30 items
      if (job.processed % 30 === 0 || job.processed >= job.total) {
        try {
          revalidatePath('/', 'layout');
          revalidatePath('/sitemap.xml');
          revalidatePath('/sitemap-groups.xml');
          revalidatePath('/sitemap-categories.xml');
          revalidatePath('/sitemap-tags.xml');
          revalidatePath('/sitemap-countries.xml');
          revalidatePath('/sitemap-languages.xml');
        } catch {
          // Ignore cache revalidation errors during background run
        }
      }

      // Delay between chunks to prevent aggressive rate limiting
      if (job.options.delayMs > 0 && job.status === 'running') {
        await new Promise(resolve => setTimeout(resolve, job.options.delayMs));
      }
    }

    if (job.currentIndex >= job.queue.length && job.status === 'running') {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.estimatedSecondsRemaining = 0;
      addLogEntry(job, {
        id: `log-done-${Date.now()}`,
        url: '',
        platform: 'whatsapp',
        status: 'success',
        message: `🎉 Background import complete! Finished processing all ${job.total} links.`,
        timestamp: new Date().toISOString(),
      });
      saveStateToDisk(job);
    }
  } catch (loopError: any) {
    job.status = 'error';
    job.errorSummary = loopError?.message || 'Worker encountered fatal error';
    saveStateToDisk(job);
  } finally {
    globalForWorker.nexusWorkerActive = false;
  }
}
