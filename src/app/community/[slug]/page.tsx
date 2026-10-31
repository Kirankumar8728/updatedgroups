import React, { Suspense, cache } from 'react';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getGroupBySlug, getRelatedGroups } from '@/src/lib/groups-dal';
import { buildPageMetadata, generateGroupJsonLd, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { GroupDetailPage } from '@/src/components/GroupDetailPage';
import { getGroupUrlPath, categoryToSlug, getRedditDisplayTitle, getRedditCommunitySubtitle } from '@/src/utils/helpers';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const getCachedGroup = cache(async (slug: string) => {
  return await getGroupBySlug(slug);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const group = await getCachedGroup(slug);

  if (!group) {
    return buildPageMetadata({
      title: 'Community Not Found',
      description: 'The requested Reddit community could not be found on Group Links.',
      noIndex: true,
    });
  }

  const canonicalPath = getGroupUrlPath(group);
  const displayTitle = getRedditDisplayTitle(group);
  const subtitle = getRedditCommunitySubtitle(group);

  return buildPageMetadata({
    title: `${displayTitle} — Reddit Community (${group.category})`,
    description:
      group.metaDescription ||
      `${subtitle}. Join active discussions, top posts, and community guidelines on Reddit.`,
    imageUrl: group.imageUrl,
    pathname: canonicalPath,
    keywords: group.rankKeywords || [displayTitle, subtitle, 'reddit community', 'subreddit', group.category],
  });
}

export default async function CommunityPage({ params }: PageProps) {
  const { slug } = await params;
  const group = await getCachedGroup(slug);

  if (!group) {
    notFound();
  }

  if (group.isExpired || group.isActive === false) {
    const categorySlug = categoryToSlug(group.category || 'Tech & Programming');
    redirect(`/category/${categorySlug}`);
  }

  const relatedGroups = await getRelatedGroups(group, 6);
  const jsonLd = generateGroupJsonLd(group);
  const canonicalPath = getGroupUrlPath(group);
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Reddit Communities', url: '/reddit-communities' },
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
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Reddit Community...</div>}>
        <GroupDetailPage group={group} relatedGroups={relatedGroups} />
      </Suspense>
    </>
  );
}
