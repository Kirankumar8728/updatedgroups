'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowUp, 
  Bookmark, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  Share2, 
  Tag, 
  Plus, 
  Globe, 
  Languages, 
  CheckCircle2, 
  Sparkles, 
  Flame,
  AlertTriangle,
  Zap,
  Calendar,
  User,
  Coins,
  Crown
} from 'lucide-react';
import { Group } from '../types';
import { GroupReviewsAndComments } from './GroupReviewsAndComments';
import { GroupReportSection } from './GroupReportSection';
import { 
  PLATFORM_CONFIGS, 
  formatMemberCount, 
  calculatePopularityScore, 
  getJoinButtonLabel,
  getPlatformJoinButtonClasses,
  getPlatformEntityLabel,
  isBotCommunity,
  hasUserUpvotedGroup,
  isGroupCurrentlySticky,
  get24HourCycleExpiration,
  formatPublishedDate,
  getAuthorName,
  optimizeImageUrl,
  getCommunityFallbackAvatar,
  getCategoryFallbackImage,
  resolveValidGroupImage,
  getGroupUrlPath,
  getGroupRulesPath,
  getGroupJoinPath,
  getNumericGroupId,
  isAdultGroup,
  categoryToSlug,
  tagToSlug,
  getPlatformListingUrl,
  getRedditDisplayTitle,
  getRedditCommunitySubtitle
} from '../utils/helpers';
import { fireConfetti } from '../utils/confetti';
import { PlatformIcon } from './PlatformIcon';
import { AdultConsentModal } from './AdultConsentModal';

interface GroupDetailModalProps {
  group: Group | null;
  isOpen: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (group: Group) => void;
  onUpvote: (group: Group) => void;
  onJoinClick: (group: Group) => void;
  onAddTag: (groupId: string, tag: string) => void;
  onBoostClick?: (group: Group) => void;
  onClaimClick?: (group: Group) => void;
  onPromoteCreditsClick?: (group: Group) => void;
}

export const GroupDetailModal: React.FC<GroupDetailModalProps> = ({
  group,
  isOpen,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onUpvote,
  onJoinClick,
  onAddTag,
  onBoostClick,
  onClaimClick,
  onPromoteCreditsClick,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !group) return null;

  const platformConfig = PLATFORM_CONFIGS[group.platform] || PLATFORM_CONFIGS.other;
  const popularity = calculatePopularityScore(group.clicks, group.upvotes, group.memberCount, group.growthRate);

  const getWebsiteGroupUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${getGroupUrlPath(group)}`;
    }
    return `https://grouplinks.app${getGroupUrlPath(group)}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getWebsiteGroupUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShare = async () => {
    // Record share count on server
    try {
      fetch(`/api/groups/${group.id}/share`, { method: 'POST' }).catch(() => {});
    } catch {
      // ignore
    }

    const websiteUrl = getWebsiteGroupUrl();

    if (navigator.share) {
      try {
        await navigator.share({
          title: group.title,
          text: `Join the ${group.title} community on GroupLinks!`,
          url: websiteUrl,
        });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleUpvote = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    fireConfetti({
      particleCount: 35,
      spread: 60,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight
      }
    });
    onUpvote(group);
  };

  const isAdult = isAdultGroup(group);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {isAdult && (
        <AdultConsentModal 
          onAccept={() => {}} 
          onDecline={() => onClose()} 
        />
      )}
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-8">
        
        {/* Banner with Group Icon placed behind */}
        <div className="relative h-24 sm:h-32 w-full overflow-hidden bg-neutral-950">
          <img
            src={resolveValidGroupImage(group.bannerUrl || group.imageUrl, group.category, group.title, true)}
            alt={group.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover blur-[2px] opacity-75 scale-105"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = getCategoryFallbackImage(group.category, true, group.title);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-neutral-900 via-neutral-900/40 to-transparent" />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors z-20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header Bar */}
        <div className="px-6 pb-6 pt-0 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800/80 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Avatar & Title */}
            <div className="flex items-center gap-4 -mt-8 sm:-mt-10 relative z-10">
              <div className="relative shrink-0">
                <img
                  src={resolveValidGroupImage(group.imageUrl, group.category, group.title, false)}
                  alt={group.title}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-4 border-white dark:border-neutral-900 shadow-xl bg-neutral-100 dark:bg-neutral-800"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.retried) {
                      target.dataset.retried = 'true';
                      target.src = `/api/avatar/${encodeURIComponent(String(group.id))}`;
                    } else {
                      target.onerror = null;
                      target.src = getCategoryFallbackImage(group.category, false, group.title);
                    }
                  }}
                />
                {group.verified && (
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-900 rounded-full p-0.5 shadow-md">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={getPlatformListingUrl(group.platform)}
                    onClick={onClose}
                    title={`Browse all ${platformConfig.name} communities`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs transition-transform hover:scale-105 cursor-pointer ${platformConfig.badgeClass}`}
                  >
                    <PlatformIcon platform={group.platform} className="w-3.5 h-3.5" />
                    <span>{getPlatformEntityLabel(group.platform, isBotCommunity(group))}</span>
                  </Link>
                  {group.isClaimed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span>Verified Owner</span>
                    </span>
                  ) : onClaimClick ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onClaimClick(group);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3 text-indigo-500" />
                      <span>Claim Ownership</span>
                    </button>
                  ) : null}
                  {group.featured && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white shadow-xs">
                      <Flame className="w-3 h-3 fill-white" />
                      <span>Featured</span>
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white leading-tight break-words">
                  {group.platform === 'reddit' ? getRedditDisplayTitle(group) : group.title}
                </h2>
                {group.platform === 'reddit' && (
                  <p className="text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                    {getRedditCommunitySubtitle(group)}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpvote}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 transition-all border border-neutral-200 dark:border-neutral-700"
              >
                <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />
                <span>{group.upvotes}</span>
              </button>

              <button
                onClick={() => onToggleBookmark(group)}
                className={`p-2 rounded-xl border transition-colors ${
                  isBookmarked
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
              </button>

              <button
                onClick={handleShare}
                className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-colors"
                aria-label="Share group"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          
          {/* Metadata Pills */}
          <div className="flex flex-wrap items-center gap-2" suppressHydrationWarning>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300" suppressHydrationWarning>
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span suppressHydrationWarning>Published: {formatPublishedDate(group.publishedAt || group.createdAt)}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50" suppressHydrationWarning>
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span suppressHydrationWarning>By {getAuthorName(group.authorName)}</span>
            </span>

            <Link
              href={isAdultGroup(group) ? '/adult-groups' : `/categories/${categoryToSlug(group.category)}`}
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-all hover:scale-105 cursor-pointer"
            >
              {group.category}
            </Link>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/50">
              <Languages className="w-3.5 h-3.5" />
              <span>{group.language}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
              <Globe className="w-3.5 h-3.5" />
              <span>{group.region}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Safety: {group.safetyScore}%</span>
            </span>
          </div>

          {/* Community Overview Description */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Community Overview</span>
            </h4>
            {group.description ? (
              <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal whitespace-pre-line">
                {group.description}
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 italic">
                No description provided yet for this community. Join the group to connect and chat.
              </p>
            )}
            {/* Publication Date & Author Attribution */}
            <div className="mt-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex flex-wrap items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 gap-2" suppressHydrationWarning>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-neutral-400" />
                <span suppressHydrationWarning>Published: <strong>{formatPublishedDate(group.publishedAt || group.createdAt)}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-neutral-400" />
                <span suppressHydrationWarning>By: <strong>{getAuthorName(group.authorName)}</strong></span>
              </div>
            </div>

            {/* Promoted Active Direct Link Notice */}
            {isGroupCurrentlySticky(group) && (
              <div className="mt-2 pt-2 border-t border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5 font-bold">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                <span>⚡ Promoted Active: Direct instant join enabled</span>
              </div>
            )}
          </div>

          {/* 24-Hour Top Ranked Champion Card */}
          {group.isDailyTopRanked && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-yellow-500/20 border border-amber-400 dark:border-amber-600/80 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center font-black shadow-xs">
                    <Crown className="w-5 h-5 fill-amber-950" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-950 dark:text-amber-200">
                      👑 24-Hour Top Ranked Champion
                    </h4>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                      Holding #3 directory placement today with top shares, joins, and upvotes.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500 text-amber-950 shadow-xs" suppressHydrationWarning>
                  Expires in {get24HourCycleExpiration().formatted}
                </span>
              </div>
            </div>
          )}

          {/* Rank Performance & Ranking Scorecard */}
          <div className="mt-4 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                  Rank Engine Indexing
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-indigo-600 text-white shadow-xs">
                Grade: {group.rankGrade || 'A+'} ({group.rankScore || 92}/100)
              </span>
            </div>
            
            {group.rankKeywords && group.rankKeywords.length > 0 && (
              <div className="mt-2.5">
                <span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
                  Target Search Keywords:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {group.rankKeywords.map((kw, i) => {
                    const cleanSlug = tagToSlug(kw) || kw.toLowerCase();
                    return (
                      <Link
                        key={i}
                        href={`/tag/${cleanSlug}`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-neutral-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-transform hover:scale-105 cursor-pointer"
                      >
                        #{kw}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Metrics Overview Grid (4 Columns) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 text-center">
              <div className="text-[11px] text-neutral-500">Estimated Reach</div>
              <div className="text-lg font-extrabold text-neutral-900 dark:text-white mt-0.5">
                {formatMemberCount(group.memberCount)}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Active Members</div>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 text-center">
              <div className="text-[11px] text-neutral-500">Total Joins</div>
              <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {formatMemberCount(group.clicks)}
              </div>
              <div className="text-[10px] text-neutral-400">Join Clicks</div>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 text-center">
              <div className="text-[11px] text-neutral-500">Group Shares</div>
              <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {formatMemberCount(group.shares || 0)}
              </div>
              <div className="text-[10px] text-neutral-400">Viral Shares</div>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 text-center">
              <div className="text-[11px] text-neutral-500">Upvotes</div>
              <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                {group.upvotes}
              </div>
              <div className="text-[10px] text-neutral-400">Community Votes</div>
            </div>
          </div>

          {/* Custom Community Tags & Tag Contributor */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span>Community Tags</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {group.customTags.map((tag, idx) => {
                const cleanSlug = tagToSlug(tag) || tag.replace(/^#+/, '').toLowerCase();
                return (
                  <Link
                    key={idx}
                    href={`/tag/${cleanSlug}`}
                    onClick={onClose}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-all hover:scale-105 cursor-pointer"
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Rating & Comments System */}
          <div className="mt-6 border-t border-neutral-100 dark:border-neutral-800/80 pt-4">
            <GroupReviewsAndComments group={group} />
          </div>

          {/* Report Option */}
          <div className="mt-4">
            <GroupReportSection group={group} />
          </div>

          {/* Bottom Action CTAs */}
          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopy}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Promote Buttons (Credits / Cashfree) */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onPromoteCreditsClick && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPromoteCreditsClick(group);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Spend Credits</span>
                </button>
              )}

              {onBoostClick && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onBoostClick(group);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-neutral-950 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-neutral-950" />
                  <span>Promote</span>
                </button>
              )}
            </div>

            {/* 3-Step Gateway Redirect Join Button */}
            <button
              onClick={() => {
                onClose();
                onJoinClick(group);
              }}
              className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-extrabold shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${getPlatformJoinButtonClasses(group.platform)}`}
            >
              <span>{getJoinButtonLabel(group.platform, isBotCommunity(group))}</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          {/* Direct Join Gateway Footer Links */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400">
            <Link
              href={getGroupRulesPath(group)}
              onClick={onClose}
              title={`/rules?join-id=${getNumericGroupId(group)}`}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors flex items-center gap-1"
            >
              <span>Rules & Guidelines</span>
              <span className="font-mono opacity-80">(/rules?join-id={getNumericGroupId(group)})</span>
            </Link>
            <Link
              href={getGroupJoinPath(group)}
              onClick={onClose}
              title={`/join?join-id=${getNumericGroupId(group)}`}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors font-semibold flex items-center gap-1"
            >
              <span>Direct Join Gateway</span>
              <span className="font-mono opacity-80">(/join?join-id={getNumericGroupId(group)})</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
