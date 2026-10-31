'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { globalRequestThrottler } from './requestThrottle';

export interface GroupStatItem {
  upvotes: number;
  shares: number;
  clicks: number;
}

export function useLiveStats(groupIds: string[]) {
  const [statsMap, setStatsMap] = useState<Record<string, GroupStatItem>>({});
  const lastFetchedKeyRef = useRef<string>('');
  const rateLimitCooldownRef = useRef<number>(0);

  const groupIdsKey = Array.isArray(groupIds) ? groupIds.slice(0, 50).sort().join(',') : '';

  const fetchStats = useCallback(async (key: string) => {
    if (!key) return;
    if (Date.now() < rateLimitCooldownRef.current) return;

    const ids = key.split(',').filter(Boolean);
    if (ids.length === 0) return;

    lastFetchedKeyRef.current = key;

    try {
      await globalRequestThrottler.enqueue(async () => {
        const res = await fetch(`/api/stats/batch?ids=${encodeURIComponent(ids.join(','))}`);
        if (res.status === 429) {
          rateLimitCooldownRef.current = Date.now() + 30000;
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.stats) {
            setStatsMap(prev => ({ ...prev, ...data.stats }));
          }
        }
      });
    } catch {}
  }, []);

  useEffect(() => {
    if (!groupIdsKey) return;

    // Fetch immediately if group list changed
    if (groupIdsKey !== lastFetchedKeyRef.current && Date.now() >= rateLimitCooldownRef.current) {
      fetchStats(groupIdsKey);
    }

    // 60-second background refresh only when tab is visible
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && Date.now() >= rateLimitCooldownRef.current) {
        fetchStats(groupIdsKey);
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [groupIdsKey, fetchStats]);

  const optimisticallyIncrement = useCallback((groupId: string, action: 'upvote' | 'share' | 'join' | 'click') => {
    setStatsMap(prev => {
      const current = prev[groupId] || { upvotes: 0, shares: 0, clicks: 0 };
      const updated = { ...current };
      if (action === 'upvote') updated.upvotes += 1;
      if (action === 'share') updated.shares += 1;
      if (action === 'join' || action === 'click') updated.clicks += 1;
      return { ...prev, [groupId]: updated };
    });

    // Non-blocking background sync via throttler
    globalRequestThrottler.enqueue(async () => {
      await fetch('/api/stats/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, action }),
      });
    }).catch(() => {});
  }, []);

  return { statsMap, optimisticallyIncrement, refetch: () => fetchStats(groupIdsKey) };
}
