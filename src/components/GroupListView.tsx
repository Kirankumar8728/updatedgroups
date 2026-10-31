'use client';
import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  ExternalLink, 
  ArrowUp, 
  Bookmark, 
  CheckCircle2, 
  TrendingUp, 
  Globe, 
  Languages,
  Award,
  AlertTriangle,
  Pin,
  Zap,
  Check,
  Copy,
  Star,
  Calendar,
  User,
  Crown,
  Share2,
  Flame
} from 'lucide-react';
import { Group } from '../types';
import { 
  PLATFORM_CONFIGS, 
  formatMemberCount, 
  isAdultGroup, 
  getJoinButtonLabel, 
  getPlatformJoinButtonClasses,
  hasUserUpvotedGroup,
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
  getPlatformListingUrl
} from '../utils/helpers';
import { PlatformIcon } from './PlatformIcon';
import { fireConfetti } from '../utils/confetti';

interface GroupListViewProps {
  groups: Group[];
  bookmarkedIds: Set<string>;
  upvotedIds?: string[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (group: Group) => void;
  onToggleBookmark: (group: Group) => void;
  onUpvote: (group: Group) => void;
  onJoinClick: (group: Group) => void;
  onOpenDetails: (group: Group) => void;
  onBoostClick?: (group: Group) => void;
}

const GroupListViewComponent: React.FC<GroupListViewProps> = ({
  groups,
  bookmarkedIds,
  upvotedIds,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleBookmark,
  onUpvote,
  onJoinClick,
  onOpenDetails,
  onBoostClick,
}) => {
  const [copiedGroupId, setCopiedGroupId] = React.useState<string | null>(null);

  const handleWebShare = async (group: Group, e: React.MouseEvent) => {
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
        setCopiedGroupId(group.id);
        setTimeout(() => setCopiedGroupId(null), 2200);
      }
      fetch(`/api/groups/${group.id}/share`, { method: 'POST' }).catch(() => {});
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Failed to invoke Web Share API:', err);
      }
    }
  };

  const handleCopyLink = async (group: Group, e: React.MouseEvent) => {
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

      setCopiedGroupId(group.id);
      setTimeout(() => setCopiedGroupId(null), 2200);

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

      fetch(`/api/groups/${group.id}/share`, { method: 'POST' }).catch(() => {});
    } catch (err) {
      console.error('Failed to copy group link:', err);
    }
  };
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
      {groups.map((group, index) => {
        const platformConfig = PLATFORM_CONFIGS[group.platform] || PLATFORM_CONFIGS.other;
        const isBookmarked = bookmarkedIds.has(group.id);
        const isUpvoted = upvotedIds ? upvotedIds.includes(group.id) : false;
        const isSelected = selectedIds ? selectedIds.has(group.id) : false;
        const isAdult = isAdultGroup(group);
        const isSticky = isGroupCurrentlySticky(group);
        const stickyTimer = getRemainingStickyTime(group.stickyUntil);
        const joinButtonClasses = getPlatformJoinButtonClasses(group.platform);
        const publishedLabel = typeof formatPublishedDate === 'function' ? formatPublishedDate(group.publishedAt || group.createdAt) : 'Recently';
        const authorLabel = typeof getAuthorName === 'function' ? getAuthorName(group.authorName) : (group.authorName || 'Anonymous Visitor');

        const handleRowClick = (e: React.MouseEvent) => {
          if (selectable && onToggleSelect) {
            e.stopPropagation();
            onToggleSelect(group);
            return;
          }
          onOpenDetails(group);
        };

        const isLcpCandidate = index < 4;
        const optimizedImg = optimizeImageUrl(group.imageUrl, 120, 75, group.category, group.title, false);

        const handleUpvote = (e: React.MouseEvent) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          fireConfetti({
            particleCount: 20,
            spread: 40,
            origin: {
              x: (rect.left + rect.width / 2) / window.innerWidth,
              y: (rect.top + rect.height / 2) / window.innerHeight
            }
          });
          onUpvote(group);
        };

        return (
          <React.Fragment key={group.id}>
            <div
              onClick={handleRowClick}
              suppressHydrationWarning
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isSelected
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                  : group.isDailyTopRanked
                  ? 'bg-gradient-to-r from-amber-50/70 via-white to-white dark:from-amber-950/30 dark:via-neutral-900 dark:to-neutral-900 border-l-4 border-amber-500'
                  : isSticky 
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-amber-500' 
                  : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50'
              } transition-colors cursor-pointer`}
            >
            {/* Left: Checkbox, Avatar, Platform badge, Title, Details */}
            <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
              {selectable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleSelect) onToggleSelect(group);
                  }}
                  className={`w-5 h-5 rounded-md shrink-0 flex items-center justify-center border transition-all cursor-pointer mt-1 sm:mt-0 ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 text-white ring-2 ring-indigo-400/40'
                      : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-transparent hover:border-indigo-400'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              )}
              
              {/* Avatar */}
              <div className="relative shrink-0">
                <img
                  src={optimizedImg}
                  alt={group.title}
                  loading={isLcpCandidate ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={isLcpCandidate ? "high" : "auto"}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = getCategoryFallbackImage(group.category, false, group.title);
                  }}
                />
                <Link
                  href={getPlatformListingUrl(group.platform)}
                  prefetch={false}
                  onClick={(e) => e.stopPropagation()}
                  title={`Browse all ${platformConfig.name} communities`}
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-xs transition-transform hover:scale-110 cursor-pointer ${platformConfig.badgeClass}`}
                >
                  <PlatformIcon platform={group.platform} className="w-3 h-3" />
                </Link>
              </div>

              {/* Title, Category & Tags */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white truncate">
                    <Link
                      href={getGroupUrlPath(group)}
                      prefetch={false}
                      onClick={(e) => {
                        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                          e.preventDefault();
                          onOpenDetails(group);
                        }
                      }}
                      className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      {group.title}
                    </Link>
                  </h4>
                  {group.isDailyTopRanked && (
                    <span 
                      title="24-Hour Top Ranked Group: Crowned #1 today for highest shares, joins, upvotes & activity!"
                      suppressHydrationWarning
                      className="px-2 py-0.5 text-[10px] font-black rounded-md bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 flex items-center gap-1 shadow-xs animate-pulse"
                    >
                      <Crown className="w-3 h-3 fill-amber-950" />
                      <span suppressHydrationWarning>24H Top Ranked • {get24HourCycleExpiration().formatted}</span>
                    </span>
                  )}
                  {isSticky && !group.isDailyTopRanked && (
                    <span 
                      title={stickyTimer.formatted}
                      suppressHydrationWarning
                      className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-500 text-white flex items-center gap-1 shadow-xs"
                    >
                      <Pin className="w-3 h-3" />
                      <span suppressHydrationWarning>Promoted • {stickyTimer.formatted}</span>
                    </span>
                  )}
                  {isAdult && (
                    <Link
                      href="/adult-groups"
                      prefetch={false}
                      onClick={(e) => e.stopPropagation()}
                      title="Browse Adult 18+ communities"
                      className="px-2 py-0.2 text-[10px] font-bold rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-transform hover:scale-105 cursor-pointer"
                    >
                      18+ Adult
                    </Link>
                  )}
                  {group.verified && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  {group.growthRate > 15 && !isSticky && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      +{group.growthRate}% 7d
                    </span>
                  )}
                </div>

                <div className="mt-0.5">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                    {group.description}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetails(group);
                    }}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                  >
                    <span>Read full description</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap" suppressHydrationWarning>
                  <Link
                    href={isAdult ? '/adult-groups' : `/categories/${categoryToSlug(group.category)}`}
                    prefetch={false}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-[11px] font-medium px-2 py-0.2 rounded transition-all hover:scale-105 cursor-pointer ${
                      isAdult 
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    {group.category}
                  </Link>

                  {group.customTags && group.customTags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {group.customTags.slice(0, 3).map((tag, idx) => {
                        const cleanTagSlug = tagToSlug(tag) || tag.replace(/^#+/, '').toLowerCase();
                        return (
                          <Link
                            key={idx}
                            href={`/tag/${cleanTagSlug}`}
                            prefetch={false}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-1.5 py-0.2 rounded transition-colors cursor-pointer"
                          >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  {group.language && group.language !== 'All / Multilingual' && (
                    <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                      {group.language}
                    </span>
                  )}
                  {group.region && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      • {group.region}
                    </span>
                  )}
                  <span className="text-[11px] text-neutral-400 inline-flex items-center gap-1" suppressHydrationWarning>
                    <Calendar className="w-3 h-3 text-neutral-400" />
                    <span>{publishedLabel}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 inline-flex items-center gap-1" suppressHydrationWarning>
                    <User className="w-3 h-3 text-neutral-400" />
                    <span>{authorLabel}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Metrics & CTA */}
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
              
              {/* Rating */}
              <div 
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200/60 dark:border-amber-800/60"
                title={`Rating: ${(group.rating || 0).toFixed(1)} / 5 (${group.ratingCount || 0} reviews)`}
                suppressHydrationWarning
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span suppressHydrationWarning>{(group.rating || 0).toFixed(1)}</span>
                <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 font-normal" suppressHydrationWarning>({group.ratingCount || 0})</span>
              </div>

              {/* Members, Joins & Shares */}
              <div className="text-right hidden md:block" suppressHydrationWarning>
                <div className="flex items-center justify-end gap-1 text-xs font-semibold text-neutral-800 dark:text-neutral-200" suppressHydrationWarning>
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  <span suppressHydrationWarning>{formatMemberCount(group.memberCount)}</span>
                </div>
                <div className="text-[10px] text-neutral-500 flex items-center justify-end gap-1.5 mt-0.5" suppressHydrationWarning>
                  <span title="Total Group Shares" suppressHydrationWarning>🚀 {formatMemberCount(group.shares || 0)} shares</span>
                  <span>•</span>
                  <span title="Total Joinings" suppressHydrationWarning>⚡ {formatMemberCount(group.clicks)} joins</span>
                </div>
              </div>

              {/* Promote Button */}
              {onBoostClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBoostClick(group);
                  }}
                  title="Promote this group on Cashfree PG"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black text-amber-950 dark:text-amber-100 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-950 dark:fill-amber-100" />
                  <span>Promote</span>
                </button>
              )}

              {/* Upvote Button (1 per person) */}
              <button
                onClick={handleUpvote}
                aria-label="Upvote"
                title={isUpvoted ? 'You upvoted this community (Click to remove)' : 'Upvote this community'}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 border cursor-pointer ${
                  isUpvoted
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <ArrowUp className={`w-3.5 h-3.5 ${isUpvoted ? 'stroke-[2.5] text-indigo-600 dark:text-indigo-400' : ''}`} />
                <span>{group.upvotes}</span>
              </button>

              {/* Share Button (Native Web Share API) */}
              <button
                onClick={(e) => handleWebShare(group, e)}
                aria-label="Share group"
                title="Share group link via system menu"
                className="p-2 rounded-xl border transition-all active:scale-95 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {/* Copy Link Button */}
              <button
                onClick={(e) => handleCopyLink(group, e)}
                aria-label="Copy link"
                title={copiedGroupId === group.id ? "Link copied to clipboard!" : "Copy group link"}
                className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  copiedGroupId === group.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 scale-105 shadow-xs'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                {copiedGroupId === group.id ? (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Bookmark Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(group);
                }}
                aria-label="Bookmark"
                title={isBookmarked ? "Remove from bookmarks" : "Save to bookmarks"}
                className={`p-2 rounded-xl border transition-colors active:scale-95 cursor-pointer ${
                  isBookmarked
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-neutral-700'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
              </button>

              {/* Join Link Button (triggers 3-step funnel) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJoinClick(group);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all hover:scale-105 active:scale-95 whitespace-nowrap cursor-pointer ${joinButtonClasses}`}
              >
                <span>{getJoinButtonLabel(group.platform)}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 24-Hour Trending Promotions Button below 3rd group in list view */}
          {index === 2 && (
            <div className="flex justify-center py-2">
              <Link
                href="/active24hours"
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
        </React.Fragment>
        );
      })}
    </div>
  );
};

export const GroupListView = React.memo(GroupListViewComponent);
