import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getGroupBySlug, getGroupById } from '@/src/lib/groups-dal';
import { buildPageMetadata, generateGroupJsonLd, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { StandaloneJoinFlow } from '@/src/components/StandaloneJoinFlow';
import { getGroupUrlPath, getNumericGroupId } from '@/src/utils/helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RulesPageProps {
  searchParams: Promise<{ 'join-id'?: string; groupid?: string; group?: string; slug?: string; id?: string }>;
}

async function fetchGroupSafe(identifier: string): Promise<any> {
  try {
    const queryPromise = getGroupBySlug(identifier);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch {
    return null;
  }
}

export async function generateMetadata({ searchParams }: RulesPageProps): Promise<Metadata> {
  const params = await searchParams;
  const identifier = params['join-id'] || params.groupid || params.group || params.slug || params.id;
  if (!identifier) {
    return buildPageMetadata({
      title: 'Rules & Guidelines',
      description: 'Read community rules and guidelines.',
    });
  }
  const group = await fetchGroupSafe(identifier);

  if (!group) {
    return buildPageMetadata({
      title: 'Rules & Guidelines Not Found',
      description: 'The requested community guidelines could not be found.',
      noIndex: true,
    });
  }

  const numericId = getNumericGroupId(group);
  const canonicalPath = `/rules?join-id=${numericId}`;

  return buildPageMetadata({
    title: `${group.title} Rules & Guidelines — Step 1`,
    description: `Read the community rules, guidelines, and safety policies for ${group.title} before joining on ${group.platform.toUpperCase()}.`,
    imageUrl: group.imageUrl,
    pathname: canonicalPath,
  });
}

export default async function RulesPage({ searchParams }: RulesPageProps) {
  const params = await searchParams;
  const identifier = params['join-id'] || params.groupid || params.group || params.slug || params.id;
  if (!identifier) {
    redirect('/guidelines');
  }
  const group = await fetchGroupSafe(identifier);

  if (!group) {
    notFound();
  }

  const numericId = getNumericGroupId(group);

  // Guarantee canonical numeric ID routing: strictly redirect away from string identifiers like grp-lang-assamese-2
  if (params['join-id'] !== String(numericId)) {
    redirect(`/rules?join-id=${numericId}`);
  }

  const jsonLd = generateGroupJsonLd(group);
  const groupCanonical = getGroupUrlPath(group);
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: group.title, url: groupCanonical },
    { name: 'Rules & Guidelines', url: `/rules?join-id=${numericId}` },
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
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Rules...</div>}>
        <StandaloneJoinFlow group={group} initialStep={1} />
      </Suspense>
    </>
  );
}
