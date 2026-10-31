import React, { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getGroups, getNetworkStats, getCachedCategoryGroups } from '@/src/lib/groups-dal';
import { MainAppView } from '@/src/components/MainAppView';
import { resolveCategoryFromSlug, TAXONOMY_CATEGORIES, getVisibleTaxonomyCategories } from '@/src/lib/taxonomy';
import { isAdultContentHidden } from '@/src/lib/content-settings';
import { 
  buildCategoryHubMetadata, 
  generateBreadcrumbsJsonLd,
  generateItemListJsonLd
} from '@/src/lib/programmatic-seo';
import { buildPageMetadata } from '@/src/lib/rank';
import { Category } from '@/src/types';
import { Layers, ArrowRight } from 'lucide-react';

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolution = resolveCategoryFromSlug(slug);

  if (!resolution) {
    return buildPageMetadata({
      title: 'Category Not Found | GroupLinks',
      description: 'The requested category does not exist in our directory.',
      pathname: `/categories/${slug}`,
      noIndex: true,
    });
  }

  const seoConfig = buildCategoryHubMetadata(resolution.category.name, resolution.category.slug);
  return buildPageMetadata({
    title: seoConfig.title,
    description: seoConfig.description,
    pathname: seoConfig.pathname,
    keywords: seoConfig.keywords,
  });
}

export default async function CategoryHubPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const resolution = resolveCategoryFromSlug(slug);

  if (!resolution) {
    notFound();
  }

  if (resolution.isSynonym || resolution.category.slug !== slug.toLowerCase().trim()) {
    permanentRedirect(`/categories/${resolution.category.slug}`);
  }

  const categoryDef = resolution.category;

  const [groupsResult, stats] = await Promise.all([
    getCachedCategoryGroups(categoryDef.name, 20),
    getNetworkStats(),
  ]);

  const breadcrumbs = [
    { name: 'Categories', url: '/categories' },
    { name: categoryDef.name, url: `/categories/${categoryDef.slug}` },
  ];

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
    { name: categoryDef.name, url: `/categories/${categoryDef.slug}` },
  ]);

  const itemListJsonLd = generateItemListJsonLd(
    `${categoryDef.name} Groups & Communities`,
    `/categories/${categoryDef.slug}`,
    groupsResult.groups
  );

  const otherCategories = getVisibleTaxonomyCategories().filter(c => c.slug !== categoryDef.slug).slice(0, 8);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Loading {categoryDef.name} Groups...</div>}>
        <MainAppView
          initialGroups={groupsResult.groups}
          initialTotalCount={groupsResult.total}
          initialStats={stats}
          initialCategory={categoryDef.name as Category}
          lockCategory={categoryDef.name as Category}
          pageHeading={`Best ${categoryDef.name} Groups`}
          pageDescription={`Discover verified ${categoryDef.name} groups across WhatsApp, Telegram, Discord, and Reddit on GroupLinks.`}
          showBreadcrumbs={true}
          breadcrumbs={breadcrumbs}
          hideAdultContent={isAdultContentHidden()}
        />
      </Suspense>

      <section className="bg-slate-950 border-t border-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Explore Other Categories</span>
            </div>
            <Link
              href="/categories"
              className="text-xs font-semibold text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View All Categories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {otherCategories.map(cat => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/50 text-slate-200 text-sm font-medium transition-all group flex items-center justify-between"
              >
                <span className="group-hover:text-emerald-400 transition-colors truncate">{cat.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
