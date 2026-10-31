'use client';

import { useEffect } from 'react';

let metricQueue: any[] = [];
let debounceTimer: NodeJS.Timeout | null = null;

function flushMetrics() {
  if (metricQueue.length === 0) return;
  const batch = [...metricQueue];
  metricQueue = [];

  try {
    const body = JSON.stringify({
      batch,
      path: typeof window !== 'undefined' ? window.location.pathname : '/',
      timestamp: Date.now(),
    });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/vitals', blob);
    } else if (typeof fetch === 'function') {
      fetch('/api/vitals', {
        method: 'POST',
        body,
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(() => {});
    }
  } catch {
    // Non-blocking catch
  }
}

function sendMetricToVitalsEndpoint(metric: {
  id: string;
  name: string;
  value: number;
  rating?: string;
  delta?: number;
  navigationType?: string;
  path?: string;
}) {
  const payload = {
    id: metric.id,
    name: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value) / (metric.name === 'CLS' ? 1000 : 1),
    rating: metric.rating || 'good',
    delta: metric.delta ? Math.round(metric.delta * 100) / 100 : metric.value,
    navigationType: metric.navigationType,
  };

  metricQueue.push(payload);
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(flushMetrics, 3000);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushMetrics);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushMetrics();
    }
  });
}

/**
 * 100% Native Zero-Dependency Core Web Vitals Monitor with 3000ms batching debounce
 * to prevent hitting server rate limits on page load.
 */
export function WebVitalsMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return;
    }

    // 1. TTFB (Time to First Byte)
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        if (nav.responseStart > 0) {
          sendMetricToVitalsEndpoint({
            id: 'ttfb-' + Date.now(),
            name: 'TTFB',
            value: Math.round(nav.responseStart),
            rating: nav.responseStart < 800 ? 'good' : nav.responseStart < 1800 ? 'needs-improvement' : 'poor',
            navigationType: nav.type,
          });
        }
      }
    } catch {}

    // 2. FCP (First Contentful Paint)
    try {
      const paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            sendMetricToVitalsEndpoint({
              id: 'fcp-' + Date.now(),
              name: 'FCP',
              value: Math.round(entry.startTime),
              rating: entry.startTime < 1800 ? 'good' : entry.startTime < 3000 ? 'needs-improvement' : 'poor',
            });
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch {}

    // 3. LCP (Largest Contentful Paint)
    try {
      let lcpValue = 0;
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          lcpValue = lastEntry.startTime;
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      const reportLCP = () => {
        if (lcpValue > 0) {
          sendMetricToVitalsEndpoint({
            id: 'lcp-' + Date.now(),
            name: 'LCP',
            value: Math.round(lcpValue),
            rating: lcpValue < 2500 ? 'good' : lcpValue < 4000 ? 'needs-improvement' : 'poor',
          });
        }
      };

      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          reportLCP();
        }
      }, { once: true });
      window.addEventListener('pagehide', reportLCP, { once: true });
    } catch {}

    // 4. CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value || 0;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      const reportCLS = () => {
        sendMetricToVitalsEndpoint({
          id: 'cls-' + Date.now(),
          name: 'CLS',
          value: Math.round(clsValue * 1000) / 1000,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
        });
      };

      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          reportCLS();
        }
      }, { once: true });
      window.addEventListener('pagehide', reportCLS, { once: true });
    } catch {}

    // 5. INP / First Input Delay
    try {
      const inputObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const delay = (entry as any).processingStart - entry.startTime;
          if (delay > 0) {
            sendMetricToVitalsEndpoint({
              id: 'inp-' + Date.now(),
              name: 'INP',
              value: Math.round(delay),
              rating: delay < 200 ? 'good' : delay < 500 ? 'needs-improvement' : 'poor',
            });
          }
        }
      });
      inputObserver.observe({ type: 'first-input', buffered: true });
    } catch {}

    // 6. Global ChunkLoadError & SyntaxError Auto-Recovery
    const handleGlobalError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const message = String((event instanceof ErrorEvent ? event.message : event.reason?.message) || event);
      if (
        message.includes('Loading chunk') ||
        message.includes('ChunkLoadError') ||
        message.includes('Unexpected token') ||
        message.includes('SyntaxError') ||
        message.includes('app/layout') ||
        message.includes('Loading CSS chunk')
      ) {
        const reloadKey = 'app_chunk_auto_reload';
        const lastReload = sessionStorage.getItem(reloadKey);
        if (!lastReload || Date.now() - Number(lastReload) > 15000) {
          sessionStorage.setItem(reloadKey, String(Date.now()));
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
      flushMetrics();
    };
  }, []);

  return null;
}

export default WebVitalsMonitor;
