import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { getGroups, getNetworkStats } from '@/src/lib/groups-dal';
import { MainAppView } from '@/src/components/MainAppView';
import { 
  buildPlatformHubMetadata, 
  generateBreadcrumbsJsonLd,
  generateItemListJsonLd
} from '@/src/lib/programmatic-seo';
import { buildPageMetadata } from '@/src/lib/rank';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = buildPlatformHubMetadata('snapchat');
  return buildPageMetadata({
    title: seoConfig.title,
    description: seoConfig.description,
    pathname: seoConfig.pathname,
    keywords: seoConfig.keywords,
  });
}

export default async function SnapchatGroupsPage() {
  const [groupsResult, stats] = await Promise.all([
    getGroups({ platform: 'snapchat', limit: 50 }),
    getNetworkStats(),
  ]);

  const breadcrumbs = [
    { name: 'Platforms', url: '/' },
    { name: 'Snapchat Groups', url: '/snapchat-groups' },
  ];

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Snapchat Groups', url: '/snapchat-groups' },
  ]);

  const itemListJsonLd = generateItemListJsonLd(
    'Snapchat Groups Directory',
    '/snapchat-groups',
    groupsResult.groups
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Loading Snapchat Groups...</div>}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          initialPlatform="snapchat"
          lockPlatform="snapchat"
          pageHeading="Active Snapchat Groups"
          pageDescription="Browse verified Snapchat group invite links. Filter by category, language, and member count on GroupLinks."
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </>
  );
}
