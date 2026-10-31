'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Group, 
  Platform, 
  Category, 
  Language, 
  Region, 
  FilterState, 
  SortOption,
  NetworkStats 
} from '@/src/types';
import { Header } from './Header';
import { PlatformFilter } from './PlatformFilter';
import { FilterBar } from './FilterBar';
import { GroupCard } from './GroupCard';
import { StatsBanner } from './StatsBanner';
import { CustomTagCloud } from './CustomTagCloud';
import { AdDisplay } from './AdDisplay';
import { Footer } from './Footer';
import { Breadcrumbs } from './Breadcrumbs';
import { isGroupCurrentlySticky, sortGroupsWithSticky, getGroupUrlPath, tagToSlug, getPlatformListingUrl, getUpvotedGroupIds, toggleUserUpvoteGroup } from '@/src/utils/helpers';
import { checkAdminSession, clearAdminSession } from '@/src/utils/adminAuth';
import { UserProfile } from '@/src/types/user';
import { fetchCurrentSession, logoutUser } from '@/src/utils/userAuth';
import { useAuth } from './AuthProvider';

import dynamic from 'next/dynamic';

const GroupListView = dynamic(() => import('./GroupListView').then(m => m.GroupListView));
const LeaderboardView = dynamic(() => import('./LeaderboardView').then(m => m.LeaderboardView));
const BookmarksDrawer = dynamic(() => import('./BookmarksDrawer').then(m => m.BookmarksDrawer));
const AdminLoginModal = dynamic(() => import('./AdminLoginModal').then(m => m.AdminLoginModal));
const AdminDashboardModal = dynamic(() => import('./AdminDashboardModal').then(m => m.AdminDashboardModal));
const BoostPaymentModal = dynamic(() => import('./BoostPaymentModal').then(m => m.BoostPaymentModal));
const KeywordFilterSettingsModal = dynamic(() => import('./KeywordFilterSettingsModal').then(m => m.KeywordFilterSettingsModal));
const MassDeleteConfirmationModal = dynamic(() => import('./MassDeleteConfirmationModal').then(m => m.MassDeleteConfirmationModal));
const UserDashboardView = dynamic(() => import('./UserDashboardView').then(m => m.UserDashboardView));
const ClaimCommunityModal = dynamic(() => import('./ClaimCommunityModal').then(m => m.ClaimCommunityModal));
const PromoteWithCreditsModal = dynamic(() => import('./PromoteWithCreditsModal').then(m => m.PromoteWithCreditsModal));
const SubmitPromotionProofModal = dynamic(() => import('./SubmitPromotionProofModal').then(m => m.SubmitPromotionProofModal));
const AuthModal = dynamic(() => import('./AuthModal').then(m => m.AuthModal));
const AdultConsentModal = dynamic(() => import('./AdultConsentModal').then(m => m.AdultConsentModal));
import { 
  Layers, 
  Trophy, 
  PlusCircle, 
  Flame, 
  Sparkles, 
  Filter, 
  AlertCircle, 
  TrendingUp, 
  Search, 
  ExternalLink, 
  ShieldCheck, 
  ShieldAlert,
  Zap, 
  Tag,
  HelpCircle,
  BookOpen,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  Trash2,
  CheckSquare,
  Square,
  Check,
  X
} from 'lucide-react';

interface MainAppViewProps {
  initialGroups?: Group[];
  initialTotalCount?: number;
  initialStats?: NetworkStats;
  initialTab?: 'explore' | 'leaderboard';
  initialPlatform?: Platform | 'all';
  initialCategory?: Category | 'all';
  initialLanguage?: Language | 'all';
  initialRegion?: Region | 'all';
  initialTag?: string;
  initialSearch?: string;
  pageHeading?: string;
  pageDescription?: string;
  showBreadcrumbs?: boolean;
  breadcrumbs?: { name: string; url: string }[];
  autoOpenAdmin?: boolean;
  autoOpenDashboard?: boolean;
  hideAds?: boolean;
  isDirectPromotedPage?: boolean;
  lockPlatform?: Platform;
  lockCategory?: Category;
  lockTag?: string;
  hideAdultContent?: boolean;
}

export function MainAppView({
  initialGroups = [],
  initialTotalCount,
  initialStats,
  initialTab = 'explore',
  initialPlatform = 'all',
  initialCategory = 'all',
  initialLanguage = 'all',
  initialRegion = 'all',
  initialTag = '',
  initialSearch = '',
  pageHeading,
  pageDescription,
  showBreadcrumbs = false,
  breadcrumbs = [],
  autoOpenAdmin = false,
  autoOpenDashboard = false,
  hideAds = false,
  isDirectPromotedPage = false,
  lockPlatform,
  lockCategory,
  lockTag,
  hideAdultContent = true,
}: MainAppViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sp = searchParams ?? new URLSearchParams();

  const effectivePlatform = lockPlatform || (sp.get('platform') as Platform) || initialPlatform;
  const effectiveCategory = lockCategory || (sp.get('category') as Category) || initialCategory;
  const effectiveTag = lockTag || sp.get('tag') || initialTag || null;

  // State initialization - show only 25 groups on initial home load
  const [activeTab, setActiveTab] = useState<'explore' | 'leaderboard'>(initialTab);
  const [groups, setGroups] = useState<Group[]>(() => initialGroups.slice(0, 25));
  const [totalGroupsCount, setTotalGroupsCount] = useState<number>(() => {
    if (typeof initialTotalCount === 'number') return initialTotalCount;
    if (typeof initialStats?.totalGroups === 'number' && !lockPlatform && !lockCategory && !lockTag) {
      return initialStats.totalGroups;
    }
    return initialGroups.length || 0;
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMoreGroups, setHasMoreGroups] = useState<boolean>(() => {
    const total = typeof initialTotalCount === 'number'
      ? initialTotalCount
      : ((!lockPlatform && !lockCategory && !lockTag ? initialStats?.totalGroups : undefined) || initialGroups.length || 0);
    return total > 25 || initialGroups.length >= 25;
  });
  const [loading, setLoading] = useState<boolean>(initialGroups.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    platform: effectivePlatform,
    category: effectiveCategory,
    language: (sp.get('language') as Language) || initialLanguage,
    region: (sp.get('region') as Region) || initialRegion,
    memberRange: 'all',
    searchQuery: sp.get('search') || sp.get('q') || initialSearch || '',
    search: sp.get('search') || initialSearch || '',
    selectedTag: effectiveTag,
    tag: effectiveTag || '',
    verifiedOnly: false,
    sort: (sp.get('sort') as SortOption) || 'newest',
    sortBy: (sp.get('sort') as SortOption) || 'newest',
    showAdultOnly: effectiveCategory === 'Adult / 18+' || sp.get('showAdult') === 'true',
    rankOptimizedOnly: false,
  });

  // UI / Modals State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [boostModalGroup, setBoostModalGroup] = useState<Group | null>(null);
  
  // Search input state with debouncing for fast 60fps typing
  const [searchInputValue, setSearchInputValue] = useState<string>(
    filters.searchQuery || filters.search || initialSearch || ''
  );
  const isInitialMount = React.useRef(true);
  
  // Dark mode (default dark theme)
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Stats & Bookmarks State
  const [stats, setStats] = useState<NetworkStats | null>(initialStats || null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Admin Bulk Selection & Mass Deletion State
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isBulkModeActive, setIsBulkModeActive] = useState(false);
  const [isMassDeleteConfirmOpen, setIsMassDeleteConfirmOpen] = useState(false);
  const [isExecutingMassDelete, setIsExecutingMassDelete] = useState(false);
  const [massDeleteProgress, setMassDeleteProgress] = useState<{
    current: number;
    total: number;
    title: string;
    statusText?: string;
  } | null>(null);
  const [massDeleteNotice, setMassDeleteNotice] = useState<string | null>(null);

  // User Profile & Credits State from Auth Context
  const { user: currentUser, setUser, isLoading: isAuthLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [claimModalGroup, setClaimModalGroup] = useState<Group | null>(null);
  const [promoteCreditsGroup, setPromoteCreditsGroup] = useState<Group | null>(null);
  const [isSubmitProofModalOpen, setIsSubmitProofModalOpen] = useState(false);

  // Initialize client-side state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexus_bookmarks');
      if (saved) {
        setBookmarkedIds(JSON.parse(saved));
      }
      setUpvotedIds(getUpvotedGroupIds());
    } catch {
      // Ignore
    }

    // Handle auto-open dashboard if requested via URL
    if (autoOpenDashboard || sp.get('open') === 'dashboard') {
      if (currentUser) {
        setIsUserDashboardOpen(true);
      } else if (!isAuthLoading) {
        setIsAuthModalOpen(true);
      }
    }

    const adminActive = checkAdminSession();
    setIsAdminLoggedIn(adminActive);

    const isExplicitAdminRoute = autoOpenAdmin || (typeof window !== 'undefined' && window.location.pathname === '/kiran8728');
    if (isExplicitAdminRoute) {
      if (adminActive) {
        setIsAdminDashboardOpen(true);
      } else {
        setIsAdminLoginOpen(true);
      }
    }

    // Check if boost_order_id is in URL params
    const boostOrderId = sp.get('boost_order_id');
    const groupId = sp.get('group_id');
    const planId = sp.get('plan_id');
    if (boostOrderId && groupId && planId) {
      // Trigger verification
      fetch('/api/cashfree/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: boostOrderId, groupId, planId }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            fetchGroups(1, false);
          }
        })
        .catch(console.error);
    }

    return () => {
      // Cleanup if any
    };
  }, [searchParams, currentUser, isAuthLoading]);

  // Close User Dashboard on Escape key press
  useEffect(() => {
    if (!isUserDashboardOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserDashboardOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUserDashboardOpen]);

  // Sync bookmarks to localStorage
  const saveBookmarks = (ids: string[]) => {
    setBookmarkedIds(ids);
    try {
      localStorage.setItem('nexus_bookmarks', JSON.stringify(ids));
    } catch {
      // Ignore
    }
  };

  // Fetch groups from API (supports pagination with pageNum and append)
  const fetchGroups = useCallback(async (pageNum = 1, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const activeSort = filters.sort || filters.sortBy || 'newest';
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.set('search', filters.search);
      
      const effectiveQueryPlatform = lockPlatform || (filters.platform && filters.platform !== 'all' ? filters.platform : undefined);
      if (effectiveQueryPlatform) queryParams.set('platform', effectiveQueryPlatform);
      
      const effectiveQueryCategory = lockCategory || (filters.category && filters.category !== 'all' ? filters.category : undefined);
      if (effectiveQueryCategory) queryParams.set('category', effectiveQueryCategory);

      if (filters.language && filters.language !== 'all') queryParams.set('language', filters.language);
      if (filters.region && filters.region !== 'all') queryParams.set('region', filters.region);
      
      const effectiveQueryTag = lockTag || filters.tag;
      if (effectiveQueryTag) queryParams.set('tag', effectiveQueryTag);
      queryParams.set('sort', activeSort);
      if (filters.verifiedOnly) queryParams.set('verifiedOnly', 'true');
      if (filters.rankOptimizedOnly) queryParams.set('rankOptimizedOnly', 'true');
      if (filters.memberRange && filters.memberRange !== 'all') queryParams.set('memberRange', filters.memberRange);
      if (filters.showAdultOnly) queryParams.set('showAdultOnly', 'true');
      if (isDirectPromotedPage) queryParams.set('forDirectPromotedPage', 'true');

      queryParams.set('page', pageNum.toString());
      queryParams.set('pageSize', '25');

      const isAdultContext = filters.category === 'Adult / 18+' || Boolean(filters.showAdultOnly);
      const res = await fetch(`/api/groups?${queryParams.toString()}`, { cache: 'no-store' });
      
      if (res.status === 429) {
        rateLimitCooldownRef.current = Date.now() + 15000;
        setLoading(false);
        setIsLoadingMore(false);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load groups');
      }

      const data = await res.json();

      const newItems: Group[] = data.groups || [];
      const totalCount = data.total !== undefined ? data.total : newItems.length;

      setTotalGroupsCount(totalCount);
      setCurrentPage(pageNum);

      if (append) {
        setGroups(prev => {
          const map = new Map(prev.map(g => [g.id, g]));
          newItems.forEach(item => map.set(item.id, item));
          const combined = Array.from(map.values());
          const sorted = sortGroupsWithSticky(combined, activeSort, isAdultContext);
          setHasMoreGroups(sorted.length < totalCount);
          return sorted;
        });
      } else {
        const sorted = sortGroupsWithSticky(newItems, activeSort, isAdultContext);
        setGroups(sorted);
        setHasMoreGroups(sorted.length < totalCount);
      }
    } catch (err: any) {
      // Only display the error banner if no groups are currently visible to the visitor
      setGroups(prev => {
        if (prev.length === 0) {
          setError(err.message || 'Error fetching communities');
        }
        return prev;
      });
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [filters, isDirectPromotedPage, lockPlatform]);

  // Debounce search query by 250ms for smooth 60fps typing without spamming network/re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => {
        if ((prev.search || '') === searchInputValue && (prev.searchQuery || '') === searchInputValue) {
          return prev;
        }
        return {
          ...prev,
          search: searchInputValue,
          searchQuery: searchInputValue,
        };
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInputValue]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Skip redundant fetch on first mount if server already provided initialGroups
      if (initialGroups && initialGroups.length > 0) {
        return;
      }
    }
    fetchGroups(1, false);
  }, [fetchGroups, initialGroups]);

  const infiniteScrollObserverRef = React.useRef<HTMLDivElement | null>(null);
  const rateLimitCooldownRef = React.useRef<number>(0);
  const lastLoadAttemptRef = React.useRef<number>(0);

  const pageRef = React.useRef(currentPage);
  pageRef.current = currentPage;

  const isLoadingMoreRef = React.useRef(isLoadingMore);
  isLoadingMoreRef.current = isLoadingMore;

  const hasMoreGroupsRef = React.useRef(hasMoreGroups);
  hasMoreGroupsRef.current = hasMoreGroups;

  const loadingRef = React.useRef(loading);
  loadingRef.current = loading;

  const loadNextPage = React.useCallback(() => {
    if (Date.now() < rateLimitCooldownRef.current) return;
    if (Date.now() - lastLoadAttemptRef.current < 1200) return;
    if (isLoadingMoreRef.current || loadingRef.current || !hasMoreGroupsRef.current) return;
    lastLoadAttemptRef.current = Date.now();
    const nextPage = pageRef.current + 1;
    fetchGroups(nextPage, true);
  }, [fetchGroups]);

  // IntersectionObserver on single sentinel with rootMargin 200px 0px
  useEffect(() => {
    const sentinel = infiniteScrollObserverRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some(e => e.isIntersecting);
        if (isVisible && hasMoreGroupsRef.current && !isLoadingMoreRef.current && !loadingRef.current) {
          loadNextPage();
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage, groups.length]);

  // Fetch stats once on mount if not provided by server
  useEffect(() => {
    if (!initialStats) {
      fetch('/api/stats')
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(() => {});
    }
  }, [initialStats]);

  // Upvote handler (1 click per user with toggle)
  const handleUpvote = useCallback(async (target: Group | string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const id = typeof target === 'string' ? target : target.id;
    const { isUpvoted: nextIsUpvoted, upvotedIds: nextUpvotedIds } = toggleUserUpvoteGroup(id);
    setUpvotedIds(nextUpvotedIds);

    // Optimistic UI update
    setGroups(prev =>
      prev.map(g => (g.id === id ? { ...g, upvotes: nextIsUpvoted ? g.upvotes + 1 : Math.max(0, g.upvotes - 1) } : g))
    );

    try {
      const res = await fetch(`/api/groups/${id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextIsUpvoted ? 'add' : 'remove' }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(prev => prev.map(g => (g.id === id ? { ...g, upvotes: data.upvotes } : g)));
      }
    } catch (err) {
      console.error('Error upvoting:', err);
    }
  }, []);

  // Bookmark handler (memoized)
  const handleToggleBookmark = useCallback((target: Group | string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const id = typeof target === 'string' ? target : target.id;
    setBookmarkedIds(prev => {
      const isBookmarked = prev.includes(id);
      const newBookmarks = isBookmarked ? prev.filter(item => item !== id) : [...prev, id];
      try {
        localStorage.setItem('nexus_bookmarks', JSON.stringify(newBookmarks));
      } catch {}
      fetch(`/api/groups/${id}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isBookmarked ? 'remove' : 'add' }),
      }).catch(console.error);
      return newBookmarks;
    });
  }, []);

  // Admin Selection Handlers (memoized)
  const handleToggleSelectGroup = useCallback((group: Group) => {
    setSelectedGroupIds(prev =>
      prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id]
    );
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    const visibleIds = groups.map(g => g.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedGroupIds.includes(id));
    if (allSelected) {
      const visibleSet = new Set(visibleIds);
      setSelectedGroupIds(prev => prev.filter(id => !visibleSet.has(id)));
    } else {
      setSelectedGroupIds(Array.from(new Set([...selectedGroupIds, ...visibleIds])));
    }
  }, [groups, selectedGroupIds]);

  const handleDeselectAll = useCallback(() => {
    setSelectedGroupIds([]);
  }, []);

  const handleRemoveFromSelection = useCallback((id: string) => {
    setSelectedGroupIds(prev => prev.filter(item => item !== id));
  }, []);

  // Join click handler (memoized)
  const handleJoinClick = useCallback((group: Group, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    router.push(getGroupUrlPath(group));
  }, [router]);

  // Open details handler (memoized)
  const handleOpenDetails = useCallback((group: Group) => {
    router.push(getGroupUrlPath(group));
  }, [router]);

  // Select tag handler (memoized)
  const handleSelectTag = useCallback((tag: string) => {
    const cleanTagSlug = tagToSlug(tag) || tag.replace(/^#+/, '').toLowerCase();
    router.push(`/tag/${cleanTagSlug}`);
  }, [router]);

  // Boost click handler (memoized)
  const handleBoostClick = useCallback((group: Group) => {
    setBoostModalGroup(group);
  }, []);

  const handleConfirmMassDelete = async () => {
    if (selectedGroupIds.length === 0) return;
    const count = selectedGroupIds.length;
    setIsExecutingMassDelete(true);
    setMassDeleteProgress({
      current: 0,
      total: count,
      title: `Deleting ${count} selected communities...`,
      statusText: 'Connecting to database and deleting items...',
    });

    const idsToDelete = [...selectedGroupIds];

    try {
      const res = await fetch('/api/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      if (!res.ok) {
        console.warn('DELETE /api/groups returned status', res.status);
      }

      setMassDeleteProgress({
        current: count,
        total: count,
        title: 'Mass Deletion Complete!',
        statusText: `Successfully deleted ${count} communities.`,
      });

      // Optimistically update view
      const idSet = new Set(idsToDelete.map(id => (id || '').toLowerCase()));
      setGroups(prev =>
        prev.filter(
          g =>
            !idSet.has((g.id || '').toLowerCase()) &&
            !idSet.has((g.slug || '').toLowerCase()) &&
            !idSet.has((g.url || '').toLowerCase())
        )
      );
      setTotalGroupsCount(prev => Math.max(0, prev - count));
      setSelectedGroupIds([]);

      setMassDeleteNotice(`Successfully deleted ${count} community ${count === 1 ? 'group' : 'groups'}.`);

      setTimeout(() => {
        setIsMassDeleteConfirmOpen(false);
        setIsExecutingMassDelete(false);
        setMassDeleteProgress(null);
        fetchGroups(1, false);
      }, 800);

      setTimeout(() => {
        setMassDeleteNotice(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error during mass deletion:', err);
      setIsExecutingMassDelete(false);
      setMassDeleteProgress(null);
      setMassDeleteNotice('Error during mass deletion. Please try again.');
    }
  };

  // Add tag handler
  const handleAddTag = async (id: string, tag: string) => {
    try {
      const res = await fetch(`/api/groups/${id}/tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(prev => prev.map(g => (g.id === id ? { ...g, customTags: data.customTags } : g)));
      }
    } catch (err) {
      console.error('Error adding tag:', err);
    }
  };

  // Active filter count
  const activeFilterCount = [
    filters.platform !== 'all',
    filters.category !== 'all',
    filters.language !== 'all',
    filters.region !== 'all',
    filters.memberRange !== 'all',
    filters.verifiedOnly,
    filters.rankOptimizedOnly,
    Boolean(filters.tag),
    Boolean(filters.search),
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen dark bg-slate-950 text-slate-100">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={tab => {
          setActiveTab(tab);
          if (tab === 'leaderboard') {
            router.push('/leaderboard');
          }
        }}
        searchQuery={searchInputValue}
        setSearchQuery={query => setSearchInputValue(query)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onOpenAdmin={() => (isAdminLoggedIn ? setIsAdminDashboardOpen(true) : setIsAdminLoginOpen(true))}
        isAdminLoggedIn={isAdminLoggedIn}
        bookmarkCount={bookmarkedIds.length}
        isDarkMode={true}
        setIsDarkMode={() => {}}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDashboard={() => {
          if (currentUser) {
            setIsUserDashboardOpen(true);
          } else {
            setIsAuthModalOpen(true);
          }
        }}
        onNavigateHome={() => {
          setSearchInputValue('');
          setFilters({
            platform: lockPlatform || 'all',
            category: lockCategory || 'all',
            language: 'all',
            region: 'all',
            memberRange: 'all',
            searchQuery: '',
            search: '',
            selectedTag: lockTag || null,
            tag: lockTag || '',
            verifiedOnly: false,
            sort: 'newest',
            sortBy: 'newest',
            showAdultOnly: lockCategory === 'Adult / 18+',
            rankOptimizedOnly: false,
          });
          setActiveTab('explore');
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumbs Navigation */}
        {showBreadcrumbs && breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} />
        )}

        {/* Network Stats Banner */}
        {!isDirectPromotedPage && stats && (
          <StatsBanner
            totalGroups={stats.totalGroups}
            totalJoins={stats.totalJoins}
            totalMembers={stats.totalMembers}
            onOpenSubmit={() => router.push('/submit-group')}
          />
        )}

        {/* Primary Page Header & H1 */}
        <div className="space-y-1.5 pb-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            {pageHeading ? (
              pageHeading.includes('Discover Active') ? (
                <>
                  Discover Active{' '}
                  <Link
                    href="/whatsapp-groups"
                    prefetch={false}
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 decoration-emerald-500/50 hover:decoration-emerald-300 transition-colors cursor-pointer"
                    title="Browse Verified WhatsApp Groups"
                  >
                    WhatsApp
                  </Link>
                  {', '}
                  <Link
                    href="/telegram-channels"
                    prefetch={false}
                    className="text-sky-400 hover:text-sky-300 underline underline-offset-4 decoration-sky-500/50 hover:decoration-sky-300 transition-colors cursor-pointer"
                    title="Browse Verified Telegram Channels"
                  >
                    Telegram
                  </Link>
                  {', '}
                  <Link
                    href="/discord-servers"
                    prefetch={false}
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/50 hover:decoration-indigo-300 transition-colors cursor-pointer"
                    title="Browse Verified Discord Servers"
                  >
                    Discord
                  </Link>
                  {' & '}
                  <span className="text-pink-400">
                    Instagram
                  </span>
                  {' Groups'}
                </>
              ) : (
                pageHeading
              )
            ) : (
              filters.platform !== 'all'
                ? `${filters.platform.toUpperCase()} Groups Directory — Active Communities & Links`
                : filters.category !== 'all'
                ? `${filters.category} Groups & Communities`
                : activeTab === 'leaderboard'
                ? 'Top Social Communities Leaderboard'
                : (
                  <>
                    Discover Active{' '}
                    <Link
                      href="/whatsapp-groups"
                      prefetch={false}
                      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 decoration-emerald-500/50 hover:decoration-emerald-300 transition-colors cursor-pointer"
                      title="Browse Verified WhatsApp Groups"
                    >
                      WhatsApp
                    </Link>
                    {', '}
                    <Link
                      href="/telegram-channels"
                      prefetch={false}
                      className="text-sky-400 hover:text-sky-300 underline underline-offset-4 decoration-sky-500/50 hover:decoration-sky-300 transition-colors cursor-pointer"
                      title="Browse Verified Telegram Channels"
                    >
                      Telegram
                    </Link>
                    {', '}
                    <Link
                      href="/discord-servers"
                      prefetch={false}
                      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/50 hover:decoration-indigo-300 transition-colors cursor-pointer"
                      title="Browse Verified Discord Servers"
                    >
                      Discord
                    </Link>
                    {' & '}
                    <span className="text-pink-400">
                      Instagram
                    </span>
                    {' Groups'}
                  </>
                )
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            {pageDescription ? (
              pageDescription.includes('WhatsApp') ? (
                <>
                  Browse verified group invite links, explore niche topics, and connect with global communities across{' '}
                  <Link
                    href="/whatsapp-groups"
                    prefetch={false}
                    className="text-slate-200 hover:text-emerald-400 font-medium underline underline-offset-2 decoration-slate-700 hover:decoration-emerald-400 transition-colors cursor-pointer"
                    title="Browse WhatsApp Groups"
                  >
                    WhatsApp
                  </Link>
                  {', '}
                  <Link
                    href="/telegram-channels"
                    prefetch={false}
                    className="text-slate-200 hover:text-sky-400 font-medium underline underline-offset-2 decoration-slate-700 hover:decoration-sky-400 transition-colors cursor-pointer"
                    title="Browse Telegram Channels"
                  >
                    Telegram Channels
                  </Link>
                  {', '}
                  <Link
                    href="/discord-servers"
                    prefetch={false}
                    className="text-slate-200 hover:text-indigo-400 font-medium underline underline-offset-2 decoration-slate-700 hover:decoration-indigo-400 transition-colors cursor-pointer"
                    title="Browse Discord Servers"
                  >
                    Discord
                  </Link>
                  {', '}
                  <Link
                    href="/signal-groups"
                    prefetch={false}
                    className="text-slate-200 hover:text-blue-400 font-medium underline underline-offset-2 decoration-slate-700 hover:decoration-blue-400 transition-colors cursor-pointer"
                    title="Browse Signal Groups"
                  >
                    Signal
                  </Link>
                  {', '}
                  <Link
                    href="/facebook-groups"
                    prefetch={false}
                    className="text-slate-200 hover:text-blue-500 font-medium underline underline-offset-2 decoration-slate-700 hover:decoration-blue-500 transition-colors cursor-pointer"
                    title="Browse Facebook Groups"
                  >
                    Facebook
                  </Link>
                  {', '}
                  <Link
                    href="/reddit-communities"
                    prefetch={false}
                    className="text-slate-200 hover:text-orange-400 font-medium underline underline-offset-2 decoration-slate-700 hover:decoration-orange-400 transition-colors cursor-pointer"
                    title="Browse Reddit Communities"
                  >
                    Reddit
                  </Link>
                  {', '}
                  <span className="text-pink-400 font-medium">
                    Instagram Groups
                  </span>
                  {', and '}
                  <Link
                    href="/snapchat-groups"
                    prefetch={false}
                    className="text-slate-200 hover:text-yellow-400 font-medium underline underline-offset-2 decoration-slate-700 hover:decoration-yellow-400 transition-colors cursor-pointer"
                    title="Browse Snapchat Groups"
                  >
                    Snapchat
                  </Link>
                  .
                </>
              ) : (
                pageDescription
              )
            ) : (
              filters.platform !== 'all'
                ? `Explore verified ${filters.platform} invite links, active discussion groups, channels, and niche communities.`
                : filters.category !== 'all'
                ? `Browse top verified ${filters.category} communities across WhatsApp, Telegram Channels, Discord, Signal, Facebook, Reddit, Instagram Groups, and Snapchat.`
                : 'Browse verified group invite links, explore niche topics, and connect with global communities safely.'
            )}
          </p>
        </div>

        {/* Ad Placement Top */}
        {!hideAds && <AdDisplay slot="header_top" />}

        {/* Tab Navigation & Platform Filters */}
        {!isDirectPromotedPage && (
          <div className="flex flex-col gap-4">
            <PlatformFilter
              selectedPlatform={lockPlatform || filters.platform}
              onSelectPlatform={p => {
                if (p === 'all') router.push('/');
                else if (p === 'whatsapp') router.push('/whatsapp-groups');
                else if (p === 'telegram') router.push('/telegram-channels');
                else if (p === 'discord') router.push('/discord-servers');
                else if (p === 'facebook') router.push('/facebook-groups');
                else if (p === 'signal') router.push('/signal-groups');
                else if (p === 'snapchat') router.push('/snapchat-groups');
                else if (p === 'reddit') router.push('/reddit-communities');
                else router.push(getPlatformListingUrl(p));
              }}
              platformCounts={stats?.platformCounts || {}}
              totalCount={stats?.totalGroups || groups.length}
              lockedPlatform={lockPlatform}
            />

            {/* Search, Filter Bar & Tag Cloud */}
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              viewMode={viewMode}
              setViewMode={setViewMode}
              totalFiltered={groups.length}
              onOpenKeywordFilter={() => setIsKeywordModalOpen(true)}
              lockedPlatform={lockPlatform}
              lockedCategory={lockCategory}
              lockedTag={lockTag}
              hideAdultContent={hideAdultContent}
            />

            <CustomTagCloud
              groups={groups}
              selectedTag={filters.selectedTag || null}
              onSelectTag={tag => setFilters(prev => ({ ...prev, selectedTag: tag, tag: tag || '' }))}
              hideAdultContent={hideAdultContent}
            />
          </div>
        )}

        {/* Main Content Area */}
        {activeTab === 'explore' ? (
          <div>
            {/* Header info & Active tag indicator */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                <h2 className="text-lg font-bold text-slate-100">
                  {filters.tag
                    ? `Showing #${filters.tag}`
                    : filters.category !== 'all'
                    ? (lockPlatform ? `${lockPlatform.toUpperCase()} ${filters.category} Groups` : `${filters.category} Groups`)
                    : filters.platform !== 'all'
                    ? `${filters.platform.toUpperCase()} Communities`
                    : 'Trending Groups and Communities'}
                </h2>
                <span suppressHydrationWarning className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  {`${(totalGroupsCount !== undefined && totalGroupsCount > 0 ? totalGroupsCount : (initialTotalCount ?? groups.length))} groups`}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {activeFilterCount > 0 && (
                  <button
                    onClick={() =>
                      setFilters({
                        platform: lockPlatform || 'all',
                        category: 'all',
                        language: 'all',
                        region: 'all',
                        memberRange: 'all',
                        searchQuery: '',
                        search: '',
                        selectedTag: null,
                        tag: '',
                        verifiedOnly: false,
                        sort: 'newest',
                        sortBy: 'newest',
                        showAdultOnly: false,
                        rankOptimizedOnly: false,
                      })
                    }
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline"
                  >
                    Clear filters ({activeFilterCount})
                  </button>
                )}
              </div>
            </div>

            {/* Admin Bulk Selection & Mass Deletion Toolbar */}
            {(isAdminLoggedIn || autoOpenAdmin || isBulkModeActive) && (
              <div className="mb-5 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-indigo-950/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      Admin Selection & Mass Deletion Mode
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        /kiran8728
                      </span>
                    </h3>
                    <p className="text-[11px] text-indigo-300/80">
                      {selectedGroupIds.length > 0
                        ? `${selectedGroupIds.length} ${selectedGroupIds.length === 1 ? 'community' : 'communities'} selected for mass deletion.`
                        : 'Select multiple community groups using checkboxes to delete them in bulk with confirmation.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/60 text-indigo-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {groups.length > 0 && groups.every(g => selectedGroupIds.includes(g.id))
                      ? 'Deselect Page'
                      : `Select All (${groups.length})`}
                  </button>

                  {selectedGroupIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer"
                    >
                      Clear ({selectedGroupIds.length})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsMassDeleteConfirmOpen(true)}
                    disabled={selectedGroupIds.length === 0}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Mass Delete ({selectedGroupIds.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAdminDashboardOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    Admin Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Groups Grid / List */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8 space-y-4 my-4">
                <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto text-slate-400 border border-slate-700/50 shadow-inner">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-200">
                  {isDirectPromotedPage ? 'No Direct Promoted Groups Selected' : 'No communities found'}
                </h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  {isDirectPromotedPage
                    ? 'There are currently no community groups selected for direct promotion in the admin panel.'
                    : 'Try adjusting your filters or be the first to submit a group in this category.'}
                </p>
                {!isDirectPromotedPage && (
                  <button
                    onClick={() => router.push('/submit-group')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/40 transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Submit Group
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {groups.map((group, index) => {
                  const shouldShowAd = (index === 2 || (index > 2 && (index - 2) % 10 === 0)) && !hideAds;
                  const adIndexNumber = index === 2 ? 0 : Math.floor((index - 2) / 10);

                  return (
                    <React.Fragment key={group.id}>
                      <GroupCard
                        group={group}
                        isBookmarked={bookmarkedIds.includes(group.id)}
                        isUpvoted={upvotedIds.includes(group.id)}
                        selectable={isAdminLoggedIn || autoOpenAdmin || isBulkModeActive}
                        isSelected={selectedGroupIds.includes(group.id)}
                        onToggleSelect={handleToggleSelectGroup}
                        onToggleBookmark={handleToggleBookmark}
                        onUpvote={handleUpvote}
                        onJoinClick={handleJoinClick}
                        onOpenDetails={handleOpenDetails}
                        onSelectTag={handleSelectTag}
                        onBoostClick={handleBoostClick}
                      />

                      {/* 24-Hour Trending Promotions Button directly below the 3rd Group */}
                      {index === 2 && (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex justify-center py-2">
                          <Link
                            href="/active24hours"
                            prefetch={false}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-amber-950 dark:text-amber-200 bg-gradient-to-r from-amber-400/90 via-amber-300 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 border border-amber-300/80 dark:border-amber-500/40 shadow-sm shadow-amber-500/20 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group cursor-pointer"
                          >
                            <Flame className="w-3.5 h-3.5 text-amber-700 dark:text-amber-900 fill-amber-700 dark:fill-amber-900 animate-pulse" />
                            <span>View 24-Hour Trending Communities &amp; Rankings</span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-950/15 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 uppercase tracking-wider">
                              24H LIVE
                            </span>
                            <span className="group-hover:translate-x-0.5 transition-transform text-xs">→</span>
                          </Link>
                        </div>
                      )}

                      {shouldShowAd && (
                        <AdDisplay 
                          slot="feed_native" 
                          adIndex={adIndexNumber}
                          isCurrentContextSafe={filters.category !== 'Adult / 18+'} 
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <GroupListView
                groups={groups}
                bookmarkedIds={new Set(bookmarkedIds)}
                selectable={isAdminLoggedIn || autoOpenAdmin || isBulkModeActive}
                selectedIds={new Set(selectedGroupIds)}
                onToggleSelect={handleToggleSelectGroup}
                onToggleBookmark={handleToggleBookmark}
                onUpvote={handleUpvote}
                onJoinClick={handleJoinClick}
                onOpenDetails={handleOpenDetails}
                onBoostClick={handleBoostClick}
              />
            )}

            {/* Infinite Scroll Trigger & Load More Sentinel */}
            {!loading && groups.length > 0 && (
              <div ref={infiniteScrollObserverRef} className="mt-10 mb-6 flex flex-col items-center justify-center space-y-3">
                {hasMoreGroups ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-slate-900/90 border border-slate-800 text-emerald-400 font-semibold text-xs shadow-lg shadow-emerald-950/20">
                      <RefreshCw className={`w-4 h-4 ${isLoadingMore ? 'animate-spin' : ''} text-emerald-400`} />
                      <span>{isLoadingMore ? 'Loading next 25 group links...' : 'Scroll down for more group links...'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchGroups(currentPage + 1, true)}
                      disabled={isLoadingMore}
                      className="text-xs text-slate-400 hover:text-slate-200 underline transition cursor-pointer disabled:opacity-50"
                    >
                      {`Click here to load more manually (${groups.length} of ${totalGroupsCount || initialTotalCount || groups.length} loaded)`}
                    </button>
                  </div>
                ) : (
                  <div className="px-5 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span suppressHydrationWarning>{`All ${totalGroupsCount || initialTotalCount || groups.length} communities loaded`}</span>
                  </div>
                )}
                
                <p suppressHydrationWarning className="text-[11px] text-slate-500 font-medium">
                  {`Showing ${groups.length} of ${totalGroupsCount || initialTotalCount || groups.length} group links`}
                </p>
              </div>
            )}
          </div>
        ) : (
          <LeaderboardView
            groups={groups}
            onOpenDetails={g => router.push(getGroupUrlPath(g))}
            onJoinClick={g => handleJoinClick(g)}
            onUpvote={g => handleUpvote(g)}
            onBoostClick={g => setBoostModalGroup(g)}
          />
        )}



        {/* Ad Placement Bottom */}
        {!hideAds && <AdDisplay slot="footer_banner" />}
      </main>


      {/* Global Semantic Footer */}
      <Footer />

      {/* Modals & Drawers */}
      

      {isBookmarksOpen && (
        <BookmarksDrawer
          isOpen={isBookmarksOpen}
          onClose={() => setIsBookmarksOpen(false)}
          savedGroups={groups.filter(g => bookmarkedIds.includes(g.id))}
          onRemoveBookmark={g => handleToggleBookmark(g)}
          onOpenDetails={group => {
            setIsBookmarksOpen(false);
            router.push(getGroupUrlPath(group));
          }}
          onJoinClick={group => handleJoinClick(group)}
        />
      )}

      {isAdminLoginOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => {
            setIsAdminLoginOpen(false);
            if (autoOpenAdmin || (typeof window !== 'undefined' && window.location.pathname === '/kiran8728')) {
              router.push('/');
            }
          }}
          onLoginSuccess={() => {
            setIsAdminLoggedIn(true);
            setIsAdminLoginOpen(false);
            setIsAdminDashboardOpen(true);
          }}
        />
      )}

      {isAdminDashboardOpen && (
        <AdminDashboardModal
          isOpen={isAdminDashboardOpen}
          onClose={() => {
            setIsAdminDashboardOpen(false);
            if (autoOpenAdmin || (typeof window !== 'undefined' && window.location.pathname === '/kiran8728')) {
              router.push('/');
            }
          }}
          groups={groups}
          onUpdateGroup={async (updated) => {
            const isAdultContext = filters.category === 'Adult / 18+' || Boolean(filters.showAdultOnly);
            setGroups(prev => sortGroupsWithSticky(prev.map(g => (g.id === updated.id ? updated : g)), filters.sort || filters.sortBy || 'newest', isAdultContext));
            await fetchGroups(1, false);
            try {
              router.refresh();
            } catch {}
          }}
          onDeleteGroup={async (id) => {
            if (!id) return;
            const target = (id || '').trim().toLowerCase();
            let decodedTarget = target;
            try {
              decodedTarget = decodeURIComponent(id || '').trim().toLowerCase();
            } catch {}

            const isMatch = (g: Group) => {
              const gId = (g.id || '').trim().toLowerCase();
              const gSlug = (g.slug || '').trim().toLowerCase();
              const gUrl = (g.url || '').trim().toLowerCase();
              return gId === target || gId === decodedTarget || gSlug === target || gSlug === decodedTarget || gUrl === target || gUrl === decodedTarget;
            };

            setGroups(prev => prev.filter(g => !isMatch(g)));
            setTotalGroupsCount(prev => Math.max(0, prev - 1));

            try {
              const res = await fetch(`/api/groups/${encodeURIComponent(id)}`, { method: 'DELETE' });
              if (!res.ok) {
                console.error('Failed to delete group via API, status:', res.status);
              }
            } catch (err) {
              console.error('Failed to delete group via API:', err);
            }

            await fetchGroups(1, false);
            router.refresh();
          }}
          onBulkDeleteGroups={async (ids) => {
            if (!ids || ids.length === 0) return;
            const idSet = new Set<string>();
            ids.forEach(i => {
              if (!i) return;
              idSet.add(i.trim().toLowerCase());
              try {
                idSet.add(decodeURIComponent(i).trim().toLowerCase());
              } catch {}
            });

            const isMatch = (g: Group) => {
              const gId = (g.id || '').trim().toLowerCase();
              const gSlug = (g.slug || '').trim().toLowerCase();
              const gUrl = (g.url || '').trim().toLowerCase();
              return idSet.has(gId) || idSet.has(gSlug) || idSet.has(gUrl);
            };

            setGroups(prev => prev.filter(g => !isMatch(g)));
            setTotalGroupsCount(prev => Math.max(0, prev - ids.length));

            try {
              const res = await fetch('/api/groups', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
              });
              if (!res.ok) {
                console.error('Bulk deletion server returned status:', res.status);
              }
            } catch (err) {
              console.error('Failed to bulk delete via API:', err);
            }

            await fetchGroups(1, false);
            router.refresh();
          }}
          onAddGroup={async (newGroup) => {
            setGroups(prev => [newGroup, ...prev]);
            setTotalGroupsCount(prev => prev + 1);
            await fetchGroups(1, false);
            router.refresh();
          }}
          onLogout={() => {
            clearAdminSession();
            setIsAdminLoggedIn(false);
            setIsAdminDashboardOpen(false);
            if (autoOpenAdmin || (typeof window !== 'undefined' && window.location.pathname === '/kiran8728')) {
              router.push('/');
            }
          }}
        />
      )}

      {isKeywordModalOpen && (
        <KeywordFilterSettingsModal
          isOpen={isKeywordModalOpen}
          onClose={() => setIsKeywordModalOpen(false)}
        />
      )}

      {boostModalGroup && (
        <BoostPaymentModal
          group={boostModalGroup}
          isOpen={Boolean(boostModalGroup)}
          onClose={() => setBoostModalGroup(null)}
          onBoostSuccess={updatedGroup => {
            const isAdultContext = filters.category === 'Adult / 18+' || Boolean(filters.showAdultOnly);
            setGroups(prev => sortGroupsWithSticky(prev.map(g => (g.id === updatedGroup.id ? updatedGroup : g)), filters.sort || filters.sortBy || 'newest', isAdultContext));
            setBoostModalGroup(null);
            fetchGroups();
          }}
        />
      )}

      {/* Floating Bottom Mass Action Bar */}
      {selectedGroupIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-2xl mx-auto z-40 p-4 rounded-2xl bg-neutral-900/95 dark:bg-neutral-900/95 border border-rose-500/50 shadow-2xl shadow-black/80 backdrop-blur-xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-6 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">
                {selectedGroupIds.length} {selectedGroupIds.length === 1 ? 'Community' : 'Communities'} Selected
              </h4>
              <p className="text-xs text-neutral-400">
                Ready for administrative bulk mass deletion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsMassDeleteConfirmOpen(true)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Mass Delete
            </button>
          </div>
        </div>
      )}

      {/* Mass Delete Confirmation Modal */}
      {isMassDeleteConfirmOpen && (
        <MassDeleteConfirmationModal
          isOpen={isMassDeleteConfirmOpen}
          onClose={() => {
            if (!isExecutingMassDelete) setIsMassDeleteConfirmOpen(false);
          }}
          groupsToDelete={groups.filter(g => selectedGroupIds.includes(g.id))}
          onRemoveFromSelection={handleRemoveFromSelection}
          onConfirmDelete={handleConfirmMassDelete}
          isDeleting={isExecutingMassDelete}
          progress={massDeleteProgress}
        />
      )}

      {/* Action Notification Toast */}
      {massDeleteNotice && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{massDeleteNotice}</span>
          <button
            type="button"
            onClick={() => setMassDeleteNotice(null)}
            className="p-1 rounded-lg hover:bg-emerald-900/60 text-emerald-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Authentication Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(user) => {
            if (typeof setUser === 'function') setUser(user);
            setIsAuthModalOpen(false);
          }}
        />
      )}

      {/* User Account & Credits Dashboard */}
      {isUserDashboardOpen && currentUser && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 flex items-start justify-center cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsUserDashboardOpen(false);
          }}
        >
          <div 
            className="w-full max-w-5xl my-4 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <UserDashboardView
              initialUser={currentUser}
              onClose={() => setIsUserDashboardOpen(false)}
              onNavigateHome={() => setIsUserDashboardOpen(false)}
              onLogout={() => {
                logoutUser();
                if (typeof setUser === 'function') setUser(null);
                setIsUserDashboardOpen(false);
              }}
              onSelectGroup={(g) => {
                setIsUserDashboardOpen(false);
                router.push(getGroupUrlPath(g));
              }}
            />
          </div>
        </div>
      )}

      {/* Community Ownership Claim Modal */}
      {claimModalGroup && (
        <ClaimCommunityModal
          group={claimModalGroup}
          isOpen={Boolean(claimModalGroup)}
          onClose={() => setClaimModalGroup(null)}
          onSuccess={() => {
            setClaimModalGroup(null);
            fetchGroups(1, false);
          }}
          onRequireAuth={() => {
            setClaimModalGroup(null);
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {/* Promote with Credits Modal */}
      {promoteCreditsGroup && currentUser && (
        <PromoteWithCreditsModal
          group={promoteCreditsGroup}
          userCredits={currentUser.creditsBalance}
          isOpen={Boolean(promoteCreditsGroup)}
          onClose={() => setPromoteCreditsGroup(null)}
          onSuccess={(updatedGroup, newBalance) => {
            if (typeof setUser === 'function') {
              setUser(currentUser ? { ...currentUser, creditsBalance: newBalance } : null);
            }
            setPromoteCreditsGroup(null);
            const isAdultContext = filters.category === 'Adult / 18+' || Boolean(filters.showAdultOnly);
            setGroups(prev => sortGroupsWithSticky(prev.map(g => g.id === updatedGroup.id ? updatedGroup : g), filters.sort || filters.sortBy || 'newest', isAdultContext));
          }}
          onRequireAuth={() => {
            setPromoteCreditsGroup(null);
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {/* Submit Promotion Proof / Cross-Promotion Modal */}
      {isSubmitProofModalOpen && (
        <SubmitPromotionProofModal
          isOpen={isSubmitProofModalOpen}
          onClose={() => setIsSubmitProofModalOpen(false)}
          onSuccess={() => {
            setIsSubmitProofModalOpen(false);
            if (currentUser) {
              fetchCurrentSession().then(u => {
                if (u && typeof setUser === 'function') setUser(u);
              });
            }
          }}
          onRequireAuth={() => {
            setIsSubmitProofModalOpen(false);
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {/* Adult Content Age Verification Consent Gate */}
      {!hideAdultContent && (filters.category === 'Adult / 18+' || filters.showAdultOnly) && (
        <AdultConsentModal
          onAccept={() => {
            // Consent verified, allow viewing
          }}
          onDecline={() => {
            // Revert filters and redirect to safe homepage
            setFilters(prev => ({ 
              ...prev, 
              category: 'all' as Category, 
              showAdultOnly: false 
            }));
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
          }}
        />
      )}
    </div>
  );
}
