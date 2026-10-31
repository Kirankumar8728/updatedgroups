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
  const seoConfig = buildPlatformHubMetadata('telegram');
  return buildPageMetadata({
    title: seoConfig.title,
    description: seoConfig.description,
    pathname: seoConfig.pathname,
    keywords: seoConfig.keywords,
  });
}

export default async function TelegramChannelsPage() {
  const [groupsResult, stats] = await Promise.all([
    getGroups({ platform: 'telegram', limit: 20, pageSize: 20, cardFieldsOnly: true }),
    getNetworkStats(),
  ]);

  const breadcrumbs = [
    { name: 'Platforms', url: '/' },
    { name: 'Telegram Channels', url: '/telegram-channels' },
  ];

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Telegram Channels', url: '/telegram-channels' },
  ]);

  const itemListJsonLd = generateItemListJsonLd(
    'Telegram Channels Directory',
    '/telegram-channels',
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
      <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Loading Telegram Channels...</div>}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          initialPlatform="telegram"
          lockPlatform="telegram"
          pageHeading="Active Telegram Channels"
          pageDescription="Browse verified Telegram channel invite links, discover active communities, and connect with global audiences."
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </>
  );
}
