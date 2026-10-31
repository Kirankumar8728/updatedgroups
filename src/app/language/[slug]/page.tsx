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
import { LANGUAGES, resolveLanguageFromSlug, languageToSlug } from '@/src/utils/helpers';
import { Language } from '@/src/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface LanguagePageProps {
  params: Promise<{ slug: string }>;
}



export async function generateMetadata({ params }: LanguagePageProps): Promise<Metadata> {
  const { slug } = await params;
  const language = resolveLanguageFromSlug(slug);

  if (!language) {
    return buildPageMetadata({
      title: 'Language Not Found',
      description: 'The requested language collection could not be found.',
      noIndex: true,
    });
  }

  const canonicalSlug = languageToSlug(language);

  return buildPageMetadata({
    title: `${language} Groups & Communities | Active Chat Links`,
    description: `Discover and join active ${language} speaking groups across WhatsApp, Telegram, Discord, Signal, Facebook, and Reddit.`,
    pathname: `/language/${canonicalSlug}`,
    keywords: [
      `${language} groups`,
      `${language} communities`,
      `${language} WhatsApp group links`,
      `${language} Telegram channels`,
      `${language} Discord servers`,
      `${language} chat groups`,
    ],
  });
}

export default async function LanguagePage({ params }: LanguagePageProps) {
  const { slug } = await params;
  const language = resolveLanguageFromSlug(slug);

  if (!language) {
    notFound();
  }

  const canonicalSlug = languageToSlug(language);

  const [groupsResult, stats] = await Promise.all([
    getGroups({ language: language as Language, limit: 20, pageSize: 20, cardFieldsOnly: true }),
    getNetworkStats(),
  ]);

  const breadcrumbs = [
    { name: 'Languages', url: '/' },
    { name: `${language} Groups`, url: `/language/${canonicalSlug}` }
  ];

  const collectionJsonLd = generateCollectionPageJsonLd(
    `${language} Groups & Communities | Active Chat Links`,
    `Discover and join active ${language} speaking groups across WhatsApp, Telegram, Discord, Signal, Facebook, and Reddit.`,
    `/language/${canonicalSlug}`,
    groupsResult.groups
  );

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: `${language} Groups`, url: `/language/${canonicalSlug}` },
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
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading {language} groups...</div>}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          initialLanguage={language as Language}
          pageHeading={`${language} Language Groups & Communities`}
          pageDescription={`Browse verified ${language} chat groups, discover active channels in ${language}, and converse with native speakers worldwide.`}
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
        />
      </Suspense>
    </>
  );
}
