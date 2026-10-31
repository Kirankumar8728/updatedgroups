import React, { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getGroups, getNetworkStats } from '@/src/lib/groups-dal';
import { 
  buildPageMetadata, 
  generateCollectionPageJsonLd, 
  generateBreadcrumbsJsonLd 
} from '@/src/lib/rank';
import { MainAppView } from '@/src/components/MainAppView';
import { resolveTagFromSlug, tagToSlug } from '@/src/utils/helpers';
import { isAdultContentHidden, isAdultKeywordOrTag } from '@/src/lib/content-settings';
import { Layers, ArrowRight } from 'lucide-react';

export const revalidate = 60;

interface TagPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tagName = resolveTagFromSlug(slug);

  if (!tagName) {
    return buildPageMetadata({
      title: 'Tag Not Found',
      description: 'The requested topic tag could not be found.',
      noIndex: true,
    });
  }

  const displayTag = tagName.startsWith('#') ? tagName : `#${tagName}`;
  const canonicalSlug = tagToSlug(tagName);

  return buildPageMetadata({
    title: `${displayTag} Groups & Communities | Topic Links`,
    description: `Discover and join active groups and communities tagged with ${displayTag} across WhatsApp, Telegram, Discord, Signal, Facebook, and Reddit.`,
    pathname: `/tag/${canonicalSlug}`,
    keywords: [
      `${displayTag} groups`,
      `${tagName} communities`,
      `${tagName} WhatsApp groups`,
      `${tagName} Telegram channels`,
      `${tagName} Discord servers`,
    ],
  });
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  const tagName = resolveTagFromSlug(slug);

  if (!tagName) {
    notFound();
  }

  // If adult content is hidden and tag is adult-related, seamlessly redirect to Technology & Programming
  if (isAdultContentHidden() && isAdultKeywordOrTag(tagName)) {
    permanentRedirect('/categories/tech-programming');
  }

  const displayTag = tagName.startsWith('#') ? tagName : `#${tagName}`;
  const canonicalSlug = tagToSlug(tagName);

  const [groupsResult, stats] = await Promise.all([
    getGroups({ tag: tagName, limit: 60 }),
    getNetworkStats(),
  ]);

  const breadcrumbs = [
    { name: 'Tags', url: '/tags' },
    { name: `${displayTag} Groups`, url: `/tag/${canonicalSlug}` }
  ];

  const collectionJsonLd = generateCollectionPageJsonLd(
    `${displayTag} Groups & Communities | Topic Links`,
    `Discover and join active groups tagged with ${displayTag} across WhatsApp, Telegram, Discord, Signal, Facebook, and Reddit.`,
    `/tag/${canonicalSlug}`,
    groupsResult.groups
  );

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Tags', url: '/tags' },
    { name: `${displayTag} Topics`, url: `/tag/${canonicalSlug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading {displayTag} groups...</div>}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          initialTag={displayTag}
          lockTag={displayTag}
          pageHeading={`${displayTag} Community Hub`}
          pageDescription={`Explore all public groups, bots, and servers tagged with ${displayTag}. Verified member links and instant join portals.`}
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </>
  );
}
