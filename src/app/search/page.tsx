import React, { Suspense } from 'react';
import { MainAppView } from '@/src/components/MainAppView';
import { getNetworkStats } from '@/src/lib/groups-dal';
import { buildPageMetadata } from '@/src/lib/rank';

export const metadata = buildPageMetadata({
  title: 'Search Groups & Communities',
  description: 'Search across thousands of WhatsApp, Telegram, Discord, and Signal groups.',
  pathname: '/search',
  noIndex: true, // Search result pages should not be indexed to prevent query spam and index bloat
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SearchPage() {
  const stats = await getNetworkStats();

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Search...</div>}>
      <MainAppView
        initialStats={stats}
        initialTotalCount={stats.totalGroups}
        pageHeading="Search Communities Directory"
        pageDescription="Search for active group invite links, channels, and forums across all supported platforms."
      />
    </Suspense>
  );
}
