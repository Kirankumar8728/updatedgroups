'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ArrowRight,
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
  Award,
  Calendar,
  Layers,
  Clock,
  MessageCircle,
  Send,
  Facebook,
  Zap,
  Pin,
  HelpCircle,
  Compass,
  User,
  Crown,
  RefreshCw,
  ShieldAlert,
  Lock,
  Unlock,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';
import { Group } from '../types';
import { 
  PLATFORM_CONFIGS, 
  formatMemberCount, 
  calculatePopularityScore, 
  isAdultGroup, 
  getJoinButtonLabel, 
  getPlatformJoinButtonClasses,
  getPlatformEntityLabel,
  getPlatformPluralLabel,
  getPlatformListingUrl,
  isBotCommunity,
  getUpvotedGroupIds,
  hasUserUpvotedGroup,
  toggleUserUpvoteGroup,
  isGroupCurrentlySticky,
  get24HourCycleExpiration,
  categoryToSlug,
  getGroupUrlPath,
  getGroupRulesPath,
  getGroupJoinPath,
  formatPublishedDate,
  getAuthorName,
  optimizeImageUrl,
  getCommunityFallbackAvatar,
  getCategoryFallbackImage,
  resolveValidGroupImage,
  getRedditDisplayTitle,
  getRedditCommunitySubtitle,
  tagToSlug,
  isGenericGroupTitle
} from '../utils/helpers';
import { fireConfetti } from '../utils/confetti';
import { PlatformIcon } from './PlatformIcon';
import { AdultConsentModal } from './AdultConsentModal';
import { AdDisplay } from './AdDisplay';
import { Breadcrumbs } from './Breadcrumbs';
import { Footer } from './Footer';
import { GroupCard } from './GroupCard';
import { Header } from './Header';
import { AuthModal } from './AuthModal';
import { UserDashboardView } from './UserDashboardView';
import { useAuth } from './AuthProvider';
import { AdminLoginModal } from './AdminLoginModal';
import { AdminDashboardModal } from './AdminDashboardModal';
import { BoostPaymentModal } from './BoostPaymentModal';
import { GroupReviewsAndComments } from './GroupReviewsAndComments';
import { GroupReportSection } from './GroupReportSection';
import { GroupFeedbackModal } from './GroupFeedbackModal';
import { checkAdminSession, clearAdminSession, getAdminAuthHeaders } from '../utils/adminAuth';
import { triggerGroupRescrapeAction } from '@/src/app/actions/rescrape';

interface GroupDetailPageProps {
  group: Group;
  onBack?: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (group: Group) => void;
  onUpvote?: (group: Group) => void;
  onJoinClick?: (group: Group) => void;
  onAddTag?: (groupId: string, tag: string) => void;
  onSelectTag?: (tag: string) => void;
  onBoostClick?: (group: Group) => void;
  relatedGroups?: Group[];
}

export const GroupDetailPage: React.FC<GroupDetailPageProps> = ({
  group: initialGroup,
  onBack,
  isBookmarked: initialIsBookmarked,
  onToggleBookmark,
  onUpvote,
  onJoinClick,
  onAddTag,
  onSelectTag,
  onBoostClick,
  relatedGroups = [],
}) => {
  const [group, setGroup] = useState<Group>(initialGroup);

  React.useEffect(() => {
    setGroup(initialGroup);
  }, [initialGroup]);

  // Client-side self-healing: Only if group title is strictly a raw invite hash or completely missing
  const hasAttemptedScrapeRef = React.useRef(false);
  React.useEffect(() => {
    if (hasAttemptedScrapeRef.current) return;
    const isRawHashTitle = !group.title || isGenericGroupTitle(group.title) || (/^[+]?[a-zA-Z0-9_-]{12,}$/.test(group.title.trim()) && !group.title.includes(' '));
    const isCompletelyMissingImg = !group.imageUrl || group.imageUrl.trim() === '';
    
    // Never trigger scrape on valid SVG data images or groups that already have real titles
    if (isRawHashTitle && isCompletelyMissingImg && group.url) {
      hasAttemptedScrapeRef.current = true;
      fetch('/api/scrape-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: group.url })
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.success && data.title && !isGenericGroupTitle(data.title)) {
            setGroup(prev => ({
              ...prev,
              title: data.title,
              imageUrl: (data.imageUrl && !data.imageUrl.startsWith('data:image/')) ? data.imageUrl : prev.imageUrl,
              bannerUrl: (data.bannerUrl && !data.bannerUrl.startsWith('data:image/')) ? data.bannerUrl : (data.imageUrl || prev.bannerUrl),
              category: (data.suggestedCategory && data.suggestedCategory !== 'General') ? data.suggestedCategory : prev.category,
              description: data.description || prev.description,
            }));
          }
        })
        .catch(() => {});
    }
  }, [group.id, group.url, group.title, group.imageUrl]);
  const { user: currentUser, setUser } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState<boolean>(initialIsBookmarked || false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPageLink, setCopiedPageLink] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  const [activeBoostGroup, setActiveBoostGroup] = useState<Group | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackInitialType, setFeedbackInitialType] = useState<'broken_link' | 'expired_invite' | 'inaccurate_info' | 'spam_or_abuse' | 'feature_suggestion' | 'general_feedback' | 'other'>('broken_link');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [isRescraping, setIsRescraping] = useState(false);
  const [rescrapeNotice, setRescrapeNotice] = useState<string | null>(null);

  const handleAdminRescrape = async () => {
    if (!group || !group.id) return;
    setIsRescraping(true);
    setRescrapeNotice(null);
    try {
      let sessionToken = '';
      if (typeof window !== 'undefined') {
        sessionToken = localStorage.getItem('gl_admin_session') || localStorage.getItem('nexus_admin_session') || 'kiran8728';
      }
      
      // Execute Next.js Server Action
      const actionResult = await triggerGroupRescrapeAction(group.id, sessionToken);
      
      if (actionResult.success && actionResult.updatedGroup) {
        setGroup(actionResult.updatedGroup as Group);
        setRescrapeNotice('✅ Group metadata & icon re-scraped via server action!');
        setTimeout(() => setRescrapeNotice(null), 4000);
        return;
      }

      // Fallback API Route call
      const headers = getAdminAuthHeaders();
      const res = await fetch('/api/admin/rescrape', {
        method: 'POST',
        headers,
        body: JSON.stringify({ groupId: group.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(`Re-scrape failed: ${data.error || actionResult.error || 'Server error'}`);
        return;
      }
      if (data.updatedGroup) {
        setGroup(data.updatedGroup);
        setRescrapeNotice('✅ Group metadata & icon re-scraped and updated live!');
        setTimeout(() => setRescrapeNotice(null), 4000);
      }
    } catch (err: any) {
      alert(`Re-scrape error: ${err.message || 'Network error'}`);
    } finally {
      setIsRescraping(false);
    }
  };

  const handleAdminChangeImage = async () => {
    if (!group || !group.id) return;
    const currentImg = group.imageUrl || '';
    const newUrl = prompt(
      `Enter new image URL or base64 data for "${group.title}".\nIt will be resized to 150x150 WebP and uploaded to Cloudflare R2 (cdn.grouplinks.app):`,
      currentImg.includes('cdn.grouplinks.app') ? currentImg : ''
    );
    if (!newUrl || !newUrl.trim() || newUrl.trim() === currentImg) return;

    try {
      const headers = getAdminAuthHeaders();
      const res = await fetch('/api/admin/rescrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          groupId: group.id,
          action: 'change_image',
          newImageUrl: newUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(`Failed to update image: ${data.error || 'Server error'}`);
        return;
      }
      if (data.updatedGroup) {
        setGroup(data.updatedGroup);
        setRescrapeNotice('✅ Group image updated & uploaded to Cloudflare R2 CDN!');
        setTimeout(() => setRescrapeNotice(null), 4000);
      }
    } catch (err: any) {
      alert(`Error updating image: ${err.message || 'Network error'}`);
    }
  };

  const handleAdminToggleLock = async () => {
    if (!group || !group.id) return;
    const currentLocked = Boolean(group.isUpdateLocked);
    const newLock = !currentLocked;

    try {
      const headers = getAdminAuthHeaders();
      const res = await fetch('/api/admin/rescrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          groupId: group.id,
          action: 'toggle_lock',
          isUpdateLocked: newLock,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(`Failed to toggle lock: ${data.error || 'Server error'}`);
        return;
      }
      if (data.updatedGroup) {
        setGroup(data.updatedGroup);
        setRescrapeNotice(data.message || (newLock ? '🔒 User updates locked' : '🔓 User updates unlocked'));
        setTimeout(() => setRescrapeNotice(null), 4000);
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'Network error'}`);
    }
  };
  
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('nexus_bookmarks');
      if (saved) {
        setBookmarkedIds(JSON.parse(saved));
      }
      const upvotedIds = getUpvotedGroupIds();
      setIsUpvoted(upvotedIds.includes(group.id));
      setIsAdminLoggedIn(checkAdminSession());
      document.documentElement.classList.add('dark');
    } catch {
      // ignore
    }
  }, [group.id]);

  React.useEffect(() => {
    try {
      document.documentElement.classList.add('dark');
    } catch {
      // ignore
    }
  }, []);

  const handleDefaultBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleDefaultJoin = (g: Group) => {
    if (onJoinClick) {
      onJoinClick(g);
    } else if (typeof window !== 'undefined') {
      fetch(`/api/groups/${g.id}/join`, { method: 'POST' }).catch(() => {});
      window.location.href = getGroupRulesPath(g);
    }
  };

  const handleDefaultToggleBookmark = (g: Group) => {
    if (onToggleBookmark) {
      onToggleBookmark(g);
    } else if (typeof window !== 'undefined') {
      const nextVal = !isBookmarked;
      setIsBookmarked(nextVal);
      fetch(`/api/groups/${g.id}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextVal ? 'add' : 'remove' }),
      }).catch(() => {});
    }
  };

  const handleDefaultUpvote = (g: Group) => {
    const result = toggleUserUpvoteGroup(g.id);
    setIsUpvoted(result.isUpvoted);
    setGroup(prev => ({ ...prev, upvotes: result.isUpvoted ? prev.upvotes + 1 : Math.max(0, prev.upvotes - 1) }));
    if (onUpvote) {
      onUpvote(g);
    } else {
      fetch(`/api/groups/${g.id}/upvote`, { method: 'POST' }).catch(() => {});
    }
  };

  const handleDefaultAddTag = (groupId: string, tag: string) => {
    if (onAddTag) {
      onAddTag(groupId, tag);
    } else {
      const clean = tag.startsWith('#') ? tag : `#${tag}`;
      setGroup(prev => ({ ...prev, customTags: [...prev.customTags, clean] }));
      fetch(`/api/groups/${groupId}/tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      }).catch(() => {});
    }
  };

  const platformConfig = PLATFORM_CONFIGS[group.platform] || PLATFORM_CONFIGS.other;
  const popularity = calculatePopularityScore(group.clicks, group.upvotes, group.memberCount, group.growthRate);
  const isAdult = isAdultGroup(group);
  const isSticky = isGroupCurrentlySticky(group);

  const getLivePageUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${getGroupUrlPath(group)}`;
    }
    return `https://grouplinks.app${getGroupUrlPath(group)}`;
  };

  const handleCopyPageLink = () => {
    navigator.clipboard.writeText(getLivePageUrl());
    setCopiedPageLink(true);
    setTimeout(() => setCopiedPageLink(false), 2500);
  };

  const handleShareSocial = (platform: 'whatsapp' | 'twitter' | 'telegram' | 'facebook' | 'linkedin' | 'reddit') => {
    // Record share count on server
    try {
      fetch(`/api/groups/${group.id}/share`, { method: 'POST' }).catch(() => {});
    } catch {
      // ignore
    }

    const url = getLivePageUrl();
    const text = `Join the ${group.title} community on Group Links!`;

    let shareLink = '';
    switch (platform) {
      case 'whatsapp':
        shareLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'reddit':
        shareLink = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
        break;
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getLivePageUrl());
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

    if (navigator.share) {
      try {
        await navigator.share({
          title: group.title,
          text: `Join the ${group.title} community on ${platformConfig.name}!`,
          url: getLivePageUrl(),
        });
      } catch (err) {
        handleCopyPageLink();
      }
    } else {
      handleCopyPageLink();
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
    handleDefaultUpvote(group);
  };

  const breadcrumbs = [
    { name: getPlatformPluralLabel(group.platform), url: getPlatformListingUrl(group.platform) },
    { name: group.category, url: `/category/${categoryToSlug(group.category)}` },
    { name: group.title, url: getGroupUrlPath(group) },
  ];

  return (
    <div className="min-h-screen dark bg-slate-950 text-slate-100 flex flex-col font-sans">
      {isAdult && (
        <AdultConsentModal 
          onAccept={() => {}} 
          onDecline={() => {
            if (typeof window !== 'undefined') window.location.href = '/';
          }} 
        />
      )}
      <Header
        activeTab="explore"
        setActiveTab={() => {
          if (typeof window !== 'undefined') window.location.href = '/';
        }}
        searchQuery=""
        setSearchQuery={() => {}}
        onOpenBookmarks={() => {}}
        onOpenAdmin={() => (isAdminLoggedIn ? setIsAdminDashboardOpen(true) : setIsAdminLoginOpen(true))}
        isAdminLoggedIn={isAdminLoggedIn}
        bookmarkCount={bookmarkedIds.length}
        isDarkMode={true}
        setIsDarkMode={() => {}}
        onNavigateHome={() => {
          if (typeof window !== 'undefined') window.location.href = '/';
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDashboard={() => setIsUserDashboardOpen(true)}
      />
      
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      
      {/* Admin Quick Action Bar */}
      {isAdminLoggedIn && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/80 border-2 border-indigo-500/40 text-indigo-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-indigo-200">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Administrator Control Panel</span>
            {rescrapeNotice && (
              <span className="text-[11px] font-bold text-emerald-400 ml-2 animate-pulse">{rescrapeNotice}</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleAdminRescrape}
            disabled={isRescraping}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRescraping ? 'animate-spin' : ''}`} />
            <span>{isRescraping ? 'Re-scraping Metadata...' : '⚡ Force Re-scrape Metadata & Icon'}</span>
          </button>
        </div>
      )}

      {/* Breadcrumbs Navigation */}
      <Breadcrumbs items={breadcrumbs} />

      {/* Top Back Navigation Bar & Submission Date */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            href={getPlatformListingUrl(group.platform)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-indigo-600 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {getPlatformPluralLabel(group.platform)}</span>
          </Link>

          {/* Submission Date Tag */}
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 shadow-xs" suppressHydrationWarning>
            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span suppressHydrationWarning>Submitted: <strong className="font-bold text-neutral-800 dark:text-neutral-100">{formatPublishedDate(group.publishedAt || group.createdAt)}</strong></span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Upvote Button (1 per person) */}
          <button
            onClick={handleUpvote}
            title={isUpvoted ? 'You upvoted this community (Click to remove)' : 'Upvote this community'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border cursor-pointer ${
              isUpvoted
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 hover:border-indigo-300'
            }`}
          >
            <ArrowUp className={`w-3.5 h-3.5 ${isUpvoted ? 'stroke-[2.5] text-indigo-600 dark:text-indigo-400' : ''}`} />
            <span>{group.upvotes}</span>
          </button>

          {/* Share Live Page */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share Page</span>
          </button>
          
          {/* Bookmark / Save */}
          <button
            onClick={() => handleDefaultToggleBookmark(group)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-xs cursor-pointer ${
              isBookmarked
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Expired Link Warning Banner */}
      {(group.isExpired || group.isActive === false || group.healthStatus === 'expired') && (
        <div className="p-4 rounded-2xl bg-rose-950/90 border-2 border-rose-500/60 text-rose-100 flex items-start gap-3 shadow-xl">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-rose-200 flex items-center gap-2">
              <span>⚠️ Community Invite Link Expired or Unavailable</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider">Expired</span>
            </h3>
            <p className="text-xs text-rose-300/90 leading-relaxed">
              {group.expiredReason || 'This invite link got expired or the community is no longer active. To prevent wasted clicks, please explore active communities below.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Group Presentation Card */}
      <article className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xl overflow-hidden">
        
        {/* Banner with Group Icon placed behind */}
        <div className="relative h-28 sm:h-40 w-full overflow-hidden bg-neutral-950">
          <img
            src={resolveValidGroupImage(group.bannerUrl || group.imageUrl, group.category, group.title, true)}
            alt={group.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover blur-[2px] opacity-75 scale-105"
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
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-neutral-900 via-neutral-900/40 to-transparent" />
        </div>

        {/* Header Bar */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Left: Avatar & Main Titles */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0 -mt-10 sm:-mt-12 relative z-10">
              <div className="relative shrink-0">
                <img
                  src={resolveValidGroupImage(group.imageUrl, group.category, group.title, false)}
                  alt={group.title}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl object-cover border-4 border-white dark:border-neutral-900 shadow-xl bg-neutral-100 dark:bg-neutral-800"
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
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-900 rounded-full p-0.5 shadow-md">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                {/* Platform & Badge Header */}
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={getPlatformListingUrl(group.platform)}
                    title={`Browse all ${platformConfig.name} communities`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs transition-transform hover:scale-105 cursor-pointer ${platformConfig.badgeClass}`}
                  >
                    <PlatformIcon platform={group.platform} className="w-3.5 h-3.5" />
                    <span>{getPlatformEntityLabel(group.platform, isBotCommunity(group))}</span>
                  </Link>

                  {group.featured && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-xs">
                      <Flame className="w-3 h-3 fill-white" />
                      <span>Featured</span>
                    </span>
                  )}

                  {isAdult && (
                    <Link
                      href="/adult-groups"
                      title="Browse Adult 18+ communities"
                      className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-transform hover:scale-105 cursor-pointer"
                    >
                      🔞 18+ Adult
                    </Link>
                  )}

                  {(group.isExpired || group.isActive === false || group.healthStatus === 'expired') && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs border border-rose-500 animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5 text-white" />
                      <span>Expired Link</span>
                    </span>
                  )}
                </div>

                {/* Big Prominent Group / Server Name */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-neutral-900 dark:text-white leading-tight tracking-tight break-words">
                  {group.platform === 'reddit' ? getRedditDisplayTitle(group) : group.title}
                </h1>

                {/* Dedicated Reddit Subtitle */}
                {group.platform === 'reddit' && (
                  <p className="text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400 mt-0.5 mb-1">
                    {getRedditCommunitySubtitle(group)}
                  </p>
                )}

                {/* Prominent Author & Submission Date Header Info */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-neutral-600 dark:text-neutral-400" suppressHydrationWarning>
                  <span className="inline-flex items-center gap-1 font-medium" suppressHydrationWarning>
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Published: <strong className="font-bold text-neutral-800 dark:text-neutral-200">{formatPublishedDate(group.publishedAt || group.createdAt)}</strong></span>
                  </span>
                  <span className="text-neutral-300 dark:text-neutral-700">•</span>
                  <span className="inline-flex items-center gap-1 font-medium" suppressHydrationWarning>
                    <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Submitted by: <strong className="font-bold text-neutral-800 dark:text-neutral-200">{getAuthorName(group.authorName)}</strong></span>
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Content Body Details */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Quick Metadata Chips */}
          <div className="flex flex-wrap items-center gap-2" suppressHydrationWarning>
            <Link
              href={isAdult ? '/adult-groups' : `/categories/${categoryToSlug(group.category)}`}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-200/80 transition-colors"
            >
              Category: {group.category}
            </Link>
            <Link
              href={`/language/${group.language.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 hover:bg-sky-100 transition-colors"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>Language: {group.language}</span>
            </Link>
            <Link
              href={`/country/${group.region.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 hover:bg-emerald-100 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Region: {group.region}</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Safety Score: {group.safetyScore}%</span>
            </span>

            {/* Published Date */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60" suppressHydrationWarning>
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span suppressHydrationWarning>Published: {formatPublishedDate(group.publishedAt || group.createdAt)}</span>
            </span>

            {/* Author Attribution */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60" suppressHydrationWarning>
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span suppressHydrationWarning>Author: {getAuthorName(group.authorName)}</span>
            </span>
          </div>

          {/* Ad Placement: Group Detail Banner (with targeted safety checks) */}
          <AdDisplay slot="detail_banner" isCurrentContextSafe={!isAdult} className="mt-4" />

          {/* 24-Hour Top Ranked Daily Champion Card */}
          {group.isDailyTopRanked && (
            <div className="mt-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-yellow-500/20 border-2 border-amber-400 dark:border-amber-600/80 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-amber-950 flex items-center justify-center font-black shadow-xs shrink-0">
                    <Crown className="w-6 h-6 fill-amber-950" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                      <span>👑 24-Hour Top Ranked Community</span>
                    </h3>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/90 font-medium">
                      Featured in the #3 directory slot today for leading viral shares, community joinings, and upvotes!
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-black bg-amber-500 text-amber-950 shadow-xs" suppressHydrationWarning>
                    Expires in {get24HourCycleExpiration().formatted}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Key Community Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-500 text-xs font-medium mb-1">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Members</span>
              </div>
              <div className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                {formatMemberCount(group.memberCount)}
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-500 text-xs font-medium mb-1">
                <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                <span>Direct Joins</span>
              </div>
              <div className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                {formatMemberCount(group.clicks)}
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-500 text-xs font-medium mb-1">
                <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Total Shares</span>
              </div>
              <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
                {formatMemberCount(group.shares || 0)}
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-500 text-xs font-medium mb-1">
                <ArrowUp className="w-3.5 h-3.5 text-rose-500" />
                <span>Upvotes</span>
              </div>
              <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                {group.upvotes}
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 text-center col-span-2 sm:col-span-1">
              <div className="flex items-center justify-center gap-1 text-neutral-500 text-xs font-medium mb-1">
                <Clock className="w-3.5 h-3.5 text-violet-500" />
                <span>Activity</span>
              </div>
              <div className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                {group.lastActive || 'Active today'}
              </div>
            </div>
          </div>

          {/* Full Detailed Description */}
          <div className="mt-6 p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/80 space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>About this Community</span>
            </h2>
            
            {group.description ? (
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                <p className="text-sm sm:text-base text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal whitespace-pre-line">
                  {group.description}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 italic">
                  No detailed description provided yet for this community. Click Join above to connect with members and participate in active discussions.
                </p>
              </div>
            )}

            {/* Publication Date & Author Attribution */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-200/80 dark:border-neutral-700/80" suppressHydrationWarning>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span suppressHydrationWarning>Date Published: <strong className="font-semibold text-neutral-700 dark:text-neutral-300">{formatPublishedDate(group.publishedAt || group.createdAt)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <span suppressHydrationWarning>Submitted by: <strong className="font-semibold text-neutral-700 dark:text-neutral-300">{getAuthorName(group.authorName)}</strong></span>
              </div>
            </div>

            {/* When Promoted is active, display promoted direct link status badge */}
            {isSticky && (
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-500 shrink-0 fill-amber-500" />
                <div className="text-xs">
                  <span className="font-extrabold text-amber-900 dark:text-amber-300 block">
                    ⚡ Promoted Active: Direct Link Enabled
                  </span>
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Instant one-click direct invite access active.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Community Tags & Keyword Hub */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Community Topics & Tags</span>
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {group.customTags.map((tag, idx) => {
                const tagSlug = tagToSlug(tag) || tag.replace(/^#+/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return (
                  <Link
                    key={idx}
                    href={`/tag/${tagSlug}`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-indigo-50 dark:bg-neutral-800 dark:hover:bg-indigo-950/60 text-neutral-700 dark:text-neutral-300 hover:text-indigo-600 transition-colors border border-neutral-200/60 dark:border-neutral-700/60"
                  >
                    <span>{tag}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Ad Placement Detail Banner */}
          <div className="mt-6">
            <AdDisplay slot="detail_banner" isCurrentContextSafe={!isAdult} />
          </div>

          {/* Join Gateway & Direct URL Access Box */}
          <div className="mt-8 p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-neutral-900 to-neutral-950 text-white border border-indigo-900/40 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  {isSticky ? <Zap className="w-5 h-5 text-amber-400 fill-amber-400" /> : <Sparkles className="w-5 h-5 text-indigo-400" />}
                  <span>{isSticky ? 'Verified Direct Link' : getJoinButtonLabel(group)}</span>
                </h3>
                <p className="text-xs text-neutral-300 mt-1">
                  {isSticky
                    ? 'Verified instant invite link with active community access.'
                    : 'Verified official invite link for active members.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dmca"
                  prefetch={false}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 backdrop-blur-md transition-colors cursor-pointer"
                  title="Submit a DMCA Copyright Removal Notice"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>DMCA Removal</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setFeedbackInitialType('broken_link');
                    setIsFeedbackModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 backdrop-blur-md transition-colors cursor-pointer"
                  title="Report expired link or send suggestions to administrator"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Report Broken Link</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy specific group page URL to clipboard (not external invite link)"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied Page URL!' : 'Copy Group URL'}</span>
                </button>
              </div>
            </div>

            {/* Direct URL Preview Bar for Promoted Groups */}
            {isSticky && (
              <div className="p-3 rounded-2xl bg-white/10 border border-amber-400/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0 font-mono text-amber-300">
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{group.url}</span>
                </div>
                <a
                  href={group.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    fetch(`/api/groups/${group.id}/join`, { method: 'POST' }).catch(() => {});
                  }}
                  className="shrink-0 px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs transition-colors"
                >
                  Open Link ↗
                </a>
              </div>
            )}

            {/* Direct Big Action Buttons: Promote & Join */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onBoostClick) {
                    onBoostClick(group);
                  } else {
                    setActiveBoostGroup(group);
                    setIsBoostModalOpen(true);
                  }
                }}
                className="w-full py-3.5 px-6 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2 text-amber-950 dark:text-amber-100 bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-amber-950 dark:fill-amber-100" />
                <span>Promote</span>
              </button>

              <button
                type="button"
                onClick={() => handleDefaultJoin(group)}
                className={`w-full py-3.5 px-6 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2.5 shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                  isAdult
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : getPlatformJoinButtonClasses(group.platform)
                }`}
              >
                <span>{getJoinButtonLabel(group.platform, isBotCommunity(group))}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {(group.isExpired || group.isActive === false || group.healthStatus === 'expired') && (
              <p className="text-xs text-rose-300 font-bold text-center pt-1 flex items-center justify-center gap-1.5 bg-rose-950/60 p-2.5 rounded-xl border border-rose-500/40">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Notice: This community invite link is currently reported as Expired.</span>
              </p>
            )}

            {/* Join button ad placement (Hidden by default in admin dashboard) */}
            <AdDisplay slot="join_button_ad" isCurrentContextSafe={!isAdult} />
          </div>

        </div>
      </article>

      {/* Interactive 5-Star Rating & 3-Box Comments System */}
      <section id="reviews-and-comments" className="pt-2">
        <GroupReviewsAndComments
          group={group}
          isAdminLoggedIn={isAdminLoggedIn}
          onUpdateGroup={(updated) => setGroup(updated)}
        />
      </section>

      {/* Community Report Section with Reason Dropdown & Custom Message */}
      <section id="group-report-container" className="pt-2">
        <GroupReportSection group={group} />
      </section>

      {/* Related Communities Module */}
      {relatedGroups && relatedGroups.length > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-neutral-900 dark:text-slate-100">
                Related {group.category} Communities
              </h2>
            </div>
            <Link
              href={`/category/${categoryToSlug(group.category)}`}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View all {group.category} groups →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedGroups.slice(0, 6).map(relGroup => (
              <GroupCard
                key={relGroup.id}
                group={relGroup}
                isBookmarked={bookmarkedIds.includes(relGroup.id)}
                isUpvoted={hasUserUpvotedGroup(relGroup.id)}
                onToggleBookmark={() => {
                  try {
                    const saved = localStorage.getItem('nexus_bookmarks');
                    let list: string[] = saved ? JSON.parse(saved) : [];
                    if (list.includes(relGroup.id)) {
                      list = list.filter(id => id !== relGroup.id);
                    } else {
                      list.push(relGroup.id);
                    }
                    localStorage.setItem('nexus_bookmarks', JSON.stringify(list));
                    setBookmarkedIds(list);
                  } catch {}
                }}
                onUpvote={(g) => {
                  const result = toggleUserUpvoteGroup(g.id);
                  fetch(`/api/groups/${g.id}/upvote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: result.isUpvoted ? 'add' : 'remove' }),
                  }).catch(() => {});
                }}
                onJoinClick={g => {
                  if (typeof window !== 'undefined') {
                    window.location.href = getGroupUrlPath(g);
                  }
                }}
                onOpenDetails={g => {
                  if (typeof window !== 'undefined') {
                    window.location.href = getGroupUrlPath(g);
                  }
                }}
                onBoostClick={g => {
                  if (onBoostClick) {
                    onBoostClick(g);
                  } else {
                    setActiveBoostGroup(g);
                    setIsBoostModalOpen(true);
                  }
                }}
                onSelectTag={() => {}}
                joinButtonLabel="View Group"
              />
            ))}
          </div>
        </section>
      )}

      {/* Trust & Safety Notice */}
      <section className="p-5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
        <h3 className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Safety & Verification Notice</span>
        </h3>
        <p>
          Group Links verifies invite link connectivity and filters prohibited content. When joining external groups, never share financial details, passwords, or personal credentials. If you find broken links or spam, please report them to our moderation team.
        </p>
      </section>
      </main>

      {/* Global Semantic Footer */}
      <Footer />

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(u) => {
            setIsAuthModalOpen(false);
            setIsUserDashboardOpen(true);
          }}
        />
      )}

      {isUserDashboardOpen && currentUser && (
        <div className="fixed inset-0 z-50 overflow-hidden flex flex-col bg-slate-950 animate-in slide-in-from-right duration-300">
          <UserDashboardView
            initialUser={currentUser}
            onNavigateHome={() => setIsUserDashboardOpen(false)}
            onLogout={() => {
              setIsUserDashboardOpen(false);
              if (setUser) setUser(null);
            }}
            onClose={() => setIsUserDashboardOpen(false)}
          />
        </div>
      )}

      {isAdminLoginOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
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
          onClose={() => setIsAdminDashboardOpen(false)}
          groups={[group]}
          onUpdateGroup={(updated) => {
            setGroup(updated);
          }}
          onDeleteGroup={() => {
            if (typeof window !== 'undefined') window.location.href = '/';
          }}
          onAddGroup={() => {}}
          onLogout={() => {
            clearAdminSession();
            setIsAdminLoggedIn(false);
            setIsAdminDashboardOpen(false);
          }}
        />
      )}
      {isBoostModalOpen && (
        <BoostPaymentModal
          group={activeBoostGroup || group}
          isOpen={isBoostModalOpen}
          onClose={() => {
            setIsBoostModalOpen(false);
            setActiveBoostGroup(null);
          }}
          onBoostSuccess={(updated) => {
            if (!activeBoostGroup || activeBoostGroup.id === group.id) {
              setGroup(updated);
            }
            setIsBoostModalOpen(false);
            setActiveBoostGroup(null);
          }}
        />
      )}

      {/* Admin Feedback & Broken Link Reporting Modal */}
      <GroupFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        group={group}
        initialType={feedbackInitialType}
      />
    </div>
  );
};
