import React, { Suspense } from 'react';
import { getGroups, getNetworkStats } from '@/src/lib/groups-dal';
import { MainAppView } from '@/src/components/MainAppView';

export const metadata = {
  title: 'Direct Promoted Groups | Group Links',
  description: 'Exclusive promoted groups list.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DirectPromotedGroupsPage() {
  const [groupsResult, stats] = await Promise.all([
    getGroups({ limit: 100, sort: 'newest', forDirectPromotedPage: true }),
    getNetworkStats(),
  ]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans">Loading Promoted Groups...</div>}>
      <MainAppView
        initialGroups={groupsResult.groups}
        initialTotalCount={groupsResult.total}
        initialStats={stats}
        pageHeading="Direct Promoted Groups"
        pageDescription="Exclusive list of community groups selected and promoted directly."
        hideAds={true}
        isDirectPromotedPage={true}
      />
    </Suspense>
  );
}
