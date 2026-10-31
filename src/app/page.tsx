import React, { Suspense } from 'react';
import { getGroups, getNetworkStats } from '@/src/lib/groups-dal';
import { MainAppView } from '@/src/components/MainAppView';
import { CommunitySkeletonGrid } from '@/src/components/CommunitySkeletonGrid';
import { buildPageMetadata, generateCollectionPageJsonLd } from '@/src/lib/rank';
import { isAdultContentHidden } from '@/src/lib/content-settings';

export const metadata = buildPageMetadata({
  title: 'Discover Active WhatsApp, Telegram, Discord & Instagram Groups | Group Links',
  description:
    'Join verified WhatsApp group links, Telegram channels, Discord servers, Instagram groups, and online communities. Find active groups by category, language, and topic.',
  pathname: '/',
  keywords: [
    'WhatsApp group links',
    'Telegram channels',
    'Discord servers',
    'Instagram groups',
    'Signal groups',
    'Facebook groups',
    'Reddit communities',
    'Snapchat groups',
    'social directory',
    'join active communities',
  ],
});

export const revalidate = 60;

export default async function HomePage() {
  const [groupsResult, stats] = await Promise.all([
    getGroups({ limit: 25, pageSize: 25, sort: 'newest', cardFieldsOnly: true }),
    getNetworkStats(),
  ]);

  const collectionJsonLd = generateCollectionPageJsonLd(
    'Discover Active WhatsApp, Telegram, Discord & Instagram Groups | Group Links',
    'Join verified WhatsApp group links, Telegram channels, Discord servers, Instagram groups, and online communities. Find active groups by category, language, and topic.',
    '/',
    groupsResult.groups
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <Suspense fallback={<CommunitySkeletonGrid count={9} />}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          pageHeading="Discover Active WhatsApp, Telegram, Discord & Instagram Groups"
          pageDescription="Browse verified group invite links, explore niche topics, and connect with global communities across WhatsApp, Telegram Channels, Discord, Reddit, Signal, Facebook, Instagram Groups, and Snapchat."
          hideAdultContent={isAdultContentHidden()}
        />
      </Suspense>
    </>
  );
}
