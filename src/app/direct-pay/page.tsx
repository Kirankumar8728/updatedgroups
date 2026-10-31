import React, { Suspense } from 'react';
import { getGroups } from '@/src/lib/groups-dal';
import { DirectPayCheckoutView } from '@/src/components/DirectPayCheckoutView';

export const metadata = {
  title: 'Direct Pay Checkout | Group Links UPI Payment Gateway',
  description: 'Direct UPI payment checkout for instant group promotion on Group Links.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DirectPayPage() {
  const groupsResult = await getGroups({ limit: 100, sort: 'newest' });

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans">
        Loading Direct Pay Checkout...
      </div>
    }>
      <DirectPayCheckoutView initialGroups={groupsResult.groups} />
    </Suspense>
  );
}
