import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGroups, getNetworkStats } from '@/src/lib/groups-dal';
import { 
  buildPageMetadata, 
  generateCollectionPageJsonLd, 
  generateBreadcrumbsJsonLd 
} from '@/src/lib/rank';
import { MainAppView } from '@/src/components/MainAppView';
import { REGIONS, resolveCountryFromSlug, countryToSlug } from '@/src/utils/helpers';
import { Region } from '@/src/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CountryPageProps {
  params: Promise<{ slug: string }>;
}



export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const country = resolveCountryFromSlug(slug);

  if (!country) {
    return buildPageMetadata({
      title: 'Country Not Found',
      description: 'The requested country or region collection could not be found.',
      noIndex: true,
    });
  }

  const canonicalSlug = countryToSlug(country);

  return buildPageMetadata({
    title: `${country} Groups & Communities | Active Local Links`,
    description: `Discover and join active ${country} groups and local communities across WhatsApp, Telegram, Discord, Signal, Facebook, and Reddit.`,
    pathname: `/country/${canonicalSlug}`,
    keywords: [
      `${country} groups`,
      `${country} communities`,
      `${country} WhatsApp group links`,
      `${country} Telegram channels`,
      `${country} Discord servers`,
      `${country} local chats`,
    ],
  });
}

export default async function CountryPage({ params }: CountryPageProps) {
  const { slug } = await params;
  const country = resolveCountryFromSlug(slug);

  if (!country) {
    notFound();
  }

  const canonicalSlug = countryToSlug(country);

  const [groupsResult, stats] = await Promise.all([
    getGroups({ region: country as Region, limit: 20, pageSize: 20, cardFieldsOnly: true }),
    getNetworkStats(),
  ]);

  const breadcrumbs = [
    { name: 'Countries & Regions', url: '/' },
    { name: `${country} Groups`, url: `/country/${canonicalSlug}` }
  ];

  const collectionJsonLd = generateCollectionPageJsonLd(
    `${country} Groups & Communities | Active Local Links`,
    `Discover and join active ${country} groups and local communities across WhatsApp, Telegram, Discord, Signal, Facebook, and Reddit.`,
    `/country/${canonicalSlug}`,
    groupsResult.groups
  );

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: `${country} Communities`, url: `/country/${canonicalSlug}` },
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
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading {country} groups...</div>}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          initialRegion={country as Region}
          pageHeading={`${country} Groups & Communities`}
          pageDescription={`Browse verified ${country} invite links, discover active local chat channels, and connect with people in ${country}.`}
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </>
  );
}
