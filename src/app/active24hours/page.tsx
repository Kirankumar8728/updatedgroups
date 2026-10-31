import React, { Suspense } from 'react';
import { get24HourTrending } from '@/src/lib/groups-dal';
import { Active24HoursLeaderboardView } from '@/src/components/Active24HoursLeaderboardView';
import { LeaderboardSkeleton } from '@/src/components/LeaderboardSkeleton';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { get24HourCycleExpiration } from '@/src/utils/helpers';

export const metadata = buildPageMetadata({
  title: '24-Hour Active Communities & Leaderboard Promotions | GroupLinks',
  description:
    'Real-time 24-hour community rankings based on member joins, verified upvotes (1 per person), and shares. Crowned #1 champion is promoted to 3rd place on the home feed.',
  pathname: '/active24hours',
  keywords: [
    '24 hours trending groups',
    'active community promotion',
    'top WhatsApp groups 24h',
    'trending Telegram channels today',
    'community leaderboard promotion',
    'active social groups',
  ],
});

export const revalidate = 30; // Fresh 24-hour dynamic ranking data (ISR cached for fast sub-second transitions)

export default async function Active24HoursPage() {
  const trendingData = await get24HourTrending(50);
  const trendingGroups = Array.isArray(trendingData)
    ? trendingData
    : (trendingData && Array.isArray((trendingData as any).groups) ? (trendingData as any).groups : []);
  const champion = (trendingData as any)?.champion || (trendingGroups.length > 0 ? trendingGroups[0] : null);
  const cycleExpiration = (trendingData as any)?.cycleExpiration || get24HourCycleExpiration();

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: '24-Hour Trending Promotions', url: '/active24hours' },
  ]);

  const expiresAtIso = typeof cycleExpiration.expiresAt === 'string'
    ? cycleExpiration.expiresAt
    : (cycleExpiration.expiresAt?.toISOString ? cycleExpiration.expiresAt.toISOString() : new Date().toISOString());

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <Suspense fallback={<LeaderboardSkeleton />}>
        <Active24HoursLeaderboardView
          initialGroups={trendingGroups}
          initialChampion={champion}
          cycleExpiration={{
            expiresAt: expiresAtIso,
            expiresIso: cycleExpiration.expiresIso || expiresAtIso,
            formatted: cycleExpiration.formatted || '24h',
            hoursLeft: cycleExpiration.hoursLeft ?? 24,
            minutesLeft: cycleExpiration.minutesLeft ?? 0,
          }}
        />
      </Suspense>
    </>
  );
}
