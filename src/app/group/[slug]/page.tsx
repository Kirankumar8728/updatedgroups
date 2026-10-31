import React, { Suspense, cache } from 'react';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getGroupBySlug, getRelatedGroups } from '@/src/lib/groups-dal';
import { buildPageMetadata, generateGroupJsonLd, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { GroupDetailPage } from '@/src/components/GroupDetailPage';
import { getGroupUrlPath, categoryToSlug, isAdultGroup } from '@/src/utils/helpers';

// Enable Incremental Static Regeneration (ISR) so Hostinger / LiteSpeed serve pages in <30ms from cache
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Request-scoped memoization: Prevents generateMetadata and GroupPage from executing redundant DB queries
const getCachedGroup = cache(async (slug: string) => {
  return await getGroupBySlug(slug);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const group = await getCachedGroup(slug);

  if (!group) {
    return buildPageMetadata({
      title: 'Group Not Found',
      description: 'The requested social community could not be found on Group Links.',
      noIndex: true,
    });
  }

  const canonicalPath = getGroupUrlPath(group);

  return buildPageMetadata({
    title: `${group.title} — Join ${group.platform.toUpperCase()} Group`,
    description:
      (group.description && group.description.trim())
        ? (group.description.length > 160 ? group.description.slice(0, 157) + '...' : group.description)
        : group.metaDescription ||
          `Join ${group.title} on ${group.platform}. Discover active members, verified links, and rules.`,
    imageUrl: group.imageUrl,
    pathname: canonicalPath,
    keywords: group.rankKeywords || [group.title, `${group.platform} group`, group.category],
  });
}

export default async function GroupPage({ params }: PageProps) {
  const { slug } = await params;
  const group = await getCachedGroup(slug);
  const isAdultSub = await (await import('@/src/lib/subdomain')).isAdultSubdomainRequest();
  const groupIsAdult = group ? isAdultGroup(group) : false;

  if (!group || group.isExpired || group.isActive === false || (groupIsAdult && !isAdultSub) || (!groupIsAdult && isAdultSub)) {
    const categorySlug = group ? categoryToSlug(group.category || 'Tech & Programming') : 'all';
    redirect(`/category/${categorySlug}?notice=expired`);
  }

  const relatedGroups = await getRelatedGroups(group, 6);
  const jsonLd = generateGroupJsonLd(group);
  const canonicalPath = getGroupUrlPath(group);
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: `${group.platform.toUpperCase()} Groups`, url: `/${group.platform}-groups` },
    { name: group.title, url: canonicalPath },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Community...</div>}>
        <GroupDetailPage group={group} relatedGroups={relatedGroups} />
      </Suspense>
    </>
  );
}
