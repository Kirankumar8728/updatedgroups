'use client';
import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink, 
  Trash2, 
  PlusCircle, 
  ArrowUpRight, 
  MessageSquare, 
  Star, 
  Flame, 
  Users, 
  Globe, 
  Lock,
  ArrowRight,
  LogOut,
  X,
  Bookmark,
  Heart,
  TrendingUp,
  Gift,
  AlertCircle,
  Loader2,
  Download
} from 'lucide-react';
import { UserProfile, CreditTransaction, CommunityClaim, UserTrackingLink } from '../types/user';
import { Group } from '../types';
import { getStoredSessionToken, logoutUser } from '../utils/userAuth';
import { fireConfetti } from '../utils/confetti';
import { POINTS_PACKAGES, calculateCustomPoints } from '../utils/pointsPackages';

import { ClaimCommunityModal } from './ClaimCommunityModal';
import { PromoteWithCreditsModal } from './PromoteWithCreditsModal';
import { SubmitPromotionProofModal } from './SubmitPromotionProofModal';
import { BuyPointsModal } from './BuyPointsModal';
import { PlatformIcon } from './PlatformIcon';

interface UserDashboardViewProps {
  initialUser: UserProfile;
  onNavigateHome: () => void;
  onLogout: () => void;
  onSelectGroup?: (group: Group) => void;
  onClose?: () => void;
}

export const UserDashboardView: React.FC<UserDashboardViewProps> = ({
  initialUser,
  onNavigateHome,
  onLogout,
  onSelectGroup,
  onClose
}) => {
  const handleClose = onClose || onNavigateHome;
  const [activeTab, setActiveTab] = useState<'overview' | 'my_groups' | 'saved' | 'buy_points' | 'ledger' | 'earn' | 'settings'>('overview');
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [ledger, setLedger] = useState<CreditTransaction[]>([]);
  const [claims, setClaims] = useState<CommunityClaim[]>([]);
  const [trackingLink, setTrackingLink] = useState<UserTrackingLink | null>(null);
  const [myCommunities, setMyCommunities] = useState<Group[]>([]);
  const [activePromotions, setActivePromotions] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bookmarks state
  const [savedGroups, setSavedGroups] = useState<Group[]>([]);
  const [isSavedLoading, setIsSavedLoading] = useState(false);

  // Task claim states
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [isClaimingTask, setIsClaimingTask] = useState<string | null>(null);

  // Interactive Task verification tracking states
  const [taskStates, setTaskStates] = useState<Record<string, { status: 'idle' | 'verifying' | 'claimable' | 'claimed'; secondsLeft: number }>>({
    join_group: { status: 'idle', secondsLeft: 10 },
    rate_group: { status: 'idle', secondsLeft: 10 },
    share_social: { status: 'idle', secondsLeft: 10 },
    report_link: { status: 'idle', secondsLeft: 10 },
    review_platform: { status: 'idle', secondsLeft: 10 },
  });

  // Modals
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isPromoProofModalOpen, setIsPromoProofModalOpen] = useState(false);
  const [isBuyPointsModalOpen, setIsBuyPointsModalOpen] = useState(false);
  const [selectedPointsPackageId, setSelectedPointsPackageId] = useState<string>('pack_popular');
  const [selectedGroupForAction, setSelectedGroupForAction] = useState<Group | null>(null);
  const [selectedPlanForAction, setSelectedPlanForAction] = useState<string | undefined>(undefined);

  // Modals
  const [isReferralCopied, setIsReferralCopied] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Load bookmarks from local storage
  const loadSavedBookmarks = async () => {
    setIsSavedLoading(true);
    try {
      const stored = localStorage.getItem('nexus_bookmarks');
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        if (ids.length > 0) {
          const res = await fetch(`/api/groups?limit=1000`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.groups) {
              const matched = data.groups.filter((g: Group) => ids.includes(g.id));
              setSavedGroups(matched);
            }
          }
        } else {
          setSavedGroups([]);
        }
      } else {
        setSavedGroups([]);
      }
    } catch {
      console.warn('Failed to load bookmarks');
    } finally {
      setIsSavedLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    const token = getStoredSessionToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Your session expired. Please sign in again.');
        }
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Failed to load dashboard.');
      }

      const data = await res.json();
      if (data.success) {
        if (data.user) {
          setUser(data.user);
        }
        setLedger(data.ledger || []);
        setClaims(data.claims || []);
        setTrackingLink(data.trackingLink || null);
        setMyCommunities(data.myCommunities || []);
        setActivePromotions(data.activePromotions || []);
      } else {
        throw new Error(data.error || 'Failed to parse dashboard data.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to fetch dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
    fetchDashboardData();
    loadSavedBookmarks();
    
    // Check if daily checkin was done today
    const lastCheckin = localStorage.getItem(`daily_checkin_${initialUser.id}`);
    const today = new Date().toDateString();
    if (lastCheckin === today) {
      setDailyClaimed(true);
    }

    // Check completed interactive tasks from local storage
    if (initialUser && initialUser.id) {
      const savedCompleted = { ...taskStates };
      let hasCompleted = false;
      for (const tKey of ['join_group', 'rate_group', 'share_social', 'report_link', 'review_platform']) {
        const isDone = localStorage.getItem(`task_${tKey}_claimed_${initialUser.id}`) === 'true';
        if (isDone) {
          savedCompleted[tKey] = { status: 'claimed', secondsLeft: 0 };
          hasCompleted = true;
        }
      }
      if (hasCompleted) {
        setTaskStates(savedCompleted);
      }
    }
  }, [initialUser]);

  const handleRemoveBookmark = (groupId: string) => {
    try {
      const stored = localStorage.getItem('nexus_bookmarks');
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        const updated = ids.filter(id => id !== groupId);
        localStorage.setItem('nexus_bookmarks', JSON.stringify(updated));
        setSavedGroups(prev => prev.filter(g => g.id !== groupId));
        try { fireConfetti({ particleCount: 15, spread: 30 }); } catch {}
      }
    } catch {}
  };

  const handleDailyCheckin = async () => {
    const token = getStoredSessionToken();
    if (!token) return;

    setIsClaimingTask('daily_checkin');
    try {
      const res = await fetch('/api/user/earn-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ taskType: 'daily_checkin' })
      });

      const data = await res.json();
      if (data.success) {
        setDailyClaimed(true);
        localStorage.setItem(`daily_checkin_${user.id}`, new Date().toDateString());
        try { fireConfetti({ particleCount: 50, spread: 60 }); } catch {}
        await fetchDashboardData();
      } else {
        alert(data.error || 'Could not claim daily reward.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setIsClaimingTask(null);
    }
  };

  const handleStartTask = (taskType: string, url: string) => {
    // 1. Open the URL in a new window/tab
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    // 2. Set task status to 'verifying' and start 10s countdown
    setTaskStates(prev => ({
      ...prev,
      [taskType]: { status: 'verifying', secondsLeft: 10 }
    }));

    const intervalId = setInterval(() => {
      setTaskStates(prev => {
        const current = prev[taskType];
        if (!current) {
          clearInterval(intervalId);
          return prev;
        }
        if (current.secondsLeft <= 1) {
          clearInterval(intervalId);
          return {
            ...prev,
            [taskType]: { status: 'claimable', secondsLeft: 0 }
          };
        }
        return {
          ...prev,
          [taskType]: { ...current, secondsLeft: current.secondsLeft - 1 }
        };
      });
    }, 1000);
  };

  const handleClaimEarnTask = async (taskType: string, groupTitle?: string, groupId?: string) => {
    const token = getStoredSessionToken();
    if (!token) return;

    // Check if task is already claimed
    if (taskStates[taskType]?.status === 'claimed') {
      alert('You have already claimed your rewards for this task!');
      return;
    }

    setIsClaimingTask(taskType);
    try {
      const res = await fetch('/api/user/earn-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ taskType, groupTitle, groupId })
      });

      const data = await res.json();
      if (data.success) {
        try { fireConfetti({ particleCount: 50, spread: 60 }); } catch {}
        
        // Save completed status locally
        localStorage.setItem(`task_${taskType}_claimed_${user.id}`, 'true');
        setTaskStates(prev => ({
          ...prev,
          [taskType]: { status: 'claimed', secondsLeft: 0 }
        }));
        
        await fetchDashboardData();
        alert(data.message || `Successfully completed task! Credited reward to your balance.`);
      } else {
        alert(data.error || 'Failed to complete task.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setIsClaimingTask(null);
    }
  };

  const handleCopyReferral = () => {
    const refUrl = `https://grouplinks.app/?ref=${user.referralCode}`;
    try {
      navigator.clipboard.writeText(refUrl);
      setIsReferralCopied(true);
      setTimeout(() => setIsReferralCopied(false), 2000);
    } catch {}
  };

  const handleExportData = async () => {
    const token = getStoredSessionToken();
    if (!token) return;

    try {
      const res = await fetch('/api/auth/export-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grouplinks_privacy_export_${user.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      alert('Failed to export data');
    }
  };

  const handleDeleteAccount = async () => {
    const token = getStoredSessionToken();
    if (!token) return;

    if (!confirm('Are you sure you want to permanently delete your account? All personal data will be erased and remaining credits will be forfeited.')) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      const res = await fetch('/api/auth/export-data', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Your account has been deleted.');
        logoutUser();
        onLogout();
      }
    } catch {
      alert('Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const renderTaskButton = (taskType: string, url: string, creditAmount: number, groupTitle: string, groupId: string, idleLabel: string, activeLabel: string) => {
    const taskState = taskStates[taskType] || { status: 'idle', secondsLeft: 10 };
    const isClaiming = isClaimingTask === taskType;

    if (taskState.status === 'claimed') {
      return (
        <button
          disabled
          className="w-full py-2.5 bg-neutral-100 dark:bg-neutral-800/60 text-neutral-400 dark:text-neutral-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed border border-neutral-200 dark:border-neutral-700"
        >
          <Check className="w-4 h-4 text-emerald-500" />
          <span>Reward Claimed! (+{creditAmount} Credits)</span>
        </button>
      );
    }

    if (taskState.status === 'verifying') {
      return (
        <button
          disabled
          className="w-full py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
        >
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          <span>Verifying task... {taskState.secondsLeft}s remaining</span>
        </button>
      );
    }

    if (taskState.status === 'claimable') {
      return (
        <button
          onClick={() => handleClaimEarnTask(taskType, groupTitle, groupId)}
          disabled={isClaiming}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
        >
          <Coins className="w-4 h-4 animate-bounce" />
          <span>{isClaiming ? 'Claiming Reward...' : `Claim +${creditAmount} Credits Now!`}</span>
        </button>
      );
    }

    // Default 'idle' state
    return (
      <button
        onClick={() => handleStartTask(taskType, url)}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <ExternalLink className="w-4 h-4" />
        <span>{idleLabel}</span>
      </button>
    );
  };

  return (
    <div className="w-full bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white pb-20 flex flex-col min-h-screen">
      
      {/* Top Banner Ribbon */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
            
            {/* Profile widget */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.id)}`}
                  alt={user.displayName}
                  className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-0.5 object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-neutral-900 dark:text-white truncate">
                      {user.displayName}
                    </h1>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verified Owner</span>
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {user.email ? user.maskedEmail || user.email : user.displayName || `@${user.id}`}
                  </p>
                </div>
              </div>

              {/* Close Dashboard Button for Mobile */}
              <button
                type="button"
                onClick={handleClose}
                className="sm:hidden p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Balance Widgets & Action Bar */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
              <div className="px-3 sm:px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500 shrink-0 fill-amber-500/20" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 block leading-none">
                    Credits
                  </span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono leading-none">
                    {user.creditsBalance}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPointsPackageId('pack_popular');
                    setIsBuyPointsModalOpen(true);
                  }}
                  className="px-3 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>Buy Points</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlanForAction(undefined);
                    setSelectedGroupForAction(myCommunities[0] || null);
                    setIsPromoteModalOpen(true);
                  }}
                  className="px-3 sm:px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span className="hidden sm:inline">Promote Group</span>
                  <span className="sm:hidden">Promote</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logoutUser();
                    onLogout();
                  }}
                  className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* Close Button Desktop */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white transition-colors shrink-0 cursor-pointer font-bold text-xs"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Bar tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-neutral-100 dark:border-neutral-800/80 pt-2 pb-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'my_groups', label: `My Communities (${myCommunities.length})` },
              { id: 'saved', label: `Saved List (${savedGroups.length})` },
              { id: 'buy_points', label: 'Buy Points ⚡' },
              { id: 'earn', label: 'Earn Credits' },
              { id: 'ledger', label: 'Credit Ledger' },
              { id: 'settings', label: 'Settings' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === 'saved') loadSavedBookmarks();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 w-full flex-1">
        
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchDashboardData}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading && !error && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-600" />
            <span>Updating points balance and active community campaigns...</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Quick Action Daily Banner */}
            {!dailyClaimed && (
              <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-orange-500/10">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/25 text-white">
                    <Sparkles className="w-3 h-3 fill-white" />
                    <span>DAILY BONUS IS ACTIVE</span>
                  </div>
                  <h3 className="font-extrabold text-lg sm:text-xl tracking-tight">Claim your daily 5 free points!</h3>
                  <p className="text-xs text-white/90">Click now to instantly top up your promotion credits balance to promote groups.</p>
                </div>
                <button
                  onClick={handleDailyCheckin}
                  disabled={isClaimingTask !== null}
                  className="px-5 py-2.5 rounded-2xl bg-white hover:bg-neutral-50 text-orange-600 font-extrabold text-xs tracking-tight shadow-md hover:scale-105 active:scale-95 transition-all self-start md:self-auto flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isClaimingTask === 'daily_checkin' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                  <span>Claim Daily +5 Points</span>
                </button>
              </div>
            )}

            {/* Grid of Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Balance */}
              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Credits Balance</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-neutral-900 dark:text-white font-mono leading-none">
                  {user.creditsBalance}
                </div>
                <p className="text-[11px] text-neutral-400 mt-2 font-medium">
                  Earned: {user.totalCreditsEarned || 0} • Spent: {user.totalCreditsSpent || 0}
                </p>
                <button
                  onClick={() => setActiveTab('buy_points')}
                  className="mt-3.5 w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Buy Credits</span>
                </button>
              </div>

              {/* Card 2: Submitted Groups */}
              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">My Communities</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-neutral-900 dark:text-white font-mono leading-none">
                  {myCommunities.length}
                </div>
                <p className="text-[11px] text-neutral-400 mt-2 font-medium">
                  Submitted or claimed groups
                </p>
                <button
                  onClick={() => setActiveTab('my_groups')}
                  className="mt-3.5 w-full py-2 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Manage Groups</span>
                </button>
              </div>

              {/* Card 3: Active promotions */}
              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Active Promos</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-neutral-900 dark:text-white font-mono leading-none">
                  {activePromotions.length}
                </div>
                <p className="text-[11px] text-neutral-400 mt-2 font-medium">
                  Sticky & featured campaigns
                </p>
                <button
                  onClick={() => setActiveTab('my_groups')}
                  className="mt-3.5 w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>View Promos</span>
                </button>
              </div>

              {/* Card 4: Saved bookmarks */}
              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Saved Bookmarks</span>
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                    <Bookmark className="w-4 h-4 text-teal-500 fill-teal-500/20" />
                  </div>
                </div>
                <div className="text-3xl font-black text-neutral-900 dark:text-white font-mono leading-none">
                  {savedGroups.length}
                </div>
                <p className="text-[11px] text-neutral-400 mt-2 font-medium">
                  Quick-access saved list
                </p>
                <button
                  onClick={() => setActiveTab('saved')}
                  className="mt-3.5 w-full py-2 px-3 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Saved List</span>
                </button>
              </div>

            </div>

            {/* Quick Earn Cards Panel */}
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">Quick Tasks to Earn Credits</h3>
                  <p className="text-xs text-neutral-500">Boost your balance for free by completing easy partner tasks.</p>
                </div>
                <button onClick={() => setActiveTab('earn')} className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1">
                  <span>Earn Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-900 dark:text-white">Daily Check-In</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400">+5 Credits</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-normal">Return once daily and claim free points instantly.</p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-900 dark:text-white">Join Partner Groups</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">+2 Credits</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-normal">Join selected community groups to earn instant rewards.</p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-900 dark:text-white">Submit Reviews</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-teal-500/10 text-teal-600 dark:text-teal-400">+3 Credits</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-normal">Write constructive, meaningful group reviews and comment posts.</p>
                </div>
              </div>
            </div>

            {/* Recent activity activity previews */}
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">Recent Ledger Activities</h3>
                <button onClick={() => setActiveTab('ledger')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Full Ledger →
                </button>
              </div>

              {ledger.length === 0 ? (
                <div className="text-center py-6 text-neutral-400 text-xs">No credit ledger activities yet.</div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {ledger.slice(0, 3).map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {tx.amount > 0 ? '+' : '-'}
                        </div>
                        <div>
                          <span className="font-bold text-neutral-900 dark:text-white block">{tx.reason}</span>
                          <span className="text-[10px] text-neutral-400">{new Date(tx.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className={`font-bold font-mono text-xs ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} Credits
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: MY COMMUNITIES & SUBMITTED GROUPS */}
        {activeTab === 'my_groups' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">My Submitted &amp; Claimed Communities</h2>
                  <p className="text-xs text-neutral-500">Manage your active group listings and boost them using credits.</p>
                </div>
                
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => setIsClaimModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Claim Community Instantly</span>
                  </button>
                </div>
              </div>

              {myCommunities.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white">No Communities Registered</h4>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto">You have not submitted or claimed any community pages yet. Claiming gives you ownership instantly without verification codes!</p>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button onClick={onNavigateHome} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm">
                      Browse and Claim Existing
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {myCommunities.map((group) => {
                    const isSticky = group.isSticky && group.stickyUntil && new Date(group.stickyUntil).getTime() > Date.now();
                    return (
                      <div key={group.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <PlatformIcon platform={group.platform} className="w-10 h-10 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate max-w-[240px] sm:max-w-[400px]">
                                {group.title}
                              </h4>
                              {isSticky && (
                                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold flex items-center gap-1">
                                  <Flame className="w-3 h-3 fill-rose-500" />
                                  <span>STICKY ACTIVE</span>
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-500 font-medium">
                                {group.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-1">
                              Language: {group.language || 'English'} • Clicks: {group.clicks || 0} • Upvotes: {group.upvotes || 0}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              setSelectedGroupForAction(group);
                              setSelectedPlanForAction(undefined);
                              setIsPromoteModalOpen(true);
                            }}
                            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Promote Group</span>
                          </button>

                          <a
                            href={`/${group.platform}-groups`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-xl transition-colors"
                            title="View Community Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SAVED LIST / BOOKMARKS */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div>
                <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">My Saved Communities List</h2>
                <p className="text-xs text-neutral-500">Communities you bookmarked for quick-access and tracking.</p>
              </div>

              {isSavedLoading ? (
                <div className="py-8 text-center text-xs text-neutral-400">Loading your saved list...</div>
              ) : savedGroups.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
                  <Bookmark className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto" />
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">Your saved list is empty. Click the bookmark icon on any community card to access them quickly here.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {savedGroups.map((group) => (
                    <div key={group.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <PlatformIcon platform={group.platform} className="w-8 h-8 shrink-0" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-neutral-900 dark:text-white truncate max-w-[200px] sm:max-w-[400px]">
                            {group.title}
                          </h4>
                          <span className="text-[10px] text-neutral-400 block truncate mt-0.5">{group.category} • {group.language}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            if (onSelectGroup) onSelectGroup(group);
                            else handleClose();
                          }}
                          className="px-3 py-1.5 bg-neutral-100 hover:bg-indigo-600 hover:text-white text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleRemoveBookmark(group.id)}
                          className="p-1.5 border border-neutral-200 dark:border-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Remove from bookmarks"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BUY POINTS */}
        {activeTab === 'buy_points' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-orange-500/10 border border-amber-500/20 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">Purchase Promotion Points (INR)</h2>
                </div>
                <p className="text-xs text-neutral-500 max-w-2xl">Use your credits to promote any community instantly. High conversion sticky positions are automatically verified upon balance deductions!</p>
              </div>

              <div className="px-4 py-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm shrink-0">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Available Credits</span>
                <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                  {user.creditsBalance} Credits
                </span>
              </div>
            </div>

            {/* Packages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {POINTS_PACKAGES.map((pack) => {
                const totalPts = pack.points + pack.bonusPoints;
                return (
                  <div
                    key={pack.id}
                    className={`p-5 rounded-2xl bg-white dark:bg-neutral-900 border ${
                      pack.popular ? 'border-amber-500 ring-2 ring-amber-500/10 shadow-sm' : 'border-neutral-200 dark:border-neutral-800'
                    } flex flex-col justify-between space-y-4`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white">{pack.name}</h3>
                        {pack.popular && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white">POPULAR</span>}
                      </div>
                      <p className="text-xs text-neutral-500 min-h-[30px]">{pack.description}</p>
                      
                      <div className="pt-2 flex items-baseline gap-1.5">
                        <span className="text-3xl font-black font-mono text-neutral-900 dark:text-white">{totalPts}</span>
                        <span className="text-xs font-bold text-amber-500">Credits</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-medium">Price</span>
                        <span className="text-base font-extrabold font-mono text-neutral-900 dark:text-white">₹{pack.price} INR</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedPointsPackageId(pack.id);
                            setIsBuyPointsModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:scale-105 active:scale-95 transition-all text-xs font-bold cursor-pointer"
                        >
                          UPI QR
                        </button>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>


          </div>
        )}

        {/* TAB 5: EARN CREDITS REWARDS HUB */}
        {activeTab === 'earn' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-6">
              <div className="border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <Gift className="w-6 h-6 text-indigo-500" />
                  <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">Interactive Contribution &amp; Rewards</h2>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Complete instant mini-activities to earn premium promotion credits absolutely free!</p>
              </div>

              {/* Task Cards list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Task: Daily Checkin */}
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase">Daily Loyalty</span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">+5 Credits</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-neutral-950 dark:text-white">Daily Check-In</h3>
                    <p className="text-xs text-neutral-500">Log in daily, support the community directory, and click the button below to claim 5 free credits instantly.</p>
                  </div>
                  <button
                    onClick={handleDailyCheckin}
                    disabled={dailyClaimed || isClaimingTask !== null}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      dailyClaimed 
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed' 
                        : 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
                    }`}
                  >
                    {dailyClaimed ? <CheckCircle2 className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                    <span>{dailyClaimed ? 'Claimed Today!' : 'Claim Daily Reward'}</span>
                  </button>
                </div>

                {/* Task: Join Partner Community */}
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase">Social Activity</span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">+2 Credits</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-neutral-950 dark:text-white">Join Our Official Partner Channel</h3>
                    <p className="text-xs text-neutral-500">Join our verified telegram partner channel to stay updated on free promotion bonuses and updates.</p>
                  </div>
                  {renderTaskButton(
                    'join_group',
                    'https://t.me/tele_partner_example',
                    2,
                    'Official Telegram Channel',
                    'tele-partner',
                    'Join Official Channel',
                    'Join Partner Channel'
                  )}
                </div>

                {/* Task: Submit Rating & Reviews */}
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold uppercase">Reviewer</span>
                      <span className="text-xs font-black text-teal-600 dark:text-teal-400 font-mono">+3 Credits</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-neutral-950 dark:text-white">Rate and Comment on 5 Groups</h3>
                    <p className="text-xs text-neutral-500">Provide helpful feedback on listed groups in the directory to keep the platform updated and quality-assured.</p>
                  </div>
                  {renderTaskButton(
                    'rate_group',
                    '/explore',
                    3,
                    'Directory Quality Contributor',
                    'review-task',
                    'Rate and Comment',
                    'Rating 5 Groups'
                  )}
                </div>

                {/* Referral Program */}
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[10px] font-bold uppercase">Network</span>
                      <span className="text-xs font-black text-pink-600 dark:text-pink-400 font-mono">+10 / Invite</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-neutral-950 dark:text-white">Invite Friends &amp; Group Admins</h3>
                    <p className="text-xs text-neutral-500">Share your custom affiliate link and receive 10 promotion credits for each user signing up!</p>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl text-[10px] font-mono font-semibold truncate select-all">
                      https://grouplinks.app/?ref={user.referralCode}
                    </div>
                    <button
                      onClick={handleCopyReferral}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {isReferralCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{isReferralCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Task: Share Group Links on Social Media */}
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase">Social Share</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">+8 Credits</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-neutral-950 dark:text-white">Share Directory Page</h3>
                    <p className="text-xs text-neutral-500">Share the GroupLinks directory hub link on your WhatsApp status, Twitter, or Facebook timeline to bring organic traffic.</p>
                  </div>
                  {renderTaskButton(
                    'share_social',
                    'https://twitter.com/intent/tweet?text=Join%20active%20WhatsApp%20and%20Telegram%20groups%20on%20GroupLinks!%20https://grouplinks.app',
                    8,
                    'Social Promotion Champion',
                    'social-share-task',
                    'Share Hub Page',
                    'Sharing Hub'
                  )}
                </div>

                {/* Task: Quality Assurance Link Patrol */}
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase">Moderation Patrol</span>
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono">+4 Credits</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-neutral-950 dark:text-white">Report Broken / Spam Invite Links</h3>
                    <p className="text-xs text-neutral-500">Help clean up the directory. Review listed links, flag spam groups, and report dead invites to help maintain directory quality.</p>
                  </div>
                  {renderTaskButton(
                    'report_link',
                    '/explore',
                    4,
                    'Link Quality Inspector',
                    'report-task',
                    'Report Dead Link',
                    'Reporting Dead Links'
                  )}
                </div>

                {/* Task: Trustpilot/Platform Review */}
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase">Platform Review</span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">+15 Credits</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-neutral-950 dark:text-white">Submit Platform Feedback</h3>
                    <p className="text-xs text-neutral-500">Contribute helpful feedback or write an honest review about your experience with GroupLinks to help us build a better platform.</p>
                  </div>
                  {renderTaskButton(
                    'review_platform',
                    'https://trustpilot.com/review/grouplinks.app',
                    15,
                    'Honest Feedback Contributor',
                    'review-platform-task',
                    'Write Honest Review',
                    'Submitting Review'
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CREDIT LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div>
                <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">Credit Transaction Ledger</h2>
                <p className="text-xs text-neutral-500">Review your full history of earned, bonus, and utilized promotion credits.</p>
              </div>

              {ledger.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 text-xs">No transactions recorded. Purchase points or complete tasks to add credits to your balance.</div>
              ) : (
                <div className="overflow-x-auto border border-neutral-100 dark:border-neutral-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        <th className="p-4">Type</th>
                        <th className="p-4">Description / Reason</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {ledger.map((tx) => (
                        <tr key={tx.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                          <td className="p-4 font-bold">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] ${
                              tx.amount > 0 
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200' 
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-neutral-800 dark:text-neutral-200">{tx.reason}</td>
                          <td className={`p-4 font-black font-mono ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                          </td>
                          <td className="p-4 text-right text-neutral-400 font-mono text-[11px]">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS & PRIVACY */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 1: Data Privacy */}
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white">Data Privacy &amp; GDPR compliance</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Control your data, download account exports, or request permanent deletion.</p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleExportData}
                  className="w-full py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download My Data (JSON)</span>
                </button>

                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Account &amp; Erase Data</span>
                </button>
              </div>
            </div>

            {/* Box 2: Account Information */}
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white">Account Details</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Your profile properties and security identifier.</p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-400">User ID</span>
                  <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{user.id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-400">Referral Code</span>
                  <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{user.referralCode}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-neutral-400">Registered On</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Modals & Popups */}
      {selectedGroupForAction && (
        <PromoteWithCreditsModal
          isOpen={isPromoteModalOpen}
          initialPlanId={selectedPlanForAction}
          onClose={() => {
            setIsPromoteModalOpen(false);
            fetchDashboardData();
          }}
          group={selectedGroupForAction}
          userCredits={user.creditsBalance}
          onSuccess={(updated, newBal) => {
            setUser(prev => ({ ...prev, creditsBalance: newBal }));
            fetchDashboardData();
          }}
        />
      )}

      <ClaimCommunityModal
        isOpen={isClaimModalOpen}
        onClose={() => {
          setIsClaimModalOpen(false);
          fetchDashboardData();
        }}
        group={selectedGroupForAction}
        onSuccess={() => fetchDashboardData()}
      />

      {isBuyPointsModalOpen && (
        <BuyPointsModal
          isOpen={isBuyPointsModalOpen}
          onClose={() => {
            setIsBuyPointsModalOpen(false);
            fetchDashboardData();
          }}
          currentUser={user}
          initialPackageId={selectedPointsPackageId}
          onSuccess={async () => {
            setIsBuyPointsModalOpen(false);
            await fetchDashboardData();
          }}
        />
      )}
    </div>
  );
};
