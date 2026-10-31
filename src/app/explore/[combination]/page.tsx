import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getGroups, getNetworkStats } from '@/src/lib/groups-dal';
import { MainAppView } from '@/src/components/MainAppView';
import { parseExploreSlug, PLATFORM_DISPLAY_NAMES } from '@/src/lib/taxonomy';
import { 
  buildExploreHubMetadata, 
  generateBreadcrumbsJsonLd,
  generateItemListJsonLd
} from '@/src/lib/programmatic-seo';
import { buildPageMetadata } from '@/src/lib/rank';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ExplorePageProps {
  params: Promise<{ combination: string }>;
}

export async function generateMetadata({ params }: ExplorePageProps): Promise<Metadata> {
  const { combination } = await params;
  const parsed = parseExploreSlug(combination);

  if (!parsed || !parsed.isValid || !parsed.platform || !parsed.categoryDef) {
    return buildPageMetadata({
      title: 'Explore Community Hub | GroupLinks',
      description: 'Explore verified community group links.',
      pathname: `/explore/${combination}`,
      noIndex: true,
    });
  }

  const groupsResult = await getGroups({
    platform: parsed.platform,
    category: parsed.categoryDef.name,
    limit: 50,
  });

  const activeCount = groupsResult.groups.length;
  const seoConfig = buildExploreHubMetadata(parsed.platform, parsed.categoryDef, activeCount);

  return buildPageMetadata({
    title: seoConfig.title,
    description: seoConfig.description,
    pathname: seoConfig.pathname,
    noIndex: seoConfig.noIndex,
    canonicalUrl: seoConfig.canonicalUrl,
    keywords: seoConfig.keywords,
  });
}

export default async function ExploreCombinationHubPage({ params }: ExplorePageProps) {
  const { combination } = await params;
  const parsed = parseExploreSlug(combination);

  if (!parsed || !parsed.isValid || !parsed.platform || !parsed.categoryDef) {
    notFound();
  }

  if (parsed.isSynonymRedirect || parsed.canonicalExploreSlug !== combination.toLowerCase().trim()) {
    permanentRedirect(`/explore/${parsed.canonicalExploreSlug}`);
  }

  const { platform, categoryDef } = parsed;
  const platformDisplayName = PLATFORM_DISPLAY_NAMES[platform] || platform;

  const [groupsResult, stats] = await Promise.all([
    getGroups({
      platform,
      category: categoryDef.name,
      limit: 50,
    }),
    getNetworkStats(),
  ]);

  const groups = groupsResult.groups;
  const activeCount = groups.length;
  const isIndexed = activeCount >= 5;

  const breadcrumbs = [
    { name: 'Categories', url: '/' },
    { name: categoryDef.name, url: `/categories/${categoryDef.slug}` },
    { name: `${platformDisplayName}`, url: `/explore/${parsed.canonicalExploreSlug}` },
  ];

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/' },
    { name: categoryDef.name, url: `/categories/${categoryDef.slug}` },
    { name: `${categoryDef.name} ${platformDisplayName}`, url: `/explore/${parsed.canonicalExploreSlug}` },
  ]);

  const itemListJsonLd = generateItemListJsonLd(
    `Active ${categoryDef.name} ${platformDisplayName} Links`,
    `/explore/${parsed.canonicalExploreSlug}`,
    groups
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      {isIndexed && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Loading {categoryDef.name} on {platformDisplayName}...</div>}>
        <MainAppView
          initialGroups={groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          initialPlatform={platform}
          initialCategory={categoryDef.name}
          pageHeading={`Active ${categoryDef.name} ${platformDisplayName} Links`}
          pageDescription={
            isIndexed
              ? `Join ${activeCount}+ verified ${categoryDef.name} ${platformDisplayName} links. Updated daily with real-time member counts on GroupLinks.`
              : `Browse ${categoryDef.name} communities on ${platformDisplayName}. Showing real-time verified links.`
          }
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </>
  );
}
