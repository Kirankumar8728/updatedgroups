import React, { Suspense } from 'react';
import { MainAppView } from '@/src/components/MainAppView';
import { getNetworkStats } from '@/src/lib/groups-dal';
import { buildPageMetadata } from '@/src/lib/rank';

export const metadata = buildPageMetadata({
  title: 'Advertise on Group Links — Direct Banner & Featured Placements',
  description: 'Reach tens of thousands of active community members daily through banner ads and sponsored placements.',
  pathname: '/ad',
});

export const revalidate = 60;

export default async function AdPage() {
  const stats = await getNetworkStats();

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Advertising Info...</div>}>
      <MainAppView initialStats={stats} initialTotalCount={stats.totalGroups} />
    </Suspense>
  );
}
