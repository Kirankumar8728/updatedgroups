import React from 'react';
import Link from 'next/link';
import { getGroups } from '@/src/lib/groups-dal';
import { buildPageMetadata, generateCollectionPageJsonLd, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { tagToSlug } from '@/src/utils/helpers';
import { isAdultContentHidden, isAdultKeywordOrTag } from '@/src/lib/content-settings';
import { Tag, Hash, TrendingUp, Layers, Globe, ArrowRight } from 'lucide-react';

export const metadata = buildPageMetadata({
  title: 'Explore All Community Tags & Topics | WhatsApp, Telegram & Discord Groups',
  description:
    'Browse all popular community tags and topic hashtags. Discover verified WhatsApp groups, Telegram channels, and Discord servers by specific niche interests.',
  pathname: '/tags',
  keywords: [
    'community tags',
    'group topics',
    'WhatsApp hashtags',
    'Telegram channel tags',
    'Discord server tags',
    'niche group finder',
  ],
});

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function TagsIndexPage() {
  const groupsResult = await getGroups({ limit: 1000 });
  const allGroups = groupsResult.groups;

  const isHidden = isAdultContentHidden();

  // Aggregate tags and count frequencies
  const tagCounts: Record<string, number> = {};
  for (const group of allGroups) {
    if (group.customTags && Array.isArray(group.customTags)) {
      for (const t of group.customTags) {
        if (isHidden && isAdultKeywordOrTag(t)) continue;
        const clean = t.startsWith('#') ? t : `#${t}`;
        tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      }
    }
  }

  // Sort by count descending
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  const collectionJsonLd = generateCollectionPageJsonLd(
    'Community Tags & Topics Directory',
    'Browse all verified social group tags and niche topics for WhatsApp, Telegram, and Discord.',
    '/tags',
    allGroups.slice(0, 30)
  );

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Tags', url: '/tags' },
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
      <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Tags</span>
          </nav>

          {/* Header Section */}
          <header className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5" />
              <span>Topic Tag Directory</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Explore All Community Tags & Topics
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Find communities tailored to your exact passions, hobbies, and subcultures across WhatsApp, Telegram, Discord, and Signal.
            </p>
          </header>

          {/* Tags Grid */}
          <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-lg font-bold text-white">
                <Hash className="w-5 h-5 text-indigo-400" />
                <span>All Active Community Tags ({sortedTags.length})</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {sortedTags.map(([tag, count]) => {
                const cleanSlug = tagToSlug(tag) || tag.replace(/^#+/, '').toLowerCase();
                return (
                  <Link
                    key={tag}
                    href={`/tag/${cleanSlug}`}
                    className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-800/80 text-slate-200 border border-slate-700/60 hover:border-indigo-500 hover:bg-slate-800 hover:text-white transition-all shadow-xs"
                  >
                    <span className="group-hover:text-indigo-400 transition-colors">{tag}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-400 font-semibold group-hover:bg-indigo-950 group-hover:text-indigo-300">
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Quick Categories Navigation */}
          <section className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">Browse By Category Instead</h2>
              </div>
              <Link
                href="/categories"
                className="text-sm font-semibold text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <span>View All Categories</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-slate-400 text-sm">
              Prefer broad category listings? Check out Tech, Crypto, Gaming, Business, Study, and 20+ other structured community categories.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
