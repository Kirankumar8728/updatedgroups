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
  const seoConfig = buildPlatformHubMetadata('signal');
  return buildPageMetadata({
    title: seoConfig.title,
    description: seoConfig.description,
    pathname: seoConfig.pathname,
    keywords: seoConfig.keywords,
  });
}

export default async function SignalGroupsPage() {
  const [groupsResult, stats] = await Promise.all([
    getGroups({ platform: 'signal', limit: 50 }),
    getNetworkStats(),
  ]);

  const breadcrumbs = [
    { name: 'Platforms', url: '/' },
    { name: 'Signal Groups', url: '/signal-groups' },
  ];

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Signal Groups', url: '/signal-groups' },
  ]);

  const itemListJsonLd = generateItemListJsonLd(
    'Signal Groups Directory',
    '/signal-groups',
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
      <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Loading Signal Groups...</div>}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          initialPlatform="signal"
          lockPlatform="signal"
          pageHeading="Active Signal Groups"
          pageDescription="Browse verified privacy-focused Signal group invite links on GroupLinks."
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </>
  );
}
