import React, { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getGroups, getNetworkStats } from '@/src/lib/groups-dal';
import { MainAppView } from '@/src/components/MainAppView';
import { 
  buildPlatformHubMetadata, 
  generateBreadcrumbsJsonLd,
  generateItemListJsonLd
} from '@/src/lib/programmatic-seo';
import { buildPageMetadata, getSiteUrl } from '@/src/lib/rank';
import { GENERAL_CATEGORIES, categoryToSlug } from '@/src/utils/helpers';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = buildPlatformHubMetadata('whatsapp');
  return buildPageMetadata({
    title: 'Active WhatsApp Groups Directory (2026) | Verified Group Invite Links',
    description: 'Join verified active WhatsApp group invite links (chat.whatsapp.com). Discover curated communities in Tech, Gaming, Education, Business, Crypto, Movies, and regional topics with live member counts.',
    pathname: '/whatsapp-groups',
    keywords: [
      'whatsapp groups',
      'whatsapp group links',
      'active whatsapp groups 2026',
      'whatsapp group invite links',
      'join whatsapp groups',
      'verified whatsapp groups',
      'whatsapp community links',
      'tech whatsapp groups',
      'study whatsapp groups',
      'crypto whatsapp groups',
      'gaming whatsapp groups',
      ...(seoConfig.keywords || [])
    ],
  });
}

export default async function WhatsAppGroupsPage() {
  const [groupsResult, stats] = await Promise.all([
    getGroups({ platform: 'whatsapp', limit: 20, pageSize: 20, cardFieldsOnly: true }),
    getNetworkStats(),
  ]);

  const siteUrl = getSiteUrl();

  const breadcrumbs = [
    { name: 'Platforms', url: '/' },
    { name: 'WhatsApp Groups', url: '/whatsapp-groups' },
  ];

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'WhatsApp Groups', url: '/whatsapp-groups' },
  ]);

  const itemListJsonLd = generateItemListJsonLd(
    'Active WhatsApp Groups Directory',
    '/whatsapp-groups',
    groupsResult.groups
  );

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Active WhatsApp Groups Directory',
    description: 'Curated list of verified active WhatsApp group links and discussion channels.',
    url: `${siteUrl}/whatsapp-groups`,
    mainEntity: itemListJsonLd,
    breadcrumb: breadcrumbsJsonLd,
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />

      {/* Crawlable Semantic SEO Category Directory Index for Search Bots */}
      <section className="sr-only" aria-label="WhatsApp Group Categories Index">
        <h2>Explore WhatsApp Groups by Category</h2>
        <ul>
          {GENERAL_CATEGORIES.map(category => (
            <li key={category}>
              <Link href={`/explore/whatsapp-${categoryToSlug(category)}`}>
                WhatsApp {category} Groups & Communities
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Loading WhatsApp Groups...</div>}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          initialPlatform="whatsapp"
          lockPlatform="whatsapp"
          pageHeading="Active WhatsApp Groups Directory"
          pageDescription="Browse verified active WhatsApp group links (chat.whatsapp.com). Select any category to explore tech, gaming, study, crypto, business, and entertainment WhatsApp chats."
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </>
  );
}
