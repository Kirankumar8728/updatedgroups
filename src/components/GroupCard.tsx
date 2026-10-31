'use client';
import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  ExternalLink, 
  ArrowUp, 
  Bookmark, 
  CheckCircle2, 
  Flame, 
  TrendingUp, 
  Share2, 
  Globe, 
  Languages, 
  ShieldCheck, 
  Tag,
  Award,
  AlertTriangle,
  Pin,
  Clock,
  Zap,
  Check,
  Copy,
  Star,
  Calendar,
  User,
  Crown
} from 'lucide-react';
import { Group } from '../types';
import { 
  PLATFORM_CONFIGS, 
  formatMemberCount, 
  isAdultGroup, 
  getJoinButtonLabel, 
  getPlatformJoinButtonClasses,
  isGroupCurrentlySticky, 
  getRemainingStickyTime,
  get24HourCycleExpiration,
  getGroupUrlPath,
  formatPublishedDate,
  getAuthorName,
  optimizeImageUrl,
  getCommunityFallbackAvatar,
  getCategoryFallbackImage,
  categoryToSlug,
  tagToSlug,
  getPlatformListingUrl,
  getRedditDisplayTitle,
  getRedditCommunitySubtitle
} from '../utils/helpers';
import { PlatformIcon } from './PlatformIcon';
import { fireConfetti } from '../utils/confetti';

interface GroupCardProps {
  group: Group;
  rank?: number;
  isBookmarked: boolean;
  isUpvoted?: boolean;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (group: Group) => void;
  onToggleBookmark: (group: Group) => void;
  onUpvote: (group: Group) => void;
  onJoinClick: (group: Group) => void;
  onOpenDetails: (group: Group) => void;
  onSelectTag: (tag: string) => void;
  onBoostClick?: (group: Group) => void;
  joinButtonLabel?: string;
}

const GroupCardComponent: React.FC<GroupCardProps> = ({
  group,
  rank,
  isBookmarked,
  isUpvoted = false,
  selectable = false,
  isSelected = false,
  onToggleSelect,
  onToggleBookmark,
  onUpvote,
  onJoinClick,
  onOpenDetails,
  onSelectTag,
  onBoostClick,
  joinButtonLabel,
}) => {
  const platformConfig = PLATFORM_CONFIGS[group.platform] || PLATFORM_CONFIGS.other;
  const isAdult = isAdultGroup(group);
  const isSticky = isGroupCurrentlySticky(group);
  const stickyTimer = getRemainingStickyTime(group.stickyUntil);
  const joinButtonClasses = getPlatformJoinButtonClasses(group.platform);
  const publishedLabel = typeof formatPublishedDate === 'function' ? formatPublishedDate(group.publishedAt || group.createdAt) : 'Recently';
  const authorLabel = typeof getAuthorName === 'function' ? getAuthorName(group.authorName) : (group.authorName || 'Anonymous Visitor');

  const isLcpCandidate = typeof rank === 'number' && rank <= 2;
  const optimizedBanner = optimizeImageUrl(group.bannerUrl || group.imageUrl, 640, 80, group.category, group.title, true);
  const optimizedAvatar = optimizeImageUrl(group.imageUrl, 160, 75, group.category, group.title, false);
  const dailyExpiration = get24HourCycleExpiration();

  const [isCopied, setIsCopied] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectable && onToggleSelect) {
      e.stopPropagation();
      onToggleSelect(group);
      return;
    }
    onOpenDetails(group);
  };

  const handleWebShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const urlPath = getGroupUrlPath(group);
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${urlPath}` : group.url;
    const shareData = {
      title: `${group.title} | Group Links`,
      text: `Join "${group.title}" community on ${PLATFORM_CONFIGS[group.platform]?.name || group.platform}!`,
      url: fullUrl,
    };

    const rect = e.currentTarget.getBoundingClientRect();
    fireConfetti({
      particleCount: 25,
      spread: 45,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight
      },
      colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899']
    });

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2200);
      }
      fetch(`/api/groups/${group.id}/share`, { method: 'POST' }).catch(() => {});
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Failed to invoke Web Share API:', err);
      }
    }
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const urlPath = getGroupUrlPath(group);
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${urlPath}` : group.url;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = fullUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);

      // Confetti burst on copy
      const rect = e.currentTarget.getBoundingClientRect();
      fireConfetti({
        particleCount: 20,
        spread: 40,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight
        },
        colors: ['#6366f1', '#10b981', '#f59e0b']
      });

      // Track share interaction asynchronously
      fetch(`/api/groups/${group.id}/share`, { method: 'POST' }).catch(() => {});
    } catch (err) {
      console.error('Failed to copy group link:', err);
    }
  };

  const handleUpvoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Confetti effect from clicked element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    
    fireConfetti({
      particleCount: 25,
      spread: 45,
      origin: { x, y },
      colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899']
    });

    onUpvote(group);
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleBookmark(group);
  };

  return (
    <div 
      id={`group_card_${group.id}`}
      data-group-card="true"
      onClick={handleCardClick}
      suppressHydrationWarning
      className={`group relative flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md'
          : group.isDailyTopRanked
          ? 'border-amber-400 dark:border-amber-500/90 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10 bg-gradient-to-b from-amber-50/20 via-white to-white dark:from-amber-950/20 dark:via-neutral-900 dark:to-neutral-900'
          : isSticky 
          ? 'border-amber-400 dark:border-amber-500/80 ring-2 ring-amber-400/20 shadow-md shadow-amber-500/10' 
          : 'border-neutral-200/80 dark:border-neutral-800/80 hover:border-indigo-400 dark:hover:border-indigo-600/80 shadow-sm hover:shadow-xl hover:shadow-indigo-950/5'
      } transition-all duration-300 overflow-hidden cursor-pointer`}
    >
      {/* Top Banner / Color Accent with Group Icon behind */}
      <div className="relative h-20 w-full overflow-hidden bg-neutral-950">
        <img
          src={optimizedBanner || optimizedAvatar}
          alt={group.title}
          loading={isLcpCandidate ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isLcpCandidate ? "high" : "auto"}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 blur-[1.5px] opacity-75"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.retried) {
              target.dataset.retried = 'true';
              target.src = getCategoryFallbackImage(group.category, true, group.title);
            } else {
              target.onerror = null;
              target.src = getCommunityFallbackAvatar(group.title, group.platform, group.id);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/85 via-neutral-900/35 to-transparent" />

        {/* Selection Checkbox & Platform Badge Overlay */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          {selectable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleSelect) onToggleSelect(group);
              }}
              className={`w-6 h-6 rounded-lg flex items-center justify-center border shadow-md transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 border-indigo-500 text-white ring-2 ring-indigo-400/40 scale-105'
                  : 'bg-white/90 dark:bg-neutral-900/90 border-neutral-300 dark:border-neutral-700 text-transparent hover:border-indigo-400'
              }`}
            >
              <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          )}
          <Link
            href={getPlatformListingUrl(group.platform)}
            prefetch={false}
            onClick={(e) => e.stopPropagation()}
            title={`Browse all ${platformConfig.name} communities`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-md transition-transform hover:scale-105 cursor-pointer ${platformConfig.badgeClass}`}
          >
            <PlatformIcon platform={group.platform} className="w-3.5 h-3.5" />
            <span>{platformConfig.name}</span>
          </Link>
          {isAdult && (
            <Link
              href="/adult-groups"
              prefetch={false}
              onClick={(e) => e.stopPropagation()}
              title="Browse Adult 18+ communities"
              className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-transform hover:scale-105 cursor-pointer"
            >
              🔞 18+
            </Link>
          )}
        </div>

        {/* Badges: 24H Top Ranked Champion & Sticky Promoted & Growth & Featured */}
        <div className="absolute top-2.5 right-2.5 flex flex-col sm:flex-row items-end sm:items-center gap-1" suppressHydrationWarning>
          {group.isDailyTopRanked && (
            <span 
              title="24-Hour Top Ranked Group: Crowned #1 today for highest shares, joins, upvotes & activity!"
              suppressHydrationWarning
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-amber-950 shadow-md animate-pulse"
            >
              <Crown className="w-3 h-3 fill-amber-950 text-amber-950" />
              <span>24H Top Ranked</span>
              <span className="text-[9px] bg-black/15 px-1 py-0.2 rounded font-mono" suppressHydrationWarning>
                {isMounted ? dailyExpiration.formatted : '24H left'}
              </span>
            </span>
          )}
          {isSticky && !group.isDailyTopRanked && (
            <span 
              title={stickyTimer.formatted}
              suppressHydrationWarning
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md animate-pulse"
            >
              <Pin className="w-3 h-3 fill-white" />
              <span>Sticky Promoted</span>
              <span className="text-[9px] bg-black/30 px-1 py-0.2 rounded font-mono" suppressHydrationWarning>
                {isMounted ? stickyTimer.formatted : 'Pinned'}
              </span>
            </span>
          )}
          {group.growthRate > 15 && !isSticky && !group.isDailyTopRanked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500 text-white shadow-sm">
              <TrendingUp className="w-3 h-3" />
              <span>+{group.growthRate}% 7d</span>
            </span>
          )}
          {group.featured && !isSticky && !group.isDailyTopRanked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-sm">
              <Flame className="w-3 h-3 fill-white" />
              <span>Featured</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        
        <div>
          {/* Avatar and Verification */}
          <div className="flex items-start justify-between -mt-10 mb-3 relative z-10">
            <div className="relative">
              <img
                src={optimizedAvatar}
                alt={group.title}
                loading={isLcpCandidate ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={isLcpCandidate ? "high" : "auto"}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-neutral-900 shadow-md bg-neutral-200 dark:bg-neutral-800"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.retried) {
                    target.dataset.retried = 'true';
                    target.src = getCategoryFallbackImage(group.category, false, group.title);
                  } else {
                    target.onerror = null;
                    target.src = getCommunityFallbackAvatar(group.title, group.platform, group.id);
                  }
                }}
              />
              {group.verified && (
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-900 rounded-full p-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                </div>
              )}
            </div>

            {/* Rank and Bookmark Indicators */}
            <div className="flex items-center gap-1.5 mt-6" suppressHydrationWarning>
              {typeof rank === 'number' && rank > 0 ? (
                <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  #{rank}
                </span>
              ) : null}
              {/* Bookmark Button */}
              <button
                key="btn-bookmark"
                type="button"
                onClick={handleBookmarkClick}
                aria-label="Bookmark group"
                title={isBookmarked ? "Remove from saved bookmarks" : "Save to bookmarks"}
                className={`p-1.5 rounded-xl border transition-colors active:scale-95 cursor-pointer ${
                  isBookmarked
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
            <Link
              href={getGroupUrlPath(group)}
              prefetch={false}
              onClick={(e) => {
                // If user clicks normally without modifier keys, open modal or navigate
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  e.preventDefault();
                  onOpenDetails(group);
                }
              }}
              className="hover:underline"
            >
              {group.platform === 'reddit' ? getRedditDisplayTitle(group) : group.title}
            </Link>
          </h3>

          {/* Dedicated Reddit Subtitle */}
          {group.platform === 'reddit' && (
            <p className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 line-clamp-1 mt-0.5">
              {getRedditCommunitySubtitle(group)}
            </p>
          )}

          {/* Truncated Description with Read More */}
          <div className="mt-1.5">
            <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
              {group.description}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(group);
              }}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5 inline-flex items-center gap-0.5"
            >
              <span>Read full description</span>
              <span>→</span>
            </button>
          </div>

          {/* Category, Language & Region Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <Link
              href={isAdult ? '/adult-groups' : `/categories/${categoryToSlug(group.category)}`}
              prefetch={false}
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all hover:scale-105 ${
                isAdult 
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              {group.category}
            </Link>

            {group.language && group.language !== 'All / Multilingual' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/50">
                <Languages className="w-3 h-3" />
                <span>{group.language}</span>
              </span>
            )}

            {group.region && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                <Globe className="w-3 h-3" />
                <span>{group.region}</span>
              </span>
            )}
          </div>

          {/* 24-Hour Top Ranked Daily Champion Highlights */}
          {group.isDailyTopRanked && (
            <div className="mt-2.5 p-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-500/15 border border-amber-300/80 dark:border-amber-600/80 flex items-center justify-between text-[11px] shadow-xs">
              <div className="flex items-center gap-1 font-black text-amber-900 dark:text-amber-200">
                <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
                <span>Today's #1</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200 font-bold text-[10px]" suppressHydrationWarning>
                <span title="Total Group Shares">🚀 {group.shares || 0} shares</span>
                <span>•</span>
                <span title="Total Joinings">⚡ {group.clicks} joins</span>
                <span>•</span>
                <span title="Total Upvotes">👍 {group.upvotes} upvotes</span>
              </div>
            </div>
          )}

          {/* Custom Tags */}
          {group.customTags && group.customTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {group.customTags.slice(0, 3).map((tag, idx) => {
                const cleanTagSlug = tagToSlug(tag) || tag.replace(/^#+/, '').toLowerCase();
                return (
                  <Link
                    key={idx}
                    href={`/tag/${cleanTagSlug}`}
                    prefetch={false}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-1.5 py-0.5 rounded transition-colors"
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </Link>
                );
              })}
              {group.customTags.length > 3 && (
                <span className="text-[10px] text-neutral-400 self-center">
                  +{group.customTags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer Metrics & Actions */}
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5" suppressHydrationWarning>
          
          {/* Published Date & Author Attribution */}
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400" suppressHydrationWarning>
            <div className="flex items-center gap-1 min-w-0" title={`Published on ${publishedLabel}`} suppressHydrationWarning>
              <Calendar className="w-3 h-3 text-neutral-400 shrink-0" />
              <span className="truncate" suppressHydrationWarning>{publishedLabel}</span>
            </div>
            <div className="flex items-center gap-1 min-w-0" title={`Submitted by ${authorLabel}`} suppressHydrationWarning>
              <User className="w-3 h-3 text-neutral-400 shrink-0" />
              <span className="truncate max-w-[130px]" suppressHydrationWarning>{authorLabel}</span>
            </div>
          </div>

          {/* Top Stat Row: Members, Clicks, Rating & 1-Per-Person Upvote */}
          <div className="flex items-center justify-between gap-2" suppressHydrationWarning>
            <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-neutral-500 dark:text-neutral-400" suppressHydrationWarning>
              <div className="flex items-center gap-1 font-medium" title="Estimated Members" suppressHydrationWarning>
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                <span suppressHydrationWarning>{formatMemberCount(group.memberCount)}</span>
              </div>
              <div className="flex items-center gap-1 font-medium" title="Total Join Link Clicks" suppressHydrationWarning>
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                <span suppressHydrationWarning>{formatMemberCount(group.clicks)}</span>
              </div>
              <button
                onClick={handleWebShare}
                title="Share this community via system menu"
                className="flex items-center gap-1 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                suppressHydrationWarning
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-500 hover:scale-110 transition-transform" />
                <span suppressHydrationWarning>{formatMemberCount(group.shares || 0)}</span>
              </button>
              {/* Group Rating Badge */}
              <div 
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-200/60 dark:border-amber-800/60" 
                title={`Average Rating: ${(group.rating || 0).toFixed(1)} / 5 (${group.ratingCount || 0} ratings)`}
                suppressHydrationWarning
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                <span suppressHydrationWarning>{(group.rating || 0).toFixed(1)}</span>
                <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 font-normal" suppressHydrationWarning>({group.ratingCount || 0})</span>
              </div>
            </div>

            {/* Upvote Button (1 vote per person) */}
            <button
              onClick={handleUpvoteClick}
              aria-label="Upvote community"
              title={isUpvoted ? 'You upvoted this community (Click to remove)' : 'Upvote this community'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 border cursor-pointer ${
                isUpvoted
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
              suppressHydrationWarning
            >
              <ArrowUp className={`w-3.5 h-3.5 ${isUpvoted ? 'stroke-[2.5] text-indigo-600 dark:text-indigo-400' : ''}`} />
              <span suppressHydrationWarning>{group.upvotes}</span>
              {isUpvoted && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold ml-0.5" suppressHydrationWarning>
                  Voted
                </span>
              )}
            </button>
          </div>

          {/* Dedicated Bottom Action Bar: Promote and Platform-Coloured Join Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {onBoostClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBoostClick(group);
                }}
                title="Promote this group to top pinned spot"
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl text-xs font-black text-amber-950 dark:text-amber-100 bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-amber-950 dark:fill-amber-100" />
                <span>Promote</span>
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onJoinClick(group);
              }}
              className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm whitespace-nowrap cursor-pointer ${joinButtonClasses} ${!onBoostClick ? 'col-span-2' : ''}`}
            >
              <span>{joinButtonLabel || getJoinButtonLabel(group.platform)}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export const GroupCard = React.memo(GroupCardComponent, (prev, next) => {
  return (
    prev.group.id === next.group.id &&
    prev.group.upvotes === next.group.upvotes &&
    prev.group.clicks === next.group.clicks &&
    prev.group.shares === next.group.shares &&
    prev.group.isSticky === next.group.isSticky &&
    prev.group.stickyUntil === next.group.stickyUntil &&
    prev.group.isDailyTopRanked === next.group.isDailyTopRanked &&
    prev.group.rating === next.group.rating &&
    prev.group.ratingCount === next.group.ratingCount &&
    prev.group.comments?.length === next.group.comments?.length &&
    prev.isBookmarked === next.isBookmarked &&
    prev.isUpvoted === next.isUpvoted &&
    prev.selectable === next.selectable &&
    prev.isSelected === next.isSelected &&
    prev.rank === next.rank &&
    prev.joinButtonLabel === next.joinButtonLabel &&
    Boolean(prev.onBoostClick) === Boolean(next.onBoostClick)
  );
});

