import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getGroupBySlug, getGroupById, logGroupAction } from '@/src/lib/groups-dal';
import { buildPageMetadata, generateGroupJsonLd, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { StandaloneJoinFlow } from '@/src/components/StandaloneJoinFlow';
import { getGroupUrlPath, categoryToSlug, getNumericGroupId } from '@/src/utils/helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface JoinPageProps {
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

export async function generateMetadata({ searchParams }: JoinPageProps): Promise<Metadata> {
  const params = await searchParams;
  const identifier = params['join-id'] || params.groupid || params.group || params.slug || params.id;
  if (!identifier) {
    return buildPageMetadata({
      title: 'Join Community',
      description: 'Access verified community join links.',
    });
  }
  const group = await fetchGroupSafe(identifier);

  if (!group) {
    return buildPageMetadata({
      title: 'Join Link Not Found',
      description: 'The requested community join link could not be found.',
      noIndex: true,
    });
  }

  const numericId = getNumericGroupId(group);
  const canonicalPath = `/join?join-id=${numericId}`;

  return buildPageMetadata({
    title: `Join ${group.title} — Verified ${group.platform.toUpperCase()} Access`,
    description: `Access verified invite link and direct connection gateway for ${group.title} on ${group.platform.toUpperCase()}.`,
    imageUrl: group.imageUrl,
    pathname: canonicalPath,
  });
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  const identifier = params['join-id'] || params.groupid || params.group || params.slug || params.id;
  if (!identifier) {
    redirect('/');
  }
  const group = await fetchGroupSafe(String(identifier));

  if (!group) {
    notFound();
  }

  const numericId = getNumericGroupId(group);

  // Guarantee canonical numeric ID routing: strictly redirect away from string identifiers like grp-lang-assamese-2
  if (params['join-id'] !== String(numericId)) {
    redirect(`/join?join-id=${numericId}`);
  }

  if (group.isExpired || group.isActive === false) {
    const categorySlug = categoryToSlug(group.category || 'Tech & Programming');
    redirect(`/category/${categorySlug}`);
  }

  // Log join action into MySQL group_actions table
  try {
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : (headersList.get('x-real-ip') || '127.0.0.1');
    const userAgent = headersList.get('user-agent') || '';
    logGroupAction({
      groupId: group.id,
      actionType: 'join',
      ipAddress: ip,
      userAgent,
    }).catch(() => {});
  } catch {}

  const jsonLd = generateGroupJsonLd(group);
  const groupCanonical = getGroupUrlPath(group);
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: group.title, url: groupCanonical },
    { name: 'Join Community', url: `/join?join-id=${numericId}` },
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
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Join Portal...</div>}>
        <StandaloneJoinFlow group={group} initialStep={2} />
      </Suspense>
    </>
  );
}
