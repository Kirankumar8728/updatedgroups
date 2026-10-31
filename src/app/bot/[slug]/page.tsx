import React, { Suspense, cache } from 'react';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getGroupBySlug, getRelatedGroups } from '@/src/lib/groups-dal';
import { buildPageMetadata, generateGroupJsonLd, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { GroupDetailPage } from '@/src/components/GroupDetailPage';
import { getGroupUrlPath, categoryToSlug } from '@/src/utils/helpers';

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
      title: 'Bot Not Found',
      description: 'The requested Telegram bot or automation community could not be found on Group Links.',
      noIndex: true,
    });
  }

  const canonicalPath = getGroupUrlPath(group);

  return buildPageMetadata({
    title: `${group.title} — Telegram Bot & Community`,
    description:
      group.metaDescription ||
      `Start and interact with ${group.title} on Telegram. Verified link, command guides, and features.`,
    imageUrl: group.imageUrl,
    pathname: canonicalPath,
    keywords: group.rankKeywords || [group.title, 'telegram bot', 'telegram bot link', group.category],
  });
}

export default async function BotPage({ params }: PageProps) {
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
    { name: 'Telegram Groups', url: '/telegram-groups' },
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
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Telegram Bot...</div>}>
        <GroupDetailPage group={group} relatedGroups={relatedGroups} />
      </Suspense>
    </>
  );
}
