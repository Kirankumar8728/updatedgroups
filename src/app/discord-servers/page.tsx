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
  const seoConfig = buildPlatformHubMetadata('discord');
  return buildPageMetadata({
    title: seoConfig.title,
    description: seoConfig.description,
    pathname: seoConfig.pathname,
    keywords: seoConfig.keywords,
  });
}

export default async function DiscordServersPage() {
  const [groupsResult, stats] = await Promise.all([
    getGroups({ platform: 'discord', limit: 50 }),
    getNetworkStats(),
  ]);

  const breadcrumbs = [
    { name: 'Platforms', url: '/' },
    { name: 'Discord Servers', url: '/discord-servers' },
  ];

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Discord Servers', url: '/discord-servers' },
  ]);

  const itemListJsonLd = generateItemListJsonLd(
    'Discord Servers Directory',
    '/discord-servers',
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
      <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Loading Discord Servers...</div>}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          initialPlatform="discord"
          lockPlatform="discord"
          pageHeading="Active Discord Servers"
          pageDescription="Browse verified Discord server invite links. Join gaming, developer, anime, and NFT communities on GroupLinks."
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </>
  );
}
