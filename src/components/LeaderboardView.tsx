'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trophy, 
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
  ShieldAlert,
  Share2,
  Check,
  Clock,
  HelpCircle,
  RefreshCw,
  Globe,
  Languages,
  Calendar,
  Info
} from 'lucide-react';
import { Group, Platform } from '../types';
import { 
  PLATFORM_CONFIGS, 
  formatMemberCount, 
  calculatePopularityScore,
  calculate7DayScore,
  getHourlyDeterministicRandom,
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
  categoryToSlug,
  getPlatformListingUrl,
  getGroupUrlPath,
  getGroupJoinPath,
  get24HourCycleExpiration
} from '../utils/helpers';
import { PlatformIcon } from './PlatformIcon';
import { fireConfetti } from '../utils/confetti';

interface LeaderboardViewProps {
  groups: Group[];
  onOpenDetails: (group: Group) => void;
  onJoinClick: (group: Group) => void;
  onUpvote: (group: Group) => void;
  onBoostClick?: (group: Group) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  groups: initialGroups,
  onOpenDetails,
  onJoinClick,
  onUpvote,
  onBoostClick,
}) => {
  const [leaderboardGroups, setLeaderboardGroups] = useState<Group[]>(initialGroups);
  const [includeAdult, setIncludeAdult] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [cycleInfo, setCycleInfo] = useState(() => get24HourCycleExpiration());

  // Keep internal groups synced if prop updates
  useEffect(() => {
    setLeaderboardGroups(initialGroups);
  }, [initialGroups]);

  // 3-minute background refresh (only when tab is visible)
  useEffect(() => {
    const fetchFreshData = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        setIsRefreshing(true);
        const res = await fetch('/api/groups?limit=1000');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.groups) && data.groups.length > 0) {
            setLeaderboardGroups(data.groups);
            setLastRefreshedAt(new Date());
          }
        }
      } catch (err) {
        console.error('Error auto-refreshing 7-day leaderboard:', err);
      } finally {
        setIsRefreshing(false);
      }
    };

    const intervalId = setInterval(fetchFreshData, 180000);
    return () => clearInterval(intervalId);
  }, []);

  // Sync upvoted IDs
  useEffect(() => {
    setUpvotedIds(getUpvotedGroupIds());
  }, []);

  // Weekly contest timer countdown
  useEffect(() => {
    const updateCountdown = () => {
      setCycleInfo(get24HourCycleExpiration());
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 30000);
    return () => clearInterval(timer);
  }, []);

  // Filter adult content out of leaderboard by default
  const eligibleGroups = includeAdult
    ? leaderboardGroups
    : leaderboardGroups.filter(g => !isAdultGroup(g));

  // Platform Filter
  const platformFilteredGroups = selectedPlatform === 'all'
    ? eligibleGroups
    : eligibleGroups.filter(g => g.platform.toLowerCase() === selectedPlatform.toLowerCase());

  // Helper for 7-day real score calculation
  const get7DayScore = (g: Group) => {
    return calculate7DayScore(g);
  };

  // Sort by real 7-Day user interactions, with hourly deterministic rotation fallback for zero scores
  const rankedGroups = [...platformFilteredGroups]
    .map(g => ({
      ...g,
      sevenDayScore: get7DayScore(g),
      hourlyRandom: getHourlyDeterministicRandom(g.id || g.slug || '', '7day_leaderboard'),
    }))
    .sort((a, b) => {
      if (a.sevenDayScore > 0 || b.sevenDayScore > 0) {
        if (a.sevenDayScore !== b.sevenDayScore) {
          return b.sevenDayScore - a.sevenDayScore;
        }
        const upvotesA = a.upvotes || 0;
        const upvotesB = b.upvotes || 0;
        if (upvotesA !== upvotesB) return upvotesB - upvotesA;
        return b.hourlyRandom - a.hourlyRandom;
      }
      return b.hourlyRandom - a.hourlyRandom;
    });

  const topThree = rankedGroups.slice(0, 3);

  const triggerConfetti = (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    fireConfetti({
      particleCount: 30,
      spread: 60,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight
      }
    });
    const result = toggleUserUpvoteGroup(group.id);
    setUpvotedIds(result.upvotedIds);
    onUpvote(group);
  };

  const handleShare = async (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${getGroupUrlPath(group)}`;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedGroupId(group.id);
        setTimeout(() => setCopiedGroupId(null), 2500);
      } catch {
        // fallback
      }
    }
  };

  const platformsList = [
    { id: 'all', name: 'All Ecosystems' },
    { id: 'whatsapp', name: 'WhatsApp' },
    { id: 'telegram', name: 'Telegram' },
    { id: 'discord', name: 'Discord' },
    { id: 'signal', name: 'Signal' },
    { id: 'reddit', name: 'Reddit' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      
      {/* 7-Day Leaderboard Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-xs">
        
        {/* Real-time Status Badge & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-amber-500/20 dark:border-amber-500/20 pb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <span>7-Day Weekly Rankings • Live Updating</span>
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-indigo-500' : 'text-amber-600'}`} />
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="hidden sm:inline font-mono text-[11px] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              Synced: {lastRefreshedAt.toLocaleTimeString()} UTC
            </span>
            <button
              onClick={() => setIncludeAdult(!includeAdult)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                includeAdult 
                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400/40' 
                  : 'bg-white/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>{includeAdult ? 'Adult Mode On' : '18+ Filtered'}</span>
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-black border border-amber-400/40">
            <Crown className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>Official 7-Day Community Leaderboard</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
            Top Social Communities Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Real-time 7-day rankings computed continuously based on genuine weekly join velocity, organic upvotes, community shares, and member growth.
          </p>
        </div>

        {/* Live Weekly Contest Timer Card */}
        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-neutral-900/80 border border-amber-300/60 dark:border-amber-800/60 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Weekly Reset Timer:</span>
          </div>
          <div className="flex items-center gap-1 font-mono font-black text-sm text-amber-600 dark:text-amber-400">
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-800/60">
              {cycleInfo.formatted || `${cycleInfo.hoursLeft}h ${cycleInfo.minutesLeft}m`}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            • Resets weekly on Mondays at 00:00 UTC
          </span>
        </div>
      </div>

      {/* Platform Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {platformsList.map(platform => {
          const count = platform.id === 'all'
            ? eligibleGroups.length
            : eligibleGroups.filter(g => g.platform.toLowerCase() === platform.id).length;
          const isSelected = selectedPlatform === platform.id;

          return (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
                isSelected
                  ? 'bg-amber-500 text-amber-950 border-amber-400 font-black shadow-xs'
                  : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {platform.id !== 'all' && <PlatformIcon platform={platform.id as Platform} className="w-3.5 h-3.5" />}
              <span>{platform.name}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                isSelected ? 'bg-amber-950/20 text-amber-950 font-black' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 7-Day Ranking Explanation Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-neutral-700 dark:text-neutral-300">
        <div className="flex items-start sm:items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <strong className="text-neutral-900 dark:text-white font-bold block sm:inline">
              ⚡ How 7-Day Leaderboard Points Work:
            </strong>{' '}
            7d Score = Upvotes × 3 + 7d Joins × 2 + Shares × 6 + Growth Velocity %. Every community starts fresh each weekly cycle!
          </div>
        </div>
      </div>

      {/* Top Rising Communities Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-6 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 flex items-center justify-center font-black shadow-md shrink-0 text-lg">
              🏆
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Top Rising Communities</span>
                <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  🔥 High Velocity
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Updated every 60 seconds • Ranked by member growth velocity, upvotes & shares
              </p>
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15 px-3.5 py-1.5 rounded-xl border border-amber-500/30 shrink-0">
            ⚡ Real-Time Leaderboard
          </div>
        </div>

        {/* Top 3 Podium Cards (1st, 2nd, 3rd) */}
        {topThree.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
            
            {/* #2 Silver Podium */}
            <div 
              onClick={() => onOpenDetails(topThree[1])}
              className="order-2 md:order-1 relative bg-white dark:bg-neutral-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 p-5 sm:p-6 flex flex-col justify-between shadow-lg hover:shadow-2xl transition-all cursor-pointer group"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-300 text-slate-900 font-black flex items-center justify-center shadow-md border-2 border-white dark:border-neutral-900 text-sm">
                2
              </div>

              <div className="text-center mt-3">
                <div className="relative inline-block mx-auto mb-3">
                  <img
                    src={resolveValidGroupImage(topThree[1].imageUrl, topThree[1].category, topThree[1].title, false)}
                    alt={topThree[1].title}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-300 dark:border-slate-700 shadow-md mx-auto"
                    onError={(e) => {
                      e.currentTarget.src = getCategoryFallbackImage(topThree[1].category, false, topThree[1].title);
                    }}
                  />
                  <Link
                    href={getPlatformListingUrl(topThree[1].platform)}
                    prefetch={false}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold transition-transform hover:scale-110 cursor-pointer shadow-sm ${PLATFORM_CONFIGS[topThree[1].platform].badgeClass}`}
                  >
                    {PLATFORM_CONFIGS[topThree[1].platform].name}
                  </Link>
                </div>

                <h3 className="font-extrabold text-base text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                  {topThree[1].title}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                  {topThree[1].description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium">7-Day Score</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">{topThree[1].sevenDayScore} pts</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium">Weekly Growth</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+{topThree[1].growthRate}% velocity</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => triggerConfetti(e, topThree[1])}
                    className="h-10 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{topThree[1].upvotes}</span>
                  </button>

                  <button
                    onClick={(e) => handleShare(e, topThree[1])}
                    className="h-10 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                    title="Share community invite link"
                  >
                    {copiedGroupId === topThree[1].id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                  </button>

                  <a
                    href={getGroupJoinPath(topThree[1])}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onJoinClick(topThree[1])}
                    className={`h-10 px-1 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1 shadow-xs whitespace-nowrap active:scale-95 cursor-pointer ${getPlatformJoinButtonClasses(topThree[1].platform)}`}
                  >
                    <span>Join</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* #1 Gold Champion Podium */}
            <div 
              onClick={() => onOpenDetails(topThree[0])}
              className="order-1 md:order-2 relative bg-gradient-to-b from-amber-500/10 via-white to-white dark:from-amber-950/40 dark:via-neutral-900 dark:to-neutral-900 rounded-3xl border-2 border-amber-400 dark:border-amber-500 p-5 sm:p-7 flex flex-col justify-between shadow-2xl shadow-amber-500/10 transition-all cursor-pointer group md:-mt-4"
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black flex items-center gap-1.5 shadow-lg border-2 border-white dark:border-neutral-900 text-xs sm:text-sm whitespace-nowrap">
                <Crown className="w-4 h-4 fill-amber-950" />
                <span>#1 WEEKLY CHAMPION</span>
              </div>

              <div className="text-center mt-4">
                <div className="relative inline-block mx-auto mb-3">
                  <img
                    src={resolveValidGroupImage(topThree[0].imageUrl, topThree[0].category, topThree[0].title, false)}
                    alt={topThree[0].title}
                    referrerPolicy="no-referrer"
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-amber-400 shadow-xl mx-auto"
                    onError={(e) => {
                      e.currentTarget.src = getCategoryFallbackImage(topThree[0].category, false, topThree[0].title);
                    }}
                  />
                  <Link
                    href={getPlatformListingUrl(topThree[0].platform)}
                    prefetch={false}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-bold transition-transform hover:scale-110 cursor-pointer shadow-sm ${PLATFORM_CONFIGS[topThree[0].platform].badgeClass}`}
                  >
                    {PLATFORM_CONFIGS[topThree[0].platform].name}
                  </Link>
                </div>

                <h3 className="font-black text-lg text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 line-clamp-1">
                  {topThree[0].title}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-1">
                  {topThree[0].description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-amber-200/50 dark:border-amber-900/50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium">7-Day Score</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-sm">{topThree[0].sevenDayScore} pts</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium">Weekly Growth</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">+{topThree[0].growthRate}% velocity</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => triggerConfetti(e, topThree[0])}
                    className="h-10 rounded-xl text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 hover:bg-amber-200 border border-amber-300 dark:border-amber-800 flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4 text-amber-600" />
                    <span>{topThree[0].upvotes}</span>
                  </button>

                  <button
                    onClick={(e) => handleShare(e, topThree[0])}
                    className="h-10 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 hover:bg-amber-200 border border-amber-300 dark:border-amber-800 flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                    title="Share community link"
                  >
                    {copiedGroupId === topThree[0].id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                  </button>

                  <a
                    href={getGroupJoinPath(topThree[0])}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onJoinClick(topThree[0])}
                    className={`h-10 px-2 rounded-xl text-xs font-black text-amber-950 bg-amber-500 hover:bg-amber-400 flex items-center justify-center gap-1 shadow-md shadow-amber-500/20 whitespace-nowrap active:scale-95 cursor-pointer`}
                  >
                    <span>Join</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* #3 Bronze Podium */}
            <div 
              onClick={() => onOpenDetails(topThree[2])}
              className="order-3 relative bg-white dark:bg-neutral-900 rounded-3xl border-2 border-amber-700/40 dark:border-amber-800 p-5 sm:p-6 flex flex-col justify-between shadow-lg hover:shadow-2xl transition-all cursor-pointer group"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-700 text-amber-50 font-black flex items-center justify-center shadow-md border-2 border-white dark:border-neutral-900 text-sm">
                3
              </div>

              <div className="text-center mt-3">
                <div className="relative inline-block mx-auto mb-3">
                  <img
                    src={resolveValidGroupImage(topThree[2].imageUrl, topThree[2].category, topThree[2].title, false)}
                    alt={topThree[2].title}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-700/40 shadow-md mx-auto"
                    onError={(e) => {
                      e.currentTarget.src = getCategoryFallbackImage(topThree[2].category, false, topThree[2].title);
                    }}
                  />
                  <Link
                    href={getPlatformListingUrl(topThree[2].platform)}
                    prefetch={false}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold transition-transform hover:scale-110 cursor-pointer shadow-sm ${PLATFORM_CONFIGS[topThree[2].platform].badgeClass}`}
                  >
                    {PLATFORM_CONFIGS[topThree[2].platform].name}
                  </Link>
                </div>

                <h3 className="font-extrabold text-base text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                  {topThree[2].title}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                  {topThree[2].description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium">7-Day Score</span>
                  <span className="font-black text-amber-800 dark:text-amber-400">{topThree[2].sevenDayScore} pts</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium">Weekly Growth</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">+{topThree[2].growthRate}% velocity</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => triggerConfetti(e, topThree[2])}
                    className="h-10 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{topThree[2].upvotes}</span>
                  </button>

                  <button
                    onClick={(e) => handleShare(e, topThree[2])}
                    className="h-10 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                    title="Share community invite link"
                  >
                    {copiedGroupId === topThree[2].id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                  </button>

                  <a
                    href={getGroupJoinPath(topThree[2])}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onJoinClick(topThree[2])}
                    className={`h-10 px-1 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1 shadow-xs whitespace-nowrap active:scale-95 cursor-pointer ${getPlatformJoinButtonClasses(topThree[2].platform)}`}
                  >
                    <span>Join</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contenders Leaderboard Table (Ranks #1 to #50) - With Space in Between Item Boxes */}
      <div className="space-y-4">
        
        {/* Table Title Bar */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              All 7-Day Community Rankings (1 to {rankedGroups.length})
            </h3>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            One vote per person • Real-time scoring
          </span>
        </div>

        {/* Individual Item Boxes with Space in Between */}
        <div className="space-y-3 sm:space-y-3.5">
          {rankedGroups.map((group, index) => {
            const rank = index + 1;
            const badge = getRankBadgeColor(rank);

            return (
              <div
                key={group.id}
                onClick={() => onOpenDetails(group)}
                className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all hover:shadow-md cursor-pointer select-none bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800/80 shadow-2xs hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  
                  {/* Left Column: Rank + Image + Title + Meta Chips */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black shrink-0 ${badge.bg}`}>
                      #{rank}
                    </span>

                    <div className="relative shrink-0">
                      <img
                        src={optimizeImageUrl(group.imageUrl, 96, 75, group.category, group.title, false)}
                        alt={group.title}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
                        onError={(e) => {
                          e.currentTarget.src = getCategoryFallbackImage(group.category, false, group.title);
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
                          className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer"
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

                  {/* Right Column: 7d Metrics + Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2.5 sm:pt-0 border-t sm:border-0 border-neutral-100 dark:border-neutral-800">
                    
                    {/* 7d Score & Breakdown */}
                    <div className="flex items-center justify-between sm:flex-col sm:items-end text-left sm:text-right pr-1">
                      <div className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                        {group.sevenDayScore} pts
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2 font-medium">
                        <span title="7-Day Joins">👥 +{group.clicks || 0}</span>
                        <span title="Upvotes">👍 +{group.upvotes || 0}</span>
                        <span title="Shares">🚀 +{group.shares || 0}</span>
                      </div>
                    </div>

                    {/* Touch-Friendly Action Buttons: 3-Column Grid on Mobile */}
                    <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Upvote Button */}
                      {(() => {
                        const isUpvoted = upvotedIds.includes(group.id);
                        return (
                          <button
                            onClick={(e) => triggerConfetti(e, group)}
                            title={isUpvoted ? 'You upvoted this community (Click to remove)' : 'Upvote this community'}
                            className={`h-10 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 border cursor-pointer flex items-center justify-center gap-1.5 ${
                              isUpvoted
                                ? 'bg-amber-500 text-amber-950 border-amber-400 shadow-xs font-black'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200/80 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                            }`}
                          >
                            <ArrowUp className={`w-3.5 h-3.5 ${isUpvoted ? 'stroke-[2.5]' : ''}`} />
                            <span>{group.upvotes}</span>
                          </button>
                        );
                      })()}

                      {/* Share Button */}
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

                      {/* Join Button */}
                      <a
                        href={getGroupJoinPath(group)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onJoinClick(group)}
                        className={`h-10 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 whitespace-nowrap ${getPlatformJoinButtonClasses(group.platform)}`}
                      >
                        <span>Join</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transparent 7-Day Ranking Formula & Weekly Reset Rules Box */}
      <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base sm:text-lg font-bold">
            Transparent 7-Day Leaderboard Formula & Contest Rules
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Share2 className="w-4 h-4" />
              <span>Shares: +6.0 Pts</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Each unique link share to external social media or messaging platforms adds 6 points.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <ArrowUp className="w-4 h-4" />
              <span>Upvotes: +3.0 Pts</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Unique upvotes contribute 3 points to the community's weekly ranking.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>Weekly Joins: +2.0 Pts</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Each verified visitor click to join the group awards 2 points.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
            <div className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Weekly Reset</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Scores reset every Monday at 00:00 UTC so new and rising communities always have a fair chance.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

