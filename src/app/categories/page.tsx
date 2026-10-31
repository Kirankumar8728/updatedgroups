import React from 'react';
import Link from 'next/link';
import { getVisibleTaxonomyCategories } from '@/src/lib/taxonomy';
import { getGroups } from '@/src/lib/groups-dal';
import { buildPageMetadata, generateCollectionPageJsonLd, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { ArrowRight, Layers, Users, Sparkles, Hash, Globe } from 'lucide-react';

export const metadata = buildPageMetadata({
  title: 'Explore All Community Categories | WhatsApp, Telegram & Discord Groups',
  description:
    'Browse all 25+ verified social community categories. Find top WhatsApp groups, Telegram channels, and Discord servers in Tech, Crypto, Gaming, Business, Study, and more.',
  pathname: '/categories',
  keywords: [
    'community categories',
    'WhatsApp group directory',
    'Telegram channel topics',
    'Discord server categories',
    'browse groups by topic',
  ],
});

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function CategoriesIndexPage() {
  const groupsResult = await getGroups({ limit: 1000 });
  const allGroups = groupsResult.groups;

  // Calculate group counts per category
  const categoryCounts: Record<string, number> = {};
  for (const group of allGroups) {
    const catName = group.category;
    categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
  }

  const collectionJsonLd = generateCollectionPageJsonLd(
    'Community Categories Directory',
    'Browse all verified social community categories for WhatsApp, Telegram, Discord, and Signal groups.',
    '/categories',
    allGroups.slice(0, 30)
  );

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
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
            <span className="text-slate-200 font-medium">Categories</span>
          </nav>

          {/* Header Section */}
          <header className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Taxonomy Directory</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Explore All Community Categories
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Discover verified WhatsApp groups, Telegram channels, Discord servers, and Signal groups categorized by interest, industry, and topic.
            </p>
          </header>

          {/* Categories Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Categories List">
            {getVisibleTaxonomyCategories().map((category) => {
              const count = categoryCounts[category.name] || 0;
              return (
                <Link
                  key={category.slug}
                  href={`/categories/${category.slug}`}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-900 transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-emerald-950/20"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {category.name}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                        <Users className="w-3 h-3 text-emerald-400" />
                        <span>{count} {count === 1 ? 'group' : 'groups'}</span>
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed">
                      {category.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-emerald-400 font-medium">
                    <span>Browse {category.shortTitle} communities</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </section>

          {/* Platform Discovery Quick Links */}
          <section className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-6">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-emerald-400" />
              <h3 className="text-xl font-bold text-white">Popular Platform Hubs</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { name: 'WhatsApp Groups', href: '/whatsapp-groups' },
                { name: 'Telegram Channels', href: '/telegram-channels' },
                { name: 'Discord Servers', href: '/discord-servers' },
                { name: 'Reddit Communities', href: '/reddit-communities' },
                { name: 'Signal Groups', href: '/signal-groups' },
                { name: 'Facebook Groups', href: '/facebook-groups' },
              ].map((hub) => (
                <Link
                  key={hub.href}
                  href={hub.href}
                  className="p-3 text-center rounded-xl bg-slate-800/60 hover:bg-emerald-600 hover:text-white border border-slate-700/50 text-slate-200 text-sm font-medium transition-all"
                >
                  {hub.name}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
