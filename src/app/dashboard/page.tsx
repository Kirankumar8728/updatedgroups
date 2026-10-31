import React, { Suspense } from 'react';
import { getGroups, getNetworkStats } from '@/src/lib/groups-dal';
import { MainAppView } from '@/src/components/MainAppView';

export const metadata = {
  title: 'User Dashboard & Credits | Group Links',
  description: 'Manage your communities, promotions, referral rewards, and credits balance.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const [groupsResult, stats] = await Promise.all([
    getGroups({ limit: 25, sort: 'newest' }),
    getNetworkStats(),
  ]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400 font-sans">Loading Dashboard...</div>}>
      <MainAppView
        initialGroups={groupsResult.groups}
        initialTotalCount={groupsResult.total}
        initialStats={stats}
        autoOpenDashboard={true}
      />
    </Suspense>
  );
}
