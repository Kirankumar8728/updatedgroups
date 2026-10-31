import React, { Suspense } from 'react';
import { getGroups } from '@/src/lib/groups-dal';
import { DirectPayCheckoutView } from '@/src/components/DirectPayCheckoutView';

export const metadata = {
  title: 'Promote Your Group | Pin & Boost Placement on Group Links',
  description: 'Promote your WhatsApp, Telegram, or Discord community with instant top-slot pinned placement.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PromotePage() {
  const groupsResult = await getGroups({ limit: 100, sort: 'newest' });

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans">
        Loading Promotion Portal...
      </div>
    }>
      <DirectPayCheckoutView initialGroups={groupsResult.groups} />
    </Suspense>
  );
}
