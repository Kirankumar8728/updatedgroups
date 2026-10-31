'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  SlidersHorizontal, 
  Globe, 
  Languages, 
  Tag, 
  ArrowUpDown, 
  CheckCircle2, 
  LayoutGrid, 
  List, 
  X,
  Sparkles,
  Users,
  Award,
  AlertTriangle,
  Flame,
  Search,
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Category, FilterState, Platform, SortOption } from '../types';
import { CATEGORIES, GENERAL_CATEGORIES, LANGUAGES, REGIONS, categoryToSlug, getPlatformListingUrl } from '../utils/helpers';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  totalFiltered: number;
  onOpenKeywordFilter?: () => void;
  lockedPlatform?: Platform;
  lockedCategory?: Category;
  lockedTag?: string;
  hideAdultContent?: boolean;
}

const FilterBarComponent: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  viewMode,
  setViewMode,
  totalFiltered,
  onOpenKeywordFilter,
  lockedPlatform,
  lockedCategory,
  lockedTag,
  hideAdultContent = true,
}) => {
  const router = useRouter();
  const isAdultActive = filters.category === 'Adult / 18+' || filters.showAdultOnly;

  const hasActiveFilters = 
    (lockedPlatform ? false : filters.platform !== 'all') ||
    (lockedCategory ? false : filters.category !== 'all') ||
    filters.language !== 'all' ||
    filters.region !== 'all' ||
    (lockedTag ? false : filters.selectedTag !== null) ||
    filters.verifiedOnly ||
    filters.rankOptimizedOnly ||
    filters.showAdultOnly ||
    filters.memberRange !== 'all' ||
    filters.searchQuery !== '';

  const handleResetFilters = () => {
    setFilters(prev => ({
      ...prev,
      platform: lockedPlatform || 'all',
      category: lockedCategory || 'all',
      language: 'all',
      region: 'all',
      selectedTag: lockedTag || null,
      tag: lockedTag || '',
      verifiedOnly: false,
      rankOptimizedOnly: false,
      showAdultOnly: lockedCategory === 'Adult / 18+',
      memberRange: 'all',
      searchQuery: '',
      search: '',
    }));
  };

  const handleCategorySelect = (cat: string) => {
    if (cat === 'all') {
      router.push(lockedPlatform ? getPlatformListingUrl(lockedPlatform) : '/');
    } else if (cat === 'Adult / 18+') {
      router.push('/adult-groups');
    } else {
      router.push(`/categories/${categoryToSlug(cat)}`);
    }
  };

  return (
    <div className="space-y-3 mb-6">
      
      {/* Category Pills (Quick Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <Link
          href={lockedPlatform ? getPlatformListingUrl(lockedPlatform) : '/'}
          prefetch={false}
          onClick={() => {
            if (!lockedCategory) {
              setFilters(prev => ({
                ...prev,
                category: 'all',
                showAdultOnly: false
              }));
            }
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            (lockedCategory ? false : filters.category === 'all') && !filters.showAdultOnly
              ? 'bg-indigo-600 text-white shadow-sm scale-105'
              : 'bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          ✨ All General
        </Link>
        {GENERAL_CATEGORIES.map(cat => {
          const isSelected = (lockedCategory || filters.category) === cat;
          return (
            <Link
              key={cat}
              href={`/categories/${categoryToSlug(cat)}`}
              prefetch={false}
              onClick={() => {
                if (!lockedCategory) {
                  setFilters(prev => ({
                    ...prev,
                    category: cat,
                    showAdultOnly: false
                  }));
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm scale-105'
                  : 'bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {cat}
            </Link>
          );
        })}

        {/* Dedicated Adult / 18+ Category Button with distinct styling */}
        {!hideAdultContent && (
          <a
            href="https://adult.grouplinks.app/adult-groups"
            title="Open 18+ Adult Group Directory on adult.grouplinks.app"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
              isAdultActive
                ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20 scale-105'
                : 'bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40'
            }`}
          >
            <span>🔞 Adult (18+)</span>
          </a>
        )}

        {/* Link to Full Categories Directory */}
        <Link
          href="/categories"
          prefetch={false}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors inline-flex items-center gap-1"
        >
          <span>All Categories</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Adult Zone Warning Banner if in Adult Category */}
      {isAdultActive && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              <strong>Adult 18+ Isolation Active:</strong> Adult groups are strictly confined to this category and never displayed on the homepage or general feeds.
            </span>
          </div>
          <button
            onClick={() => handleCategorySelect('all')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-700 hover:bg-rose-100 shrink-0"
          >
            Exit Adult Mode
          </button>
        </div>
      )}

      {/* Main Multi-Filter & Controls Bar */}
      <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Group Platform Filter */}
          <div className="relative">
            <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/60 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-200">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <select
                value={lockedPlatform || filters.platform || 'all'}
                disabled={Boolean(lockedPlatform)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!lockedPlatform) {
                    if (val === 'all') {
                      router.push('/');
                    } else {
                      router.push(getPlatformListingUrl(val));
                    }
                  }
                }}
                className={`bg-transparent text-xs font-semibold focus:outline-none pr-1 text-neutral-900 dark:text-white ${lockedPlatform ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {lockedPlatform ? (
                  <option value={lockedPlatform} className="dark:bg-neutral-800">
                    {lockedPlatform === 'whatsapp' ? 'WhatsApp Groups (Only)' : `${lockedPlatform.toUpperCase()} Groups (Only)`}
                  </option>
                ) : (
                  <>
                    <option value="all" className="dark:bg-neutral-800">All Group Types</option>
                    <option value="whatsapp" className="dark:bg-neutral-800">WhatsApp Groups</option>
                    <option value="telegram" className="dark:bg-neutral-800">Telegram Channels</option>
                    <option value="discord" className="dark:bg-neutral-800">Discord Servers & Groups</option>
                    <option value="facebook" className="dark:bg-neutral-800">Facebook Groups</option>
                    <option value="signal" className="dark:bg-neutral-800">Signal Groups</option>
                    <option value="instagram" className="dark:bg-neutral-800">Instagram Groups</option>
                    <option value="snapchat" className="dark:bg-neutral-800">Snapchat Groups</option>
                    <option value="reddit" className="dark:bg-neutral-800">Reddit Communities</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Language Selector */}
          <div className="relative">
            <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/60 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-200">
              <Languages className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={filters.language || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="dark:bg-neutral-800">All Languages</option>
                {LANGUAGES.filter(l => l !== 'All / Multilingual').map(lang => (
                  <option key={lang} value={lang} className="dark:bg-neutral-800">{lang}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Region Selector */}
          <div className="relative">
            <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/60 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-200">
              <Globe className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={filters.region || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="dark:bg-neutral-800">All Regions</option>
                {REGIONS.map(reg => (
                  <option key={reg} value={reg} className="dark:bg-neutral-800">{reg}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Member Size Selector */}
          <div className="relative">
            <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/60 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-200">
              <Users className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={filters.memberRange || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, memberRange: e.target.value as any }))}
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="dark:bg-neutral-800">Any Size</option>
                <option value="small" className="dark:bg-neutral-800">&lt; 500 members</option>
                <option value="medium" className="dark:bg-neutral-800">500 – 5k members</option>
                <option value="large" className="dark:bg-neutral-800">5k – 50k members</option>
                <option value="mega" className="dark:bg-neutral-800">&gt; 50k members</option>
              </select>
            </div>
          </div>

          {/* Verified Toggle */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              filters.verifiedOnly
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-sm'
                : 'bg-neutral-50 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700/60 hover:bg-neutral-100'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${filters.verifiedOnly ? 'text-emerald-500' : 'text-neutral-400'}`} />
            <span>Verified</span>
          </button>

          {/* Keyword Auto-Filter Rules button */}
          {onOpenKeywordFilter && (
            <button
              onClick={onOpenKeywordFilter}
              title="Configure & test customized keyword auto-filtering rules"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border bg-neutral-50 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Keyword Auto-Filter</span>
            </button>
          )}


        </div>

        {/* Sort and View Mode */}
        <div className="flex items-center gap-2.5 ml-auto">
          
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/60 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[11px] text-neutral-400 hidden sm:inline">Sort:</span>
            <select
              value={filters.sort || filters.sortBy || 'newest'}
              onChange={(e) => {
                const val = e.target.value as SortOption;
                setFilters(prev => ({ ...prev, sort: val, sortBy: val }));
              }}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1 text-neutral-900 dark:text-white"
            >
              <option value="newest" className="dark:bg-neutral-800">✨ Newly Added</option>
              <option value="trending" className="dark:bg-neutral-800">🔥 Trending</option>
              <option value="popularity" className="dark:bg-neutral-800">👑 Most Popular</option>
              <option value="growth" className="dark:bg-neutral-800">🚀 Fast Growing</option>
              <option value="members" className="dark:bg-neutral-800">👥 Member Count</option>
              <option value="upvotes" className="dark:bg-neutral-800">⭐ Top Upvoted</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Tags Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Showing <strong className="text-neutral-900 dark:text-white">{totalFiltered}</strong> communities:
          </span>

          {filters.platform !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs">
              Group Type: {filters.platform.toUpperCase()}
              <button onClick={() => setFilters(prev => ({ ...prev, platform: 'all' }))} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.category !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Category: {filters.category}
              <button onClick={() => setFilters(prev => ({ ...prev, category: 'all', showAdultOnly: false }))} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.language !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              Lang: {filters.language}
              <button onClick={() => setFilters(prev => ({ ...prev, language: 'all' }))} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.region !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Region: {filters.region}
              <button onClick={() => setFilters(prev => ({ ...prev, region: 'all' }))} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.selectedTag && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Tag: {filters.selectedTag}
              <button onClick={() => setFilters(prev => ({ ...prev, selectedTag: null }))} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.verifiedOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Verified Only
              <button onClick={() => setFilters(prev => ({ ...prev, verifiedOnly: false }))} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium ml-1"
          >
            Reset all
          </button>
        </div>
      )}
    </div>
  );
};

export const FilterBar = React.memo(FilterBarComponent);

