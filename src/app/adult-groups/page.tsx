import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { getGroups, getNetworkStats } from '@/src/lib/groups-dal';
import { AdultGroupsView } from '@/src/components/AdultGroupsView';
import { MainAppView } from '@/src/components/MainAppView';
import { CommunitySkeletonGrid } from '@/src/components/CommunitySkeletonGrid';
import { 
  buildPageMetadata, 
  generateCollectionPageJsonLd,
  generateBreadcrumbsJsonLd
} from '@/src/lib/rank';
import { isAdultContentHidden } from '@/src/lib/content-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const isHidden = isAdultContentHidden();

  if (isHidden) {
    return buildPageMetadata({
      title: 'Technology & Programming Groups Directory | Group Links',
      description:
        'Browse active verified technology, coding, and software development community links across WhatsApp, Telegram, Discord, and more.',
      pathname: '/adult-groups',
      keywords: [
        'technology groups',
        'programming communities',
        'coding whatsapp groups',
        'developer telegram channels',
        'software engineering discord servers',
        'tech groups directory'
      ],
    });
  }

  return buildPageMetadata({
    title: 'Adult 18+ Groups Directory | Group Links',
    description:
      'Browse adult 18+ verified group invite links across WhatsApp, Telegram, Discord, and more. Safe age-verified community discovery.',
    pathname: '/adult-groups',
    keywords: [
      'adult groups',
      '18+ groups directory',
      'nsfw group links',
      'verified adult communities',
      'adult whatsapp groups',
      'adult telegram channels'
    ],
  });
}

export default async function AdultGroupsPage() {
  const isHidden = isAdultContentHidden();

  const [groupsResult, stats] = await Promise.all([
    getGroups({ 
      category: isHidden ? 'Tech & Programming' : 'Adult / 18+', 
      showAdultOnly: !isHidden, 
      limit: 20, 
      pageSize: 20, 
      sort: 'newest', 
      cardFieldsOnly: true 
    }),
    getNetworkStats(),
  ]);

  if (isHidden) {
    const breadcrumbs = [
      { name: 'Technology & Programming Groups', url: '/adult-groups' }
    ];

    const collectionJsonLd = generateCollectionPageJsonLd(
      'Technology & Programming Groups Directory | Group Links',
      'Browse active verified technology, coding, and developer community links across WhatsApp, Telegram, Discord, and more.',
      '/adult-groups',
      groupsResult.groups
    );

    const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
      { name: 'Home', url: '/' },
      { name: 'Technology Groups', url: '/adult-groups' },
    ]);

    return (
      <div className="relative">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
        />
        <Suspense fallback={<CommunitySkeletonGrid count={9} badgeText="Technology Hub" />}>
          <MainAppView
            initialGroups={groupsResult.groups}
            initialTotalCount={groupsResult.total}
            initialStats={stats}
            initialCategory="Tech & Programming"
            lockCategory="Tech & Programming"
            pageHeading="Technology & Programming Communities"
            pageDescription="Explore active developer, coding, AI, and technology groups across WhatsApp, Telegram, Discord, and Signal. Family-safe and verified."
            showBreadcrumbs={true}
            breadcrumbs={breadcrumbs}
            hideAdultContent={true}
          />
        </Suspense>
      </div>
    );
  }

  const breadcrumbs = [
    { name: 'Adult 18+ Groups', url: '/adult-groups' }
  ];

  const collectionJsonLd = generateCollectionPageJsonLd(
    'Adult 18+ Groups Directory | Group Links',
    'Browse adult 18+ verified group invite links across WhatsApp, Telegram, Discord, and more.',
    '/adult-groups',
    groupsResult.groups
  );

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <Suspense fallback={<CommunitySkeletonGrid count={9} badgeText="Age-Restricted 18+" />}>
        <AdultGroupsView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </div>
  );
}
