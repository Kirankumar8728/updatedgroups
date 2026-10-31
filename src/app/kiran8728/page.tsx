import React, { Suspense } from 'react';
import { getGroups, getNetworkStats } from '@/src/lib/groups-dal';
import { MainAppView } from '@/src/components/MainAppView';

export const metadata = {
  title: 'Admin Portal Login | Group Links',
  description: 'Admin Portal restricted access.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Kiran8728Page() {
  const [groupsResult, stats] = await Promise.all([
    getGroups({ limit: 25, sort: 'newest' }),
    getNetworkStats(),
  ]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans">Opening Admin Portal...</div>}>
      <MainAppView
        initialGroups={groupsResult.groups}
        initialTotalCount={groupsResult.total}
        initialStats={stats}
        autoOpenAdmin={true}
      />
    </Suspense>
  );
}
