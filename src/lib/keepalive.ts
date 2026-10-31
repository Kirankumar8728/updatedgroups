/**
 * Node.js Runtime Status & Health Tracking Engine
 *
 * Provides passive runtime state monitoring without artificial self-HTTP loops.
 * Prevents connection pool starvation and eliminates recursive proxy traffic against Nginx.
 */

export const KEEP_ALIVE_INTERVAL_MS = 4.5 * 60 * 1000;

export interface KeepAliveState {
  isStarted: boolean;
  intervalMs: number;
  intervalDescription: string;
  startedAt: string | null;
  lastHeartbeatAt: string | null;
  nextScheduledWakeAt: string | null;
  totalHeartbeats: number;
  lastPingStatus: 'success' | 'idle';
  lastPingUrl?: string;
  lastError?: string;
}

function getKeepAliveStore(): KeepAliveState {
  const g = globalThis as unknown as { _nexusKeepAliveState?: KeepAliveState };
  if (!g._nexusKeepAliveState) {
    g._nexusKeepAliveState = {
      isStarted: false,
      intervalMs: KEEP_ALIVE_INTERVAL_MS,
      intervalDescription: '4.50 minutes (270 seconds)',
      startedAt: null,
      lastHeartbeatAt: null,
      nextScheduledWakeAt: null,
      totalHeartbeats: 0,
      lastPingStatus: 'idle',
    };
  }
  return g._nexusKeepAliveState;
}

/**
 * Executes a lightweight in-process event-loop tick (no self-HTTP requests).
 */
export async function executeHeartbeatTick(): Promise<KeepAliveState> {
  const state = getKeepAliveStore();
  const now = new Date();
  state.lastHeartbeatAt = now.toISOString();
  state.nextScheduledWakeAt = new Date(now.getTime() + KEEP_ALIVE_INTERVAL_MS).toISOString();
  state.totalHeartbeats += 1;
  state.lastPingStatus = 'success';
  return { ...state };
}

/**
 * Initializes and starts the passive state tracker.
 */
export function startKeepAlive(): KeepAliveState {
  const state = getKeepAliveStore();
  if (!state.isStarted) {
    state.isStarted = true;
    state.startedAt = new Date().toISOString();
    state.lastHeartbeatAt = new Date().toISOString();
    state.nextScheduledWakeAt = new Date(Date.now() + KEEP_ALIVE_INTERVAL_MS).toISOString();
    
    // Dynamic import prevents circular module initialization dependencies
    try {
      import('./sitemap-canonical-auditor')
        .then((m) => m.startPeriodicSitemapAudit())
        .catch(() => {});

      import('./scheduled-image-validator')
        .then((m) => m.startDailyImageValidationCron())
        .catch(() => {});
    } catch {}
  }
  return { ...state };
}

/**
 * Returns current keep-alive status and metrics.
 */
export function getKeepAliveStatus(): KeepAliveState {
  return { ...getKeepAliveStore() };
}
