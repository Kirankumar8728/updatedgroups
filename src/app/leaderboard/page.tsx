import React, { Suspense } from 'react';
import { getLeaderboardData, getNetworkStats } from '@/src/lib/groups-dal';
import { MainAppView } from '@/src/components/MainAppView';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';

export const metadata = buildPageMetadata({
  title: 'Top Social Communities Leaderboard | Community Rankings',
  description:
    'Discover top-ranked WhatsApp groups, Telegram channels, Discord servers, and communities ranked by member engagement, upvotes, and weekly growth.',
  pathname: '/leaderboard',
  keywords: [
    'top communities leaderboard',
    'best WhatsApp groups',
    'top Telegram channels',
    'popular Discord servers',
    'community rankings',
  ],
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LeaderboardPage() {
  const stats = await getNetworkStats();
  const breadcrumbs = [
    { name: 'Leaderboard', url: '/leaderboard' }
  ];

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Leaderboard', url: '/leaderboard' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Leaderboard...</div>}>
        <MainAppView
          initialStats={stats}
          initialTotalCount={stats.totalGroups}
          initialTab="leaderboard"
          pageHeading="Top Social Communities Leaderboard"
          pageDescription="Real-time rankings of the fastest-growing and most engaged social communities across WhatsApp, Telegram, Discord, Signal, and Reddit."
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </>
  );
}
