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
  const seoConfig = buildPlatformHubMetadata('reddit');
  return buildPageMetadata({
    title: seoConfig.title,
    description: seoConfig.description,
    pathname: seoConfig.pathname,
    keywords: seoConfig.keywords,
  });
}

export default async function RedditCommunitiesPage() {
  const [groupsResult, stats] = await Promise.all([
    getGroups({ platform: 'reddit', limit: 50 }),
    getNetworkStats(),
  ]);

  const breadcrumbs = [
    { name: 'Platforms', url: '/' },
    { name: 'Reddit Communities', url: '/reddit-communities' },
  ];

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Reddit Communities', url: '/reddit-communities' },
  ]);

  const itemListJsonLd = generateItemListJsonLd(
    'Reddit Communities Directory',
    '/reddit-communities',
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
      <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Loading Reddit Communities...</div>}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          initialPlatform="reddit"
          lockPlatform="reddit"
          pageHeading="Active Reddit Subreddits & Communities"
          pageDescription="Browse verified Reddit community links, subreddits, and discussion hubs on GroupLinks."
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </>
  );
}
