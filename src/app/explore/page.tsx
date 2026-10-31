import React, { Suspense } from 'react';
import { getGroups, getNetworkStats } from '@/src/lib/groups-dal';
import { MainAppView } from '@/src/components/MainAppView';
import { buildPageMetadata, generateCollectionPageJsonLd } from '@/src/lib/rank';

export const metadata = buildPageMetadata({
  title: 'Explore All Online Communities, Groups & Channels | GroupLinks',
  description:
    'Explore thousands of verified Telegram channels, WhatsApp groups, Discord servers, Signal chats, and Reddit communities organized by category and platform.',
  pathname: '/explore',
  keywords: [
    'Explore groups',
    'Telegram channels',
    'WhatsApp group links',
    'Discord servers',
    'Signal groups',
    'online communities directory',
    'social discovery',
  ],
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ExploreRootPage() {
  const [groupsResult, stats] = await Promise.all([
    getGroups({ limit: 60, sort: 'top' }),
    getNetworkStats(),
  ]);

  const collectionJsonLd = generateCollectionPageJsonLd(
    'Explore All Online Communities, Groups & Channels | GroupLinks',
    'Explore thousands of verified Telegram channels, WhatsApp groups, Discord servers, Signal chats, and Reddit communities.',
    '/explore',
    groupsResult.groups
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Explore Directory...</div>}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          pageHeading="Explore Global Communities & Group Links"
          pageDescription="Browse verified community invite links across WhatsApp, Telegram, Discord, Signal, and Reddit. Discover real-time trending topics and active niche groups."
        />
      </Suspense>
    </>
  );
}
