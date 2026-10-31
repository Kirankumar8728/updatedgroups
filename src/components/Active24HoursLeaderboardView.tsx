'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Crown, 
  Flame, 
  TrendingUp, 
  Users, 
  ArrowUp, 
  ExternalLink, 
  Zap, 
  CheckCircle2, 
  Sparkles,
  Award,
  Clock,
  Share2,
  ShieldCheck,
  Filter,
  Check,
  Copy,
  ChevronRight,
  Info,
  RefreshCw,
  Trophy,
  ArrowRight
} from 'lucide-react';
import { Group, Platform } from '@/src/types';
import { 
  PLATFORM_CONFIGS, 
  formatMemberCount, 
  getRankBadgeColor, 
  isAdultGroup, 
  getJoinButtonLabel,
  getPlatformJoinButtonClasses,
  getUpvotedGroupIds,
  toggleUserUpvoteGroup,
  optimizeImageUrl,
  getCommunityFallbackAvatar,
  getCategoryFallbackImage,
  resolveValidGroupImage,
  get24HourCycleExpiration,
  calculate24HourDailyScore,
  getHourlyDeterministicRandom,
  getGroupUrlPath,
  getGroupJoinPath,
  categoryToSlug,
  getPlatformListingUrl
} from '@/src/utils/helpers';
import { PlatformIcon } from './PlatformIcon';
import { fireConfetti } from '@/src/utils/confetti';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth } from './AuthProvider';

import { BookmarksDrawer } from './BookmarksDrawer';
import { UserDashboardView } from './UserDashboardView';
import { GroupDetailModal } from './GroupDetailModal';
import { AuthModal } from './AuthModal';

interface Active24HoursLeaderboardViewProps {
  initialGroups: (Group & { rank24h?: number; score24h?: number })[];
  initialChampion: Group | null;
  cycleExpiration: {
    expiresAt: string | Date;
    expiresIso: string;
    formatted: string;
    hoursLeft: number;
    minutesLeft: number;
  };
}

export const Active24HoursLeaderboardView: React.FC<Active24HoursLeaderboardViewProps> = ({
  initialGroups = [],
  initialChampion = null,
  cycleExpiration: initialCycle,
}) => {
  const [groups, setGroups] = useState<(Group & { rank24h?: number; score24h?: number })[]>(() => {
    if (Array.isArray(initialGroups)) return initialGroups;
    if (initialGroups && typeof initialGroups === 'object' && Array.isArray((initialGroups as any).groups)) {
      return (initialGroups as any).groups;
    }
    return [];
  });
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [cycleInfo, setCycleInfo] = useState(initialCycle);
  const [selectedGroupForModal, setSelectedGroupForModal] = useState<Group | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Common Layout states from Auth Context
  const { user: currentUser, setUser } = useAuth();
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    setUpvotedIds(getUpvotedGroupIds());
    try {
      const storedBookmarks = localStorage.getItem('nexus_bookmarks');
      if (storedBookmarks) setBookmarkedIds(JSON.parse(storedBookmarks));
      document.documentElement.classList.add('dark');
    } catch {}

    // Live 24H countdown interval
    const timer = setInterval(() => {
      setCycleInfo(get24HourCycleExpiration());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const url = selectedPlatform !== 'all' 
        ? `/api/groups/active24hours?platform=${selectedPlatform}` 
        : '/api/groups/active24hours';
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.groups && Array.isArray(data.groups)) {
          setGroups(data.groups);
        } else if (Array.isArray(data)) {
          setGroups(data);
        }
        if (data.cycleExpiration) {
          setCycleInfo(data.cycleExpiration);
        }
      }
    } catch (err) {
      console.error('Failed to refresh 24h trending leaderboard:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpvote = async (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    
    // Confetti effect
    const rect = e.currentTarget.getBoundingClientRect();
    fireConfetti({
      particleCount: 30,
      spread: 60,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight
      },
      colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899']
    });

    const isAlreadyUpvoted = upvotedIds.includes(group.id);
    const action = isAlreadyUpvoted ? 'remove' : 'add';
    const result = toggleUserUpvoteGroup(group.id);
    setUpvotedIds(result.upvotedIds);

    // Optimistically update local group state
    setGroups(prev => (Array.isArray(prev) ? prev : []).map(g => {
      if (g.id === group.id) {
        const currentUpvotes = g.upvotes || 0;
        const current24hUpvotes = g.activity24h?.upvotes || 0;
        const newUpvotes = action === 'add' ? currentUpvotes + 1 : Math.max(0, currentUpvotes - 1);
        const new24hUpvotes = action === 'add' ? current24hUpvotes + 1 : Math.max(0, current24hUpvotes - 1);
        const newScore = (g.activity24h?.score || g.dailyRankScore || 50) + (action === 'add' ? 5 : -5);
        return {
          ...g,
          upvotes: newUpvotes,
          activity24h: {
            joins: g.activity24h?.joins || 0,
            upvotes: new24hUpvotes,
            shares: g.activity24h?.shares || 0,
            score: newScore,
            cycleDate: g.activity24h?.cycleDate || '',
          },
          dailyRankScore: newScore,
        };
      }
      return g;
    }));

    try {
      await fetch(`/api/groups/${group.id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
    } catch (err) {
      console.error('Failed to sync upvote with server:', err);
    }
  };

  const handleShare = async (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    
    // Confetti effect
    const rect = e.currentTarget.getBoundingClientRect();
    fireConfetti({
      particleCount: 25,
      spread: 50,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight
      },
      colors: ['#22c55e', '#3b82f6', '#f59e0b']
    });

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${getGroupUrlPath(group)}` : group.url;
    
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedGroupId(group.id);
        setTimeout(() => setCopiedGroupId(null), 2500);
      } catch {}
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: group.title,
          text: `Join "${group.title}" on GroupLinks!`,
          url: shareUrl,
        });
      } catch {}
    }

    // Optimistically increment share count and 24h score
    setGroups(prev => (Array.isArray(prev) ? prev : []).map(g => {
      if (g.id === group.id) {
        const currentShares = g.shares || 0;
        const current24hShares = g.activity24h?.shares || 0;
        const newScore = (g.activity24h?.score || g.dailyRankScore || 50) + 6;
        return {
          ...g,
          shares: currentShares + 1,
          activity24h: {
            joins: g.activity24h?.joins || 0,
            upvotes: g.activity24h?.upvotes || 0,
            shares: current24hShares + 1,
            score: newScore,
            cycleDate: g.activity24h?.cycleDate || '',
          },
          dailyRankScore: newScore,
        };
      }
      return g;
    }));

    try {
      await fetch(`/api/groups/${group.id}/share`, { method: 'POST' });
    } catch {}
  };

  const handleJoinClick = async (group: Group) => {
    // Optimistic join click update
    setGroups(prev => (Array.isArray(prev) ? prev : []).map(g => {
      if (g.id === group.id) {
        const currentClicks = g.clicks || 0;
        const current24hJoins = g.activity24h?.joins || 0;
        const newScore = (g.activity24h?.score || g.dailyRankScore || 50) + 3.5;
        return {
          ...g,
          clicks: currentClicks + 1,
          memberCount: (g.memberCount || 100) + 1,
          activity24h: {
            joins: current24hJoins + 1,
            upvotes: g.activity24h?.upvotes || 0,
            shares: g.activity24h?.shares || 0,
            score: newScore,
            cycleDate: g.activity24h?.cycleDate || '',
          },
          dailyRankScore: newScore,
        };
      }
      return g;
    }));

    try {
      await fetch(`/api/groups/${group.id}/join`, { method: 'POST' });
    } catch {}
  };

  // Filter groups by platform if selected (with safety guard for array)
  const safeGroups = Array.isArray(groups) ? groups : [];
  const filteredGroups = safeGroups.filter(g => {
    if (!g || !g.platform) return false;
    if (selectedPlatform === 'all') return true;
    return g.platform.toLowerCase() === selectedPlatform.toLowerCase();
  });

  const sortedFilteredGroups = [...filteredGroups].sort((a, b) => {
    const scoreA = calculate24HourDailyScore(a);
    const scoreB = calculate24HourDailyScore(b);
    if (scoreA > 0 || scoreB > 0) {
      if (scoreA !== scoreB) return scoreB - scoreA;
      const upvotesA = a.activity24h?.upvotes || 0;
      const upvotesB = b.activity24h?.upvotes || 0;
      if (upvotesA !== upvotesB) return upvotesB - upvotesA;
    }
    const randA = getHourlyDeterministicRandom(a.id || a.slug || '', '24h_view');
    const randB = getHourlyDeterministicRandom(b.id || b.slug || '', '24h_view');
    return randB - randA;
  });

  const champion = sortedFilteredGroups.length > 0 ? sortedFilteredGroups[0] : null;
  const runnerUps = sortedFilteredGroups.slice(1, 3);
  const remainingRanks = sortedFilteredGroups.slice(3);

  const PLATFORMS_FILTER_LIST: (Platform | 'all')[] = [
    'all',
    'whatsapp',
    'telegram',
    'discord',
    'reddit',
    'facebook',
    'signal',
    'snapchat',
  ];

  return (
    <div className="min-h-screen dark bg-slate-950 text-slate-100 font-sans">
      <Header
        activeTab="leaderboard"
        setActiveTab={() => {
          if (typeof window !== 'undefined') window.location.href = '/';
        }}
        searchQuery=""
        setSearchQuery={() => {}}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
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
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <Link href="/" prefetch={true} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
            24-Hour Trending Promotions
          </span>
        </div>

        {/* Hero Header Banner with Countdown */}
        <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-indigo-600/10 to-emerald-500/10 dark:from-amber-950/40 dark:via-neutral-900 dark:to-neutral-900 p-6 sm:p-10 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-amber-950 shadow-md">
                <Zap className="w-4 h-4 fill-amber-950" />
                <span>24-Hour Real-Time Promotion Leaderboard</span>
              </div>
              
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                Today's 24-Hour Trending Communities
              </h1>

              <p className="text-sm sm:text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
                Rankings are calculated in real time using <strong>24h active member joins</strong>, <strong>verified upvotes</strong> (1 vote per person), and <strong>community shares</strong>. The crowned #1 group gets featured in <strong>3rd place on the Home discovery feed</strong>!
              </p>
            </div>

            {/* Live UTC Cycle Countdown Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-amber-400/40 dark:border-amber-500/40 shadow-lg backdrop-blur-md flex flex-col items-center justify-center shrink-0 min-w-[240px]">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1.5">
                <Clock className="w-4 h-4 animate-spin text-amber-500" />
                <span>24h Contest Reset Timer</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-neutral-900 dark:text-white">
                {cycleInfo.formatted}
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 text-center">
                Resets daily at 00:00 UTC (Lifetime counts preserved)
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="mt-3 w-full py-1.5 px-3 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Updating Scores...' : 'Refresh Leaderboard'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Promotion Guarantee Info Box */}
        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 text-xs flex items-start gap-3 shadow-xs">
          <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-indigo-950 dark:text-indigo-200">
              ⚡ How the 24-Hour Home Page Promotion Works:
            </span>
            <p className="leading-relaxed text-indigo-900/90 dark:text-indigo-300/90">
              The community with the highest calculated 24-hour activity score (joins, 1-per-person upvotes, and share referrals) is automatically placed into <strong>3rd place on the main Home Page feed</strong>. When the 24-hour cycle expires at 00:00 UTC, the 24-hour contest score resets for a fair daily contest, while your total lifetime upvotes, member counts, and share milestones remain permanently intact!
            </p>
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {PLATFORMS_FILTER_LIST.map((plat) => {
            const isSelected = selectedPlatform === plat;
            const config = plat !== 'all' ? PLATFORM_CONFIGS[plat] : null;
            return (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-amber-950 shadow-md shadow-amber-500/25 scale-105'
                    : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                {plat !== 'all' && <PlatformIcon platform={plat} className="w-3.5 h-3.5" />}
                <span className="capitalize">{plat === 'all' ? 'All Platforms' : config?.name || plat}</span>
              </button>
            );
          })}
        </div>

        {/* Champion Spotlight (#1 Crowned 24-Hour Winner) */}
        {champion && (
          <div className="relative rounded-3xl overflow-hidden border-2 border-amber-400 dark:border-amber-500 bg-gradient-to-b from-amber-100/50 via-white to-white dark:from-amber-950/40 dark:via-neutral-900 dark:to-neutral-900 shadow-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              
              <div className="flex items-start gap-4 sm:gap-6">
                {/* Avatar & Platform */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-lg bg-neutral-100 dark:bg-neutral-800">
                    <img
                      src={optimizeImageUrl(champion.imageUrl, 160, 80, champion.category, champion.title, false)}
                      alt={champion.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = getCategoryFallbackImage(champion.category, false, champion.title);
                      }}
                    />
                  </div>
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-sm shadow-md">
                    👑
                  </div>
                </div>

                {/* Champion Title & Badges */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 shadow-xs">
                      Rank #1 Champion
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-xs">
                      🌟 Featured in 3rd Place on Home Page
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                    {champion.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 max-w-xl">
                    {champion.description || 'Active social community with high daily engagement.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <Link
                      href={isAdultGroup(champion) ? '/adult-groups' : `/categories/${categoryToSlug(champion.category)}`}
                      prefetch={false}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-200 transition-colors"
                    >
                      📂 {champion.category}
                    </Link>
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 font-medium">
                      🌐 {champion.region}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 font-medium">
                      🗣️ {champion.language}
                    </span>
                  </div>
                </div>
              </div>

              {/* 24-Hour Contest Score Stats Breakdown */}
              <div className="w-full lg:w-auto bg-amber-50 dark:bg-amber-950/50 p-4 sm:p-5 rounded-2xl border border-amber-300 dark:border-amber-700/80 flex flex-col justify-between gap-4 shrink-0">
                <div className="text-center pb-2 border-b border-amber-200 dark:border-amber-800">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    24-Hour Daily Rank Score
                  </div>
                  <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                    {champion.activity24h?.score || champion.dailyRankScore || 120} pts
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white/80 dark:bg-neutral-900/80 p-2 rounded-xl">
                    <div className="text-[10px] text-neutral-500 font-bold uppercase">24h Joins</div>
                    <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      +{champion.activity24h?.joins || champion.clicks || 0}
                    </div>
                  </div>

                  <div className="bg-white/80 dark:bg-neutral-900/80 p-2 rounded-xl">
                    <div className="text-[10px] text-neutral-500 font-bold uppercase">24h Upvotes</div>
                    <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                      +{champion.activity24h?.upvotes || champion.upvotes || 0}
                    </div>
                  </div>

                  <div className="bg-white/80 dark:bg-neutral-900/80 p-2 rounded-xl">
                    <div className="text-[10px] text-neutral-500 font-bold uppercase">24h Shares</div>
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      +{champion.activity24h?.shares || champion.shares || 0}
                    </div>
                  </div>
                </div>

                {/* Champion Quick Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={(e) => handleUpvote(e, champion)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      upvotedIds.includes(champion.id)
                        ? 'bg-amber-500 text-amber-950 shadow-sm'
                        : 'bg-white dark:bg-neutral-900 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>{upvotedIds.includes(champion.id) ? 'Upvoted' : 'Upvote (+5 pts)'}</span>
                  </button>

                  <button
                    onClick={(e) => handleShare(e, champion)}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedGroupId === champion.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedGroupId === champion.id ? 'Copied Link!' : 'Share (+6 pts)'}</span>
                  </button>

                  <a
                    href={getGroupJoinPath(champion)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleJoinClick(champion)}
                    className={`py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${getPlatformJoinButtonClasses(champion.platform)}`}
                  >
                    <span>Join Now</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Podium Runner-Ups (#2 and #3) */}
        {runnerUps.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {runnerUps.map((group, idx) => {
              const rankNum = idx + 2;
              const isSilver = rankNum === 2;
              return (
                <div
                  key={group.id}
                  className={`p-5 rounded-3xl border bg-white dark:bg-neutral-900 flex flex-col justify-between gap-4 shadow-md ${
                    isSilver 
                      ? 'border-slate-300 dark:border-slate-700/80' 
                      : 'border-amber-600/40 dark:border-amber-700/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={optimizeImageUrl(group.imageUrl, 128, 75)}
                          alt={group.title}
                          className="w-12 h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700"
                          onError={(e) => {
                            e.currentTarget.src = getCommunityFallbackAvatar(group.title, group.platform, group.id);
                          }}
                        />
                        <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-xs ${
                          isSilver ? 'bg-slate-300 text-slate-900' : 'bg-amber-700 text-amber-100'
                        }`}>
                          #{rankNum}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <PlatformIcon platform={group.platform} className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 capitalize">
                            {group.platform}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white line-clamp-1">
                          {group.title}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-neutral-400">24h Score</div>
                      <div className="text-lg font-black text-amber-500">
                        {group.activity24h?.score || group.dailyRankScore || 80} pts
                      </div>
                    </div>
                  </div>

                  {/* 24h Metrics mini-pills & Action Buttons */}
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                      <span>👥 +{group.activity24h?.joins || group.clicks || 0} joins</span>
                      <span>👍 +{group.activity24h?.upvotes || group.upvotes || 0} votes</span>
                      <span>🚀 +{group.activity24h?.shares || group.shares || 0} shares</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 w-full">
                      <button
                        onClick={(e) => handleUpvote(e, group)}
                        className={`h-9 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                          upvotedIds.includes(group.id)
                            ? 'bg-amber-500 text-amber-950 border-amber-400 font-black shadow-xs'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200'
                        }`}
                        title="Upvote group (1 vote per person)"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>{group.upvotes}</span>
                      </button>

                      <button
                        onClick={(e) => handleShare(e, group)}
                        className="h-9 px-2.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Share community link"
                      >
                        {copiedGroupId === group.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Share</span>
                          </>
                        )}
                      </button>

                      <a
                        href={getGroupJoinPath(group)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleJoinClick(group)}
                        className={`h-9 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95 ${getPlatformJoinButtonClasses(group.platform)}`}
                      >
                        <span>Join</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Contenders Leaderboard Table (Ranks #1 to #50) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                All 24-Hour Active Rankings (1 to {filteredGroups.length})
              </h3>
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              One vote per person • Real-time scoring
            </span>
          </div>

          <div className="space-y-3 sm:space-y-3.5">
            {filteredGroups.map((group, index) => {
              const rank = index + 1;
              const badge = getRankBadgeColor(rank);
              const isTopRanked = rank === 1;

              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroupForModal(group)}
                  className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all hover:shadow-md cursor-pointer select-none bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800/80 shadow-2xs hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  {/* Left Column: Rank + Icon + Title + Meta */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black shrink-0 ${badge.bg}`}>
                      #{rank}
                    </span>

                    <div className="relative shrink-0">
                      <img
                        src={optimizeImageUrl(group.imageUrl, 96, 75)}
                        alt={group.title}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
                        onError={(e) => {
                          e.currentTarget.src = getCommunityFallbackAvatar(group.title, group.platform, group.id);
                        }}
                      />
                      <div className="absolute -bottom-1 -right-1 p-0.5 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-2xs">
                        <PlatformIcon platform={group.platform} className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white truncate">
                          {group.title}
                        </h4>
                        <Link
                          href={getPlatformListingUrl(group.platform)}
                          prefetch={false}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-transform hover:scale-105 cursor-pointer ${PLATFORM_CONFIGS[group.platform].badgeClass}`}
                        >
                          {PLATFORM_CONFIGS[group.platform].name}
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        <Link
                          href={isAdultGroup(group) ? '/adult-groups' : `/categories/${categoryToSlug(group.category)}`}
                          prefetch={false}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                        >
                          {group.category}
                        </Link>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                          {formatMemberCount(group.memberCount)} members
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: 24h Metrics + Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2.5 sm:pt-0 border-t sm:border-0 border-neutral-100 dark:border-neutral-800">
                    
                    {/* 24h Score & Breakdown */}
                    <div className="flex items-center justify-between sm:flex-col sm:items-end text-left sm:text-right pr-1">
                      <div className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                        {group.activity24h?.score || group.dailyRankScore || 50} pts
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                        <span title="24-Hour Joins">👥 +{group.activity24h?.joins || group.clicks || 0}</span>
                        <span title="24-Hour Upvotes">👍 +{group.activity24h?.upvotes || group.upvotes || 0}</span>
                        <span title="24-Hour Shares">🚀 +{group.activity24h?.shares || group.shares || 0}</span>
                      </div>
                    </div>

                    {/* Interactive Action Buttons: Touch-friendly Grid on Mobile */}
                    <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleUpvote(e, group)}
                        className={`h-10 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer border ${
                          upvotedIds.includes(group.id)
                            ? 'bg-amber-500 text-amber-950 border-amber-400 shadow-xs font-black'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200/80 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                        title="Upvote group (1 vote per person)"
                      >
                        <ArrowUp className={`w-3.5 h-3.5 ${upvotedIds.includes(group.id) ? 'stroke-[2.5]' : ''}`} />
                        <span>{group.upvotes}</span>
                      </button>

                      <button
                        onClick={(e) => handleShare(e, group)}
                        className="h-10 px-3 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Share community invite link (+6 pts)"
                      >
                        {copiedGroupId === group.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Share</span>
                          </>
                        )}
                      </button>

                      <a
                        href={getGroupJoinPath(group)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleJoinClick(group)}
                        className={`h-10 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 whitespace-nowrap ${getPlatformJoinButtonClasses(group.platform)}`}
                      >
                        <span>Join</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transparent 24-Hour Ranking Formula & Daily Reset Rules */}
        <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
            <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base sm:text-lg font-bold">
              Transparent 24-Hour Promotion Scoring Formula
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Share2 className="w-4 h-4" />
                <span>Shares: +6.0 Pts</span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                Sharing group links across social networks earns the highest boost for viral community reach.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>Joins: +3.5 Pts</span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                Active member clicks and gateway join conversions validate genuine community demand.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ArrowUp className="w-4 h-4" />
                <span>Upvotes: +5.0 Pts</span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                Strictly enforced 1 vote per person. Authenticated member validation gives honest community endorsement.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
              <div className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" />
                <span>Daily UTC Reset</span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                24h scores reset at 00:00 UTC so every community has an equal chance daily without erasing lifetime stats!
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Group Detail Modal when clicking on any row */}
      {selectedGroupForModal && (
        <GroupDetailModal
          group={selectedGroupForModal}
          isOpen={true}
          onClose={() => setSelectedGroupForModal(null)}
          onJoinClick={(g) => handleJoinClick(g)}
          onUpvote={(g) => handleUpvote({ currentTarget: document.body, stopPropagation: () => {} } as any, g)}
          onToggleBookmark={() => {}}
          onAddTag={() => {}}
          isBookmarked={bookmarkedIds.includes(selectedGroupForModal.id)}
        />
      )}

      {/* Bookmarks Drawer */}
      {isBookmarksOpen && (
        <BookmarksDrawer
          isOpen={isBookmarksOpen}
          onClose={() => setIsBookmarksOpen(false)}
          savedGroups={groups.filter(g => bookmarkedIds.includes(g.id))}
          onRemoveBookmark={(g) => {
            const updated = bookmarkedIds.filter(b => b !== g.id);
            setBookmarkedIds(updated);
            localStorage.setItem('nexus_bookmarks', JSON.stringify(updated));
          }}
          onOpenDetails={(g) => setSelectedGroupForModal(g)}
          onJoinClick={(g) => handleJoinClick(g)}
        />
      )}

      {/* User Auth Modal */}
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

      {/* User Dashboard */}
      {isUserDashboardOpen && currentUser && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
          <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl">
            <button
              onClick={() => setIsUserDashboardOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            >
              ✕
            </button>
            <UserDashboardView
              initialUser={currentUser}
              onNavigateHome={() => setIsUserDashboardOpen(false)}
              onLogout={() => {
                if (typeof setUser === 'function') setUser(null);
                setIsUserDashboardOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
