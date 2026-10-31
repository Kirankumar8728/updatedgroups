'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, 
  Coins,
  X, 
  Search, 
  Pin, 
  Trash2, 
  Edit, 
  PlusCircle, 
  Megaphone, 
  ShieldAlert, 
  KeyRound, 
  ExternalLink, 
  CheckCircle2, 
  CheckSquare,
  Clock, 
  Flame, 
  AlertTriangle, 
  LogOut, 
  Eye, 
  EyeOff,
  Check, 
  RotateCcw,
  Copy,
  Smartphone,
  Shield,
  RefreshCw,
  Layers,
  Mail,
  Send,
  Code2,
  Globe,
  Download,
  Upload,
  Database,
  FileJson,
  HardDrive,
  FileCheck,
  ChevronDown,
  MessageSquare,
  Loader2,
  FileText,
  Tag,
  Pause,
  Play,
  Square,
  Zap,
  Server,
  Bell,
  BarChart3,
  TrendingUp,
  WifiOff,
  FileUp,
  Activity,
  Sparkles,
  Radio,
  Moon,
  ImageOff,
  Image as ImageIcon,
  Lock,
  Unlock
} from 'lucide-react';
import { AdminHealthReport } from './AdminHealthReport';
import type { BackgroundImportJob } from '@/src/lib/background-importer';
import { 
  getCustomScriptsConfig, 
  fetchCustomScriptsFromServer,
  saveCustomScriptsConfig, 
  saveCustomScriptsConfigAsync,
  CustomScriptsConfig 
} from '../utils/customScriptManager';
import { Group, Platform, Category, Language, Region, AdPlacement, AdSlot, AdTargeting, AdFormat } from '../types';
import { 
  PLATFORM_CONFIGS, 
  CATEGORIES, 
  LANGUAGES,
  REGIONS,
  formatMemberCount, 
  isAdultGroup, 
  isGroupCurrentlySticky, 
  getRemainingStickyTime,
  generateSlug,
  calculateRankScore,
  calculateRankGrade,
  detectPlatformFromUrl,
  ensureUrlMatchesPlatform,
  extractUrlsFromText
} from '../utils/helpers';
import { 
  getStoredKeywords, 
  saveStoredKeywords, 
  DEFAULT_ADULT_KEYWORDS, 
  analyzeGroupContent,
  isAutoFilterEnabled,
  setAutoFilterEnabled
} from '../utils/keywordFilter';
import { 
  getStoredAds, 
  saveStoredAds, 
  isGlobalAdsEnabled,
  setGlobalAdsEnabled,
  isUserAdsVisible,
  setUserAdsVisible
} from '../utils/adManager';
import { MassDeleteConfirmationModal } from './MassDeleteConfirmationModal';
import { 
  AUTHORIZED_ADMIN_EMAIL, 
  TwoFactorMethod,
  getAdminCredentials, 
  saveAdminCredentials, 
  updateTwoFactorSettings,
  refreshBackupCodes,
  getAdminAuthHeaders
} from '../utils/adminAuth';
import { 
  generateTotpCode, 
  verifyTotpCode, 
  getOtpAuthUri,
  generateBase32Secret,
  formatSecretKey
} from '../utils/totp';
import { PlatformIcon } from './PlatformIcon';
import { AdminRestrictedKeywordsManager } from './AdminRestrictedKeywordsManager';
import { AdminCommentsManager } from './AdminCommentsManager';
import { AdminPromotionsManager } from './AdminPromotionsManager';
import { AdminNotificationsManager } from './AdminNotificationsManager';
import { PushSubscriberBackupUtility } from './PushSubscriberBackupUtility';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onUpdateGroup: (updated: Group) => void;
  onDeleteGroup: (groupId: string) => void;
  onBulkDeleteGroups?: (groupIds: string[]) => Promise<void> | void;
  onAddGroup: (newGroup: Group) => void;
  onLogout: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  groups,
  onUpdateGroup,
  onDeleteGroup,
  onBulkDeleteGroups,
  onAddGroup,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'adsenseSafety' | 'promotions' | 'userCredits' | 'rewards' | 'directFilter' | 'keywords' | 'restrictedKeywords' | 'comments' | 'ads' | 'adsTxt' | 'customScripts' | 'security' | 'twofactor' | 'backup' | 'bulkImport' | 'notifications' | 'healthAutomation' | 'dmcaReviews'>('groups');

  // AdSense Safe Mode & Adult Content Visibility State
  const [hideAdultContent, setHideAdultContent] = useState<boolean>(true);
  const [isUpdatingAdultSetting, setIsUpdatingAdultSetting] = useState<boolean>(false);
  const [adultSettingNotice, setAdultSettingNotice] = useState<string>('');

  // User Group Updates Control State (Master Admin Switch)
  const [allowUserGroupUpdates, setAllowUserGroupUpdates] = useState<boolean>(true);
  const [isUpdatingUserUpdatesSetting, setIsUpdatingUserUpdatesSetting] = useState<boolean>(false);

  const fetchContentSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/content-settings', {
        headers: {
          ...getAdminAuthHeaders()
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setHideAdultContent(Boolean(data.settings.hideAdultContent));
          setAllowUserGroupUpdates(data.settings.allowUserGroupUpdates !== false);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchContentSettings();
    }
  }, [isOpen, fetchContentSettings]);

  const handleToggleAdultVisibility = async (newHiddenValue: boolean) => {
    setIsUpdatingAdultSetting(true);
    setAdultSettingNotice('');
    try {
      const res = await fetch('/api/admin/content-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders()
        },
        body: JSON.stringify({ hideAdultContent: newHiddenValue })
      });
      const data = await res.json();
      if (data.success) {
        setHideAdultContent(Boolean(data.settings.hideAdultContent));
        setAdultSettingNotice(data.message || 'Settings updated successfully!');
        setTimeout(() => setAdultSettingNotice(''), 6000);
        fetchAdminPage(1);
      } else {
        alert(data.error || 'Failed to update content settings');
      }
    } catch (err: any) {
      alert(err.message || 'Network error updating settings');
    } finally {
      setIsUpdatingAdultSetting(false);
    }
  };

  const handleToggleUserGroupUpdates = async (newAllowedValue: boolean) => {
    setIsUpdatingUserUpdatesSetting(true);
    setAdultSettingNotice('');
    try {
      const res = await fetch('/api/admin/content-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders()
        },
        body: JSON.stringify({ allowUserGroupUpdates: newAllowedValue })
      });
      const data = await res.json();
      if (data.success) {
        setAllowUserGroupUpdates(Boolean(data.settings.allowUserGroupUpdates));
        setAdultSettingNotice(data.message || 'User update permissions updated!');
        setTimeout(() => setAdultSettingNotice(''), 6000);
      } else {
        alert(data.error || 'Failed to update user update permissions');
      }
    } catch (err: any) {
      alert(err.message || 'Network error updating permissions');
    } finally {
      setIsUpdatingUserUpdatesSetting(false);
    }
  };

  // Reward Settings State
  const [rewardSettings, setRewardSettings] = useState({
    signupBonus: 5,
    upvoteReward: 1,
    shareReward: 1,
    ratingReward: 1,
    commentReward: 1,
    referralReward: 1,
  });
  const [isSavingRewards, setIsSavingRewards] = useState(false);
  const [rewardSuccessMessage, setRewardSuccessMessage] = useState('');

  const fetchRewardSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/rewards');
      const data = await res.json();
      if (data.success && data.settings) {
        setRewardSettings(data.settings);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'rewards') {
      fetchRewardSettings();
    }
  }, [isOpen, activeTab, fetchRewardSettings]);

  const handleSaveRewardSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRewards(true);
    setRewardSuccessMessage('');
    try {
      const res = await fetch('/api/admin/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardSettings),
      });
      const data = await res.json();
      if (data.success) {
        setRewardSuccessMessage(data.message || 'Reward settings updated successfully!');
        if (data.settings) setRewardSettings(data.settings);
      } else {
        alert(data.error || 'Failed to update reward settings.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save reward settings.');
    } finally {
      setIsSavingRewards(false);
    }
  };

  // Bulk Add Links State
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkCategory, setBulkCategory] = useState<Category | 'auto'>('auto');
  const [bulkLanguage, setBulkLanguage] = useState<Language>('English');
  const [bulkRegion, setBulkRegion] = useState<Region>('Global');
  const [bulkAutoScrape, setBulkAutoScrape] = useState(true);
  const [bulkIsProcessing, setBulkIsProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState<{
    id: string;
    url: string;
    platform: Platform;
    title?: string;
    description?: string;
    imageUrl?: string;
    category?: string;
    status: 'pending' | 'scraping' | 'publishing' | 'success' | 'error';
    errorMessage?: string;
    createdGroup?: Group;
  }[]>([]);
  const [bulkSummary, setBulkSummary] = useState<{
    total: number;
    success: number;
    failed: number;
  } | null>(null);

  // Server-Side Background Import Queue State (Offline-Safe for 20,000+ links)
  const [bgImportMode, setBgImportMode] = useState<'fileUpload' | 'quickPaste'>('fileUpload');
  const [bgJob, setBgJob] = useState<BackgroundImportJob | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgFileContent, setBgFileContent] = useState('');
  const [bgFileStats, setBgFileStats] = useState<{
    fileName: string;
    sizeBytes: number;
    rawLines: number;
    validUrls: number;
    platformCounts: Record<string, number>;
  } | null>(null);
  const [bgConcurrency, setBgConcurrency] = useState<number>(3);
  const [bgDelayMs, setBgDelayMs] = useState<number>(300);
  const [bgMarkVerified, setBgMarkVerified] = useState<boolean>(false);
  const [bgIsStarting, setBgIsStarting] = useState(false);
  const [bgActionLoading, setBgActionLoading] = useState(false);
  const [bgNotice, setBgNotice] = useState<string | null>(null);

  // Backup & Restore State
  const [backupExporting, setBackupExporting] = useState(false);
  const [backupRestoring, setBackupRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupPreview, setBackupPreview] = useState<{
    version?: string;
    exportedAt?: string;
    totalGroups: number;
    totalCommentsCount: number;
    totalRatingsCount: number;
    totalStickyCount: number;
    totalNsfwCount: number;
    customKeywordsCount: number;
    adPlacementsCount: number;
    hasScriptsConfig: boolean;
    rawPayload: any;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  // Reset Engagement Metrics to Zero State
  const [showResetMetricsModal, setShowResetMetricsModal] = useState(false);
  const [isResettingMetrics, setIsResettingMetrics] = useState(false);
  const [resetMetricsSuccess, setResetMetricsSuccess] = useState<string | null>(null);
  const [resetMetricsError, setResetMetricsError] = useState<string | null>(null);
  const [resetOptions, setResetOptions] = useState({
    resetUpvotes: true,
    resetJoins: true,
    resetShares: true,
  });

  // Groups management state & server pagination
  const [adminGroups, setAdminGroups] = useState<Group[]>(groups);
  const [adminTotalCount, setAdminTotalCount] = useState<number>(groups.length);
  const [adminPage, setAdminPage] = useState<number>(1);
  const [adminPageSize, setAdminPageSize] = useState<number>(25);
  const [adminTotalPages, setAdminTotalPages] = useState<number>(1);
  const [isLoadingAdminGroups, setIsLoadingAdminGroups] = useState<boolean>(false);
  const [adminFetchError, setAdminFetchError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedFilterType, setSelectedFilterType] = useState<'all' | 'sticky' | 'adult' | 'adult_only' | 'adult_hidden' | 'verified'>('all');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkDeleteNotice, setBulkDeleteNotice] = useState<string | null>(null);
  const [actionProgress, setActionProgress] = useState<{
    title: string;
    current: number;
    total: number;
    statusText?: string;
    color?: 'indigo' | 'rose' | 'amber' | 'purple' | 'emerald';
  } | null>(null);
  
  // Modals inside Admin
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [promotingGroup, setPromotingGroup] = useState<Group | null>(null);
  const [unstickingGroup, setUnstickingGroup] = useState<Group | null>(null);
  const [unstickConfirmTitle, setUnstickConfirmTitle] = useState('');
  const [unstickError, setUnstickError] = useState<string | null>(null);
  const [copiedUnstickTitle, setCopiedUnstickTitle] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [stickyDurationHours, setStickyDurationHours] = useState<number>(24);
  const [customStickyHours] = useState<string>('24');
  const [stickyOrderVal, setStickyOrderVal] = useState<number>(1);

  // Keyword management state
  const [keywordsList, setKeywordsList] = useState<string[]>(() => getStoredKeywords());
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [testText, setTestText] = useState('');
  const [keywordNotice, setKeywordNotice] = useState<string | null>(null);

  // Direct groups filter state
  const [directFilterSearch, setDirectFilterSearch] = useState('');
  const [directFilterAdultMode, setDirectFilterAdultMode] = useState<'all' | 'safe' | 'adult'>('all');

  // Filtered groups for Direct groups filter tab
  const filteredDirectFilterGroups = useMemo(() => {
    return groups.filter(g => {
      const isAdult = isAdultGroup(g);
      if (directFilterAdultMode === 'safe' && isAdult) return false;
      if (directFilterAdultMode === 'adult' && !isAdult) return false;

      if (directFilterSearch.trim()) {
        const q = directFilterSearch.toLowerCase();
        return (
          g.title.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          g.platform.toLowerCase().includes(q) ||
          (g.description && g.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [groups, directFilterAdultMode, directFilterSearch]);

  // Ads management state
  const [adsList, setAdsList] = useState<AdPlacement[]>(() => getStoredAds());
  const [globalAdsOn, setGlobalAdsOn] = useState<boolean>(() => isGlobalAdsEnabled());
  const [editingAd, setEditingAd] = useState<AdPlacement | null>(null);
  const [isCreatingAd, setIsCreatingAd] = useState(false);
  const [adsNotice, setAdsNotice] = useState<string | null>(null);
  const [adDomainFilter, setAdDomainFilter] = useState<'all' | 'safe' | 'adult'>('all');

  // Mass deletion confirmation modal state
  const [isMassDeleteConfirmModalOpen, setIsMassDeleteConfirmModalOpen] = useState(false);
  const [massDeleteModalProgress, setMassDeleteModalProgress] = useState(0);

  // Security & Password state
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // Custom Credits Tool state
  const [customCreditEmail, setCustomCreditEmail] = useState('');
  const [customCreditAmount, setCustomCreditAmount] = useState<number>(50);
  const [customCreditReason, setCustomCreditReason] = useState('');
  const [customCreditMode, setCustomCreditMode] = useState<'add' | 'set'>('add');
  const [customCreditNotice, setCustomCreditNotice] = useState<string | null>(null);
  const [customCreditError, setCustomCreditError] = useState<string | null>(null);
  const [isGrantingCustomCredits, setIsGrantingCustomCredits] = useState(false);

  const handleGrantCustomCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomCreditNotice(null);
    setCustomCreditError(null);

    if (!customCreditEmail || !customCreditEmail.includes('@')) {
      setCustomCreditError('Please enter a valid user email address.');
      return;
    }

    if (isNaN(customCreditAmount)) {
      setCustomCreditError('Please enter a valid credit amount.');
      return;
    }

    setIsGrantingCustomCredits(true);
    try {
      const res = await fetch('/api/admin/users/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({
          email: customCreditEmail.trim().toLowerCase(),
          amount: Number(customCreditAmount),
          reason: customCreditReason.trim() || undefined,
          mode: customCreditMode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCustomCreditNotice(data.message || `Successfully updated credits for ${customCreditEmail}`);
        setCustomCreditReason('');
      } else {
        setCustomCreditError(data.error || 'Failed to update custom credits.');
      }
    } catch (err: any) {
      setCustomCreditError(err.message || 'Server error updating credits.');
    } finally {
      setIsGrantingCustomCredits(false);
    }
  };

  // Custom Scripts / SEO / Tracking Verification state
  const [scriptsConfig, setScriptsConfig] = useState<CustomScriptsConfig>(() => getCustomScriptsConfig());
  const [scriptsNotice, setScriptsNotice] = useState<string | null>(null);
  const [isSavingScripts, setIsSavingScripts] = useState(false);
  const [liveInjectedStats, setLiveInjectedStats] = useState<{ activeCount: number; headCount: number; bodyCount: number }>({ activeCount: 0, headCount: 0, bodyCount: 0 });
  const [isInspectingDom, setIsInspectingDom] = useState(false);
  const [injectedNodesList, setInjectedNodesList] = useState<{ tag: string; section: string; preview: string }[]>([]);

  const refreshInjectedDomStats = useCallback(() => {
    if (typeof window === 'undefined') return;
    const all = Array.from(document.querySelectorAll('[data-grouplinks-injected="true"]'));
    const headCount = all.filter(el => el.getAttribute('data-grouplinks-section') === 'head').length;
    const bodyCount = all.filter(el => el.getAttribute('data-grouplinks-section') === 'body').length;
    setLiveInjectedStats({
      activeCount: all.length,
      headCount,
      bodyCount,
    });
    setInjectedNodesList(
      all.map(el => ({
        tag: el.tagName.toLowerCase(),
        section: el.getAttribute('data-grouplinks-section') || (el.parentElement?.tagName.toLowerCase() === 'head' ? 'head' : 'body'),
        preview: (el.outerHTML || '').slice(0, 160) + ((el.outerHTML || '').length > 160 ? '...' : ''),
      }))
    );
  }, []);

  const handleSaveScriptsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingScripts(true);
    try {
      await saveCustomScriptsConfigAsync(scriptsConfig);
      refreshInjectedDomStats();
      setScriptsNotice('✅ Header & footer custom codes saved and active live in website DOM!');
    } catch {
      saveCustomScriptsConfig(scriptsConfig);
      refreshInjectedDomStats();
      setScriptsNotice('✅ Header & footer custom codes saved!');
    } finally {
      setIsSavingScripts(false);
      setTimeout(() => {
        setScriptsNotice(null);
        refreshInjectedDomStats();
      }, 5000);
    }
  };

  // ads.txt state & methods
  const [adsTxtContent, setAdsTxtContent] = useState<string>('');
  const [isLoadingAdsTxt, setIsLoadingAdsTxt] = useState(false);
  const [isSavingAdsTxt, setIsSavingAdsTxt] = useState(false);
  const [adsTxtNotice, setAdsTxtNotice] = useState<string | null>(null);
  const [adsTxtError, setAdsTxtError] = useState<string | null>(null);
  const [adsTxtTestStatus, setAdsTxtTestStatus] = useState<{ checked: boolean; ok: boolean; statusText: string; linesCount: number } | null>(null);
  const [isTestingAdsTxt, setIsTestingAdsTxt] = useState(false);

  const fetchAdsTxt = useCallback(async () => {
    setIsLoadingAdsTxt(true);
    try {
      const res = await fetch('/api/admin/ads-txt', {
        headers: getAdminAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.content === 'string') {
          setAdsTxtContent(data.content);
        }
      }
    } catch (err) {
      console.warn('Failed to load ads.txt:', err);
    } finally {
      setIsLoadingAdsTxt(false);
    }
  }, []);

  const handleSaveAdsTxt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingAdsTxt(true);
    setAdsTxtNotice(null);
    setAdsTxtError(null);
    try {
      const res = await fetch('/api/admin/ads-txt', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ content: adsTxtContent }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdsTxtNotice('✅ ads.txt updated successfully and published live at /ads.txt immediately!');
        setTimeout(() => setAdsTxtNotice(null), 5000);
      } else {
        setAdsTxtError(data.error || 'Failed to save ads.txt');
      }
    } catch (err: any) {
      setAdsTxtError(err.message || 'Error saving ads.txt');
    } finally {
      setIsSavingAdsTxt(false);
    }
  };

  const handleTestAdsTxtLive = async () => {
    setIsTestingAdsTxt(true);
    try {
      const res = await fetch('/ads.txt?t=' + Date.now());
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
      setAdsTxtTestStatus({
        checked: true,
        ok: res.ok,
        statusText: `${res.status} ${res.statusText}`,
        linesCount: lines,
      });
    } catch (err: any) {
      setAdsTxtTestStatus({
        checked: true,
        ok: false,
        statusText: err.message || 'Failed to reach /ads.txt',
        linesCount: 0,
      });
    } finally {
      setIsTestingAdsTxt(false);
    }
  };

  // 2FA Security State
  const [adminCreds, setAdminCreds] = useState(() => getAdminCredentials());
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean>(() => adminCreds.twoFactorEnabled);
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>(() => adminCreds.twoFactorMethod || 'email_otp');
  const [twoFactorSecret, setTwoFactorSecret] = useState<string>(() => adminCreds.twoFactorSecret);
  const [backupCodes, setBackupCodes] = useState<string[]>(() => adminCreds.backupCodes);
  const [testTotpInput, setTestTotpInput] = useState('');
  const [twoFactorNotice, setTwoFactorNotice] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  
  // Live TOTP clock & current live code preview
  const [currentLiveCode, setCurrentLiveCode] = useState('000000');
  const [totpSecondsRemaining, setTotpSecondsRemaining] = useState(30);

  useEffect(() => {
    const updateLiveTotp = () => {
      const now = Date.now();
      const rem = 30 - (Math.floor(now / 1000) % 30);
      setTotpSecondsRemaining(rem);
      if (twoFactorSecret) {
        setCurrentLiveCode(generateTotpCode(twoFactorSecret, 30, now));
      }
    };
    updateLiveTotp();
    const interval = setInterval(updateLiveTotp, 1000);
    return () => clearInterval(interval);
  }, [twoFactorSecret]);

  // Refresh credentials when opened
  useEffect(() => {
    if (isOpen) {
      const creds = getAdminCredentials();
      setAdminCreds(creds);
      setIs2FAEnabled(creds.twoFactorEnabled);
      setTwoFactorMethod(creds.twoFactorMethod || 'email_otp');
      setTwoFactorSecret(creds.twoFactorSecret);
      setBackupCodes(creds.backupCodes);
      setGlobalAdsOn(isGlobalAdsEnabled());
      setScriptsConfig(getCustomScriptsConfig());
      fetchCustomScriptsFromServer().then(srv => {
        if (srv) {
          setScriptsConfig(srv);
        }
        refreshInjectedDomStats();
      }).catch(() => {});
      fetchAdsTxt();
      refreshInjectedDomStats();
    }

    const handleScriptStatus = () => {
      refreshInjectedDomStats();
    };
    window.addEventListener('grouplinks_scripts_status', handleScriptStatus);
    return () => {
      window.removeEventListener('grouplinks_scripts_status', handleScriptStatus);
    };
  }, [isOpen, activeTab, fetchAdsTxt, refreshInjectedDomStats]);

  // Server-side groups pagination & querying engine
  const fetchAdminPage = useCallback(async (pageToLoad = 1, size = adminPageSize, resetSelection = false) => {
    setIsLoadingAdminGroups(true);
    setAdminFetchError(null);
    try {
      const params = new URLSearchParams();
      params.set('adminMode', 'true');
      params.set('includeAdult', 'true');
      params.set('page', String(pageToLoad));
      params.set('pageSize', String(size));
      params.set('_t', String(Date.now()));

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      if (selectedPlatform && selectedPlatform !== 'all') {
        params.set('platform', selectedPlatform);
      }
      if (selectedFilterType === 'sticky') {
        params.set('stickyOnly', 'true');
      } else if (selectedFilterType === 'adult' || selectedFilterType === 'adult_hidden') {
        params.set('hideAdultFilter', 'true');
      } else if (selectedFilterType === 'adult_only') {
        params.set('showAdultOnly', 'true');
      } else if (selectedFilterType === 'verified') {
        params.set('verifiedOnly', 'true');
      }

      const res = await fetch(`/api/groups?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();

      const newGroups: Group[] = Array.isArray(data.groups) ? data.groups : [];
      const totalCount = typeof data.total === 'number' ? data.total : newGroups.length;
      const totalPages = data.totalPages || Math.ceil(totalCount / size) || 1;

      setAdminGroups(newGroups);
      setAdminTotalCount(totalCount);
      setAdminTotalPages(totalPages);
      setAdminPage(pageToLoad);
      if (resetSelection) {
        setSelectedGroupIds([]);
      }
    } catch (err: any) {
      console.error('Error fetching admin groups:', err);
      setAdminFetchError(err.message || 'Failed to load communities');
    } finally {
      setIsLoadingAdminGroups(false);
    }
  }, [searchQuery, selectedPlatform, selectedFilterType, adminPageSize]);

  // Auto-fetch admin groups on open, query, platform, filterType, or pageSize change
  useEffect(() => {
    if (isOpen && activeTab === 'groups') {
      const timer = setTimeout(() => {
        fetchAdminPage(1, adminPageSize, false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab, searchQuery, selectedPlatform, selectedFilterType, adminPageSize, fetchAdminPage]);

  // Filter groups in admin table (now server-paginated & filtered)
  const filteredAdminGroups = adminGroups;

  // Bulk action dropdown & loading state
  const [openBulkDropdown, setOpenBulkDropdown] = useState<'sticky' | 'status' | 'flags' | 'category' | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [rescrapingGroupId, setRescrapingGroupId] = useState<string | null>(null);

  const handleForceRescrapeGroup = async (group: Group) => {
    if (!group || !group.id) return;
    setRescrapingGroupId(group.id);
    try {
      const headers = getAdminAuthHeaders();
      const res = await fetch('/api/admin/rescrape', {
        method: 'POST',
        headers,
        body: JSON.stringify({ groupId: group.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(`Re-scrape failed: ${data.error || 'Server error'}`);
        return;
      }
      if (data.updatedGroup) {
        setAdminGroups(prev => prev.map(item => item.id === group.id ? data.updatedGroup : item));
        await onUpdateGroup(data.updatedGroup);
        alert(`✅ Metadata & icon re-scraped for "${data.updatedGroup.title}"! Updated live.`);
      }
    } catch (err: any) {
      alert(`Re-scrape error: ${err.message || 'Network error'}`);
    } finally {
      setRescrapingGroupId(null);
    }
  };

  const handleRemoveGroupImage = async (group: Group) => {
    if (!group || !group.id) return;
    const isAdult = isAdultGroup(group);
    const iconType = isAdult ? 'default 18+ Adult Icon' : 'category default fallback icon';

    if (!confirm(`Are you sure you want to remove the image for "${group.title}"? The group will immediately revert to the ${iconType}.`)) return;

    const updated: Group = {
      ...group,
      imageUrl: '',
      bannerUrl: '',
      updatedAt: new Date().toISOString(),
    };

    try {
      if (group.imageUrl && (group.imageUrl.startsWith('/images/') || group.imageUrl.startsWith('/image/') || group.imageUrl.includes('grouplinks.app/image/'))) {
        fetch('/api/image/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeaders(),
          },
          body: JSON.stringify({
            url: group.imageUrl,
            groupId: group.id,
          }),
        }).catch(() => {});
      } else if (group.imageUrl && group.imageUrl.includes('cdn.grouplinks.app')) {
        fetch('/api/admin/rescrape', {
          method: 'POST',
          headers: getAdminAuthHeaders(),
          body: JSON.stringify({
            groupId: group.id,
            action: 'unlink_image',
          }),
        }).catch(() => {});
      }

      await triggerUpdateGroup(updated);
      alert(`✅ Image removed for "${group.title}". Reverted to ${iconType}!`);
    } catch (err: any) {
      alert(`Failed to remove group image: ${err.message || 'Server error'}`);
    }
  };

  const handleChangeGroupImage = async (group: Group) => {
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
        setAdminGroups(prev => prev.map(item => item.id === group.id ? data.updatedGroup : item));
        await onUpdateGroup(data.updatedGroup);
        alert(`✅ Group image updated & uploaded to Cloudflare R2 for "${group.title}"!`);
      }
    } catch (err: any) {
      alert(`Error updating image: ${err.message || 'Network error'}`);
    }
  };

  const handleToggleGroupLock = async (group: Group) => {
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
        setAdminGroups(prev => prev.map(item => item.id === group.id ? data.updatedGroup : item));
        await onUpdateGroup(data.updatedGroup);
        alert(data.message || (newLock ? '🔒 Group updates locked' : '🔓 Group updates unlocked'));
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'Network error'}`);
    }
  };

  // Persistent API triggers for Group changes
  const triggerUpdateGroup = async (updated: Group) => {
    try {
      await fetch(`/api/groups/${encodeURIComponent(updated.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Failed to update group via API:', err);
    }
    setAdminGroups(prev => prev.map(g => (g.id === updated.id ? updated : g)));
    await onUpdateGroup(updated);
  };

  const triggerDeleteGroup = async (groupId: string) => {
    if (!groupId) return;
    const targetId = groupId.trim();
    setSelectedGroupIds(prev => prev.filter(id => id !== targetId));

    setActionProgress({
      title: 'Deleting Community...',
      current: 0,
      total: 1,
      statusText: 'Connecting to database and deleting item...',
      color: 'rose',
    });

    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
      });
      if (!res.ok) {
        console.warn('DELETE /api/groups/:id returned status', res.status);
      }
    } catch (err) {
      console.error('Failed to delete group via API:', err);
    }

    // Optimistically remove from current view
    setAdminGroups(prev => prev.filter(g => g.id !== targetId && g.slug !== targetId && g.url !== targetId));
    setAdminTotalCount(prev => Math.max(0, prev - 1));

    // Call parent handler
    await onDeleteGroup(targetId);

    setActionProgress({
      title: 'Community Deleted!',
      current: 1,
      total: 1,
      statusText: 'Successfully removed from server and directory.',
      color: 'emerald',
    });

    setTimeout(() => {
      setActionProgress(null);
      fetchAdminPage(adminPage, adminPageSize, false);
    }, 900);
  };

  const triggerAddGroup = async (newGroup: Group) => {
    try {
      await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify(newGroup),
      });
    } catch (err) {
      console.error('Failed to add group via API:', err);
    }
    await onAddGroup(newGroup);
    fetchAdminPage(1, adminPageSize, false);
  };

  // Bulk Actions: Sticky / Promotion
  const handleExecuteBulkSticky = async (hours: number | null, order: number = 1) => {
    if (selectedGroupIds.length === 0) return;
    setIsBulkUpdating(true);
    setOpenBulkDropdown(null);
    const selectedSet = new Set(selectedGroupIds);
    const targetGroups = groups.filter(g => selectedSet.has(g.id));
    const total = targetGroups.length;

    setActionProgress({
      title: hours === null ? 'Removing Sticky Status' : 'Applying Sticky Promotion',
      current: 0,
      total,
      statusText: 'Starting sticky updates...',
      color: 'amber',
    });

    try {
      let current = 0;
      for (const group of targetGroups) {
        current++;
        setActionProgress({
          title: hours === null ? 'Removing Sticky Status' : 'Applying Sticky Promotion',
          current,
          total,
          statusText: `Updating "${group.title}" (${current}/${total})...`,
          color: 'amber',
        });

        if (hours === null) {
          const updated: Group = {
            ...group,
            isSticky: false,
            stickyUntil: undefined,
            stickyOrder: undefined,
            isPromoted: false,
          };
          await triggerUpdateGroup(updated);
        } else {
          const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
          const updated: Group = {
            ...group,
            isSticky: true,
            stickyUntil: expiresAt,
            stickyOrder: Number(order) || 1,
            isPromoted: true,
          };
          await triggerUpdateGroup(updated);
        }
      }

      setActionProgress({
        title: 'Sticky Update Complete!',
        current: total,
        total,
        statusText: `Successfully updated sticky promotion for ${total} group(s)!`,
        color: 'emerald',
      });

      setBulkDeleteNotice(`Successfully updated sticky promotion for ${total} group(s)!`);
      setTimeout(() => {
        setActionProgress(null);
        setBulkDeleteNotice(null);
      }, 3500);
    } catch (err) {
      console.error('Bulk sticky update error:', err);
      setActionProgress(null);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Bulk Actions: Status
  const handleExecuteBulkStatus = async (field: 'verified' | 'featured', value: boolean) => {
    if (selectedGroupIds.length === 0) return;
    setIsBulkUpdating(true);
    setOpenBulkDropdown(null);
    const selectedSet = new Set(selectedGroupIds);
    const targetGroups = groups.filter(g => selectedSet.has(g.id));
    const total = targetGroups.length;

    setActionProgress({
      title: `Updating ${field === 'verified' ? 'Verification' : 'Featured'} Status`,
      current: 0,
      total,
      statusText: 'Starting status updates...',
      color: 'indigo',
    });

    try {
      let current = 0;
      for (const group of targetGroups) {
        current++;
        setActionProgress({
          title: `Updating ${field === 'verified' ? 'Verification' : 'Featured'} Status`,
          current,
          total,
          statusText: `Setting ${field}=${value} for "${group.title}" (${current}/${total})...`,
          color: 'indigo',
        });

        const updated: Group = {
          ...group,
          [field]: value,
        };
        await triggerUpdateGroup(updated);
      }

      setActionProgress({
        title: 'Status Update Complete!',
        current: total,
        total,
        statusText: `Successfully updated ${field} status for ${total} group(s)!`,
        color: 'emerald',
      });

      setBulkDeleteNotice(`Successfully updated ${field} status for ${total} group(s)!`);
      setTimeout(() => {
        setActionProgress(null);
        setBulkDeleteNotice(null);
      }, 3500);
    } catch (err) {
      console.error('Bulk status update error:', err);
      setActionProgress(null);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Bulk Actions: Flags & Moderation
  const handleExecuteBulkFlags = async (action: 'adult_quarantine' | 'mark_safe' | 'enable_direct_pay' | 'disable_direct_pay') => {
    if (selectedGroupIds.length === 0) return;
    setIsBulkUpdating(true);
    setOpenBulkDropdown(null);
    const selectedSet = new Set(selectedGroupIds);
    const targetGroups = groups.filter(g => selectedSet.has(g.id));
    const total = targetGroups.length;

    setActionProgress({
      title: 'Updating Content Flags & Safety',
      current: 0,
      total,
      statusText: 'Starting flag updates...',
      color: 'purple',
    });

    try {
      let current = 0;
      for (const group of targetGroups) {
        current++;
        setActionProgress({
          title: 'Updating Content Flags & Safety',
          current,
          total,
          statusText: `Updating flags for "${group.title}" (${current}/${total})...`,
          color: 'purple',
        });

        let updated: Group = { ...group };
        if (action === 'adult_quarantine') {
          updated.isNsfw = true;
          updated.category = 'Adult / 18+';
        } else if (action === 'mark_safe') {
          updated.isNsfw = false;
          if (updated.category === 'Adult / 18+') {
            updated.category = 'Dating & Social';
          }
        } else if (action === 'enable_direct_pay') {
          updated.showInDirectPromoted = true;
          updated.isDirectPromoted = true;
        } else if (action === 'disable_direct_pay') {
          updated.showInDirectPromoted = false;
          updated.isDirectPromoted = false;
        }
        await triggerUpdateGroup(updated);
      }

      setActionProgress({
        title: 'Flags Update Complete!',
        current: total,
        total,
        statusText: `Successfully updated flags for ${total} group(s)!`,
        color: 'emerald',
      });

      setBulkDeleteNotice(`Successfully updated content flags & safety for ${total} group(s)!`);
      setTimeout(() => {
        setActionProgress(null);
        setBulkDeleteNotice(null);
      }, 3500);
    } catch (err) {
      console.error('Bulk flags update error:', err);
      setActionProgress(null);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Bulk Actions: Category Assignment
  const handleExecuteBulkCategory = async (targetCategory: Category) => {
    if (selectedGroupIds.length === 0) return;
    setIsBulkUpdating(true);
    setOpenBulkDropdown(null);
    const selectedSet = new Set(selectedGroupIds);
    const targetGroups = (adminGroups.length > 0 ? adminGroups : groups).filter(g => selectedSet.has(g.id));
    const total = targetGroups.length;

    setActionProgress({
      title: `Assigning Category: "${targetCategory}"`,
      current: 0,
      total,
      statusText: `Starting category assignment across ${total} group(s)...`,
      color: 'indigo',
    });

    try {
      let current = 0;
      for (const group of targetGroups) {
        current++;
        setActionProgress({
          title: `Assigning Category: "${targetCategory}"`,
          current,
          total,
          statusText: `Setting "${targetCategory}" on "${group.title}" (${current}/${total})...`,
          color: 'indigo',
        });

        const isAdult = targetCategory === 'Adult / 18+';
        const updated: Group = {
          ...group,
          category: targetCategory,
          isNsfw: isAdult ? true : group.isNsfw,
        };
        await triggerUpdateGroup(updated);
      }

      setActionProgress({
        title: 'Category Update Complete!',
        current: total,
        total,
        statusText: `Successfully assigned "${targetCategory}" to ${total} group(s)!`,
        color: 'emerald',
      });

      setBulkDeleteNotice(`Updated category to "${targetCategory}" for ${total} group(s)!`);
      setTimeout(() => {
        setActionProgress(null);
        setBulkDeleteNotice(null);
      }, 3500);
    } catch (err) {
      console.error('Bulk category update error:', err);
      setActionProgress(null);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Bulk Selection Helpers & Presets
  const isAllFilteredSelected = useMemo(() => {
    if (adminGroups.length === 0) return false;
    return adminGroups.every(g => selectedGroupIds.includes(g.id));
  }, [adminGroups, selectedGroupIds]);

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredSet = new Set(adminGroups.map(g => g.id));
      setSelectedGroupIds(prev => prev.filter(id => !filteredSet.has(id)));
    } else {
      const filteredIds = adminGroups.map(g => g.id);
      setSelectedGroupIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleSelectGroup = (id: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectPreset = (preset: string) => {
    let ids: string[] = [];
    if (preset === 'all_filtered') {
      ids = adminGroups.map(g => g.id);
    } else if (preset === 'adult_only') {
      ids = adminGroups.filter(g => isAdultGroup(g)).map(g => g.id);
    } else if (preset === 'safe_only') {
      ids = adminGroups.filter(g => !isAdultGroup(g)).map(g => g.id);
    } else if (preset === 'sticky_only') {
      ids = adminGroups.filter(g => isGroupCurrentlySticky(g)).map(g => g.id);
    } else if (preset === 'verified_only') {
      ids = adminGroups.filter(g => g.verified).map(g => g.id);
    } else if (preset === 'unverified_only') {
      ids = adminGroups.filter(g => !g.verified).map(g => g.id);
    } else if (preset.startsWith('platform_')) {
      const plat = preset.replace('platform_', '').toLowerCase();
      ids = adminGroups.filter(g => g.platform.toLowerCase() === plat).map(g => g.id);
    }

    if (preset === 'clear') {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(Array.from(new Set([...selectedGroupIds, ...ids])));
    }
  };

  const handleExecuteBulkDelete = () => {
    if (selectedGroupIds.length === 0) return;
    setIsMassDeleteConfirmModalOpen(true);
  };

  const handleConfirmMassDelete = async () => {
    if (selectedGroupIds.length === 0) return;
    const count = selectedGroupIds.length;
    setIsDeletingBulk(true);
    setMassDeleteModalProgress(10);
    const idsToDelete = [...selectedGroupIds];

    setActionProgress({
      title: `Bulk Deleting ${count} Selected Community/Communities...`,
      current: 0,
      total: count,
      statusText: 'Connecting to database server and verifying admin session...',
      color: 'rose',
    });

    try {
      setMassDeleteModalProgress(35);
      if (onBulkDeleteGroups) {
        await onBulkDeleteGroups(idsToDelete);
      } else {
        const res = await fetch('/api/groups', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: idsToDelete }),
        });
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
      }

      setMassDeleteModalProgress(80);

      // Optimistically update view
      const deletedSet = new Set(idsToDelete);
      setAdminGroups(prev => prev.filter(g => !deletedSet.has(g.id) && !deletedSet.has(g.slug || '') && !deletedSet.has(g.url)));
      setAdminTotalCount(prev => Math.max(0, prev - count));
      setSelectedGroupIds([]);

      setMassDeleteModalProgress(100);

      setActionProgress({
        title: `Bulk Deletion Complete!`,
        current: count,
        total: count,
        statusText: `Successfully deleted ${count} group(s) from server database.`,
        color: 'emerald',
      });
      setBulkDeleteNotice(`Successfully deleted ${count} community group(s).`);
    } catch (err) {
      console.error('Bulk deletion failed:', err);
      setBulkDeleteNotice('Failed to complete mass deletion. Please check server logs.');
    } finally {
      setIsDeletingBulk(false);
      setIsMassDeleteConfirmModalOpen(false);
      setMassDeleteModalProgress(0);
      setTimeout(() => {
        setActionProgress(null);
        setBulkDeleteNotice(null);
        fetchAdminPage(adminPage, adminPageSize, true);
      }, 1500);
    }
  };

  // Direct Groups Filter Selection State & Handlers
  const [selectedDirectFilterGroupIds, setSelectedDirectFilterGroupIds] = useState<string[]>([]);

  const isAllDirectFilterSelected = useMemo(() => {
    if (filteredDirectFilterGroups.length === 0) return false;
    return filteredDirectFilterGroups.every(g => selectedDirectFilterGroupIds.includes(g.id));
  }, [filteredDirectFilterGroups, selectedDirectFilterGroupIds]);

  const handleToggleSelectAllDirectFilter = () => {
    if (isAllDirectFilterSelected) {
      const filteredSet = new Set(filteredDirectFilterGroups.map(g => g.id));
      setSelectedDirectFilterGroupIds(prev => prev.filter(id => !filteredSet.has(id)));
    } else {
      const filteredIds = filteredDirectFilterGroups.map(g => g.id);
      setSelectedDirectFilterGroupIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleSelectDirectFilterGroup = (id: string) => {
    setSelectedDirectFilterGroupIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDirectFilterPreset = (preset: string) => {
    let ids: string[] = [];
    if (preset === 'all_filtered') {
      ids = filteredDirectFilterGroups.map(g => g.id);
    } else if (preset === 'adult_only') {
      ids = groups.filter(g => isAdultGroup(g)).map(g => g.id);
    } else if (preset === 'safe_only') {
      ids = groups.filter(g => !isAdultGroup(g)).map(g => g.id);
    } else if (preset === 'sticky_only') {
      ids = groups.filter(g => isGroupCurrentlySticky(g)).map(g => g.id);
    } else if (preset.startsWith('platform_')) {
      const plat = preset.replace('platform_', '').toLowerCase();
      ids = groups.filter(g => g.platform.toLowerCase() === plat).map(g => g.id);
    }

    if (preset === 'clear') {
      setSelectedDirectFilterGroupIds([]);
    } else {
      setSelectedDirectFilterGroupIds(Array.from(new Set([...selectedDirectFilterGroupIds, ...ids])));
    }
  };

  const handleBulkToggleDirectPromoted = (show: boolean) => {
    if (selectedDirectFilterGroupIds.length === 0) return;
    selectedDirectFilterGroupIds.forEach(id => {
      const group = groups.find(g => g.id === id);
      if (group) {
        triggerUpdateGroup({ ...group, showInDirectPromoted: show });
      }
    });
    setBulkDeleteNotice(`Updated Direct Promoted status for ${selectedDirectFilterGroupIds.length} groups.`);
    setTimeout(() => setBulkDeleteNotice(null), 4000);
  };

  const handleBulkDeleteDirectFilter = async () => {
    if (selectedDirectFilterGroupIds.length === 0) return;
    const count = selectedDirectFilterGroupIds.length;
    if (!confirm(`Are you sure you want to permanently delete ALL ${count} selected group(s)?`)) return;

    setIsDeletingBulk(true);
    const idsToDelete = [...selectedDirectFilterGroupIds];
    setSelectedDirectFilterGroupIds([]);

    setActionProgress({
      title: `Deleting ${count} direct filter group(s)...`,
      current: 0,
      total: count,
      statusText: 'Initiating direct group deletion...',
      color: 'rose',
    });

    try {
      if (onBulkDeleteGroups) {
        let currentStep = 0;
        const interval = setInterval(() => {
          currentStep = Math.min(count - 1, currentStep + Math.max(1, Math.floor(count / 15)));
          setActionProgress({
            title: `Deleting ${count} direct filter group(s)...`,
            current: currentStep,
            total: count,
            statusText: `Deleting direct groups (${currentStep}/${count})...`,
            color: 'rose',
          });
        }, 120);

        await onBulkDeleteGroups(idsToDelete);
        clearInterval(interval);
      } else {
        await fetch('/api/groups', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: idsToDelete }),
        });
        let done = 0;
        for (const id of idsToDelete) {
          done++;
          setActionProgress({
            title: `Deleting ${count} direct filter group(s)...`,
            current: done,
            total: count,
            statusText: `Deleted ${done} of ${count}...`,
            color: 'rose',
          });
          await onDeleteGroup(id);
        }
      }

      setActionProgress({
        title: 'Direct Deletion Complete!',
        current: count,
        total: count,
        statusText: `Successfully deleted ${count} direct filter group(s)!`,
        color: 'emerald',
      });

      setBulkDeleteNotice(`Successfully deleted ${count} group(s)! Changes reflected on website.`);
      setTimeout(() => {
        setActionProgress(null);
        setBulkDeleteNotice(null);
      }, 3500);
    } catch (err) {
      console.error(err);
      setActionProgress(null);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Sticky Action: Apply timer and promotion rank
  const handleApplyStickyPromotion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingGroup) return;

    const hours = stickyDurationHours === -1 ? Math.max(1, parseInt(customStickyHours, 10) || 24) : stickyDurationHours;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const updated: Group = {
      ...promotingGroup,
      isSticky: true,
      stickyUntil: expiresAt,
      stickyOrder: Number(stickyOrderVal) || 1,
      isPromoted: true,
    };

    triggerUpdateGroup(updated);
    setPromotingGroup(null);
  };

  // Unpin / Remove sticky status
  const handleRemoveSticky = (group: Group) => {
    const updated: Group = {
      ...group,
      isSticky: false,
      isPromoted: false,
      stickyUntil: '',
      stickyOrder: 0,
      featured: false,
    };
    triggerUpdateGroup(updated);
  };

  // Keyword Management: Add single or multiple
  const handleAddKeywords = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywordInput.trim()) return;

    const newKws = keywordInput
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 1);

    const merged = Array.from(new Set([...keywordsList, ...newKws]));
    setKeywordsList(merged);
    saveStoredKeywords(merged);
    setKeywordInput('');
    setKeywordNotice(`Added ${newKws.length} keyword(s) to quarantine filter`);
    setTimeout(() => setKeywordNotice(null), 3000);
  };

  // Remove individual keyword
  const handleRemoveKeyword = (keywordToRemove: string) => {
    const filtered = keywordsList.filter(k => k.toLowerCase() !== keywordToRemove.toLowerCase());
    setKeywordsList(filtered);
    saveStoredKeywords(filtered);
    setKeywordNotice(`Removed keyword: "${keywordToRemove}"`);
    setTimeout(() => setKeywordNotice(null), 3000);
  };

  // Reset to default keyword list
  const handleResetKeywords = () => {
    if (confirm('Reset quarantine keywords to default 45+ adult terms?')) {
      setKeywordsList(DEFAULT_ADULT_KEYWORDS);
      saveStoredKeywords(DEFAULT_ADULT_KEYWORDS);
      setKeywordNotice('Keywords reset to standard adult protection library.');
      setTimeout(() => setKeywordNotice(null), 3000);
    }
  };

  // Ad Placement: Save / Update
  const handleSaveAd = (ad: AdPlacement) => {
    const existingIndex = adsList.findIndex(a => a.id === ad.id);
    let updated: AdPlacement[];
    if (existingIndex >= 0) {
      updated = [...adsList];
      updated[existingIndex] = ad;
    } else {
      updated = [ad, ...adsList];
    }
    setAdsList(updated);
    saveStoredAds(updated);
    if (ad.isActive) {
      setGlobalAdsEnabled(true);
      setUserAdsVisible(true);
      setGlobalAdsOn(true);
    }
    setEditingAd(null);
    setIsCreatingAd(false);
    setAdsNotice(`Ad "${ad.title}" saved successfully`);
    setTimeout(() => setAdsNotice(null), 3000);
  };

  // Ad Placement: Delete
  const handleDeleteAd = (adId: string) => {
    if (confirm('Delete this ad placement configuration?')) {
      const filtered = adsList.filter(a => a.id !== adId);
      setAdsList(filtered);
      saveStoredAds(filtered);
      setAdsNotice('Ad placement removed.');
      setTimeout(() => setAdsNotice(null), 3000);
    }
  };

  // Ad Master Switch: Global Toggle
  const handleToggleGlobalAds = (enabled: boolean) => {
    setGlobalAdsOn(enabled);
    setGlobalAdsEnabled(enabled);
    if (enabled) {
      setUserAdsVisible(true);
      const updated = adsList.map(a => ({ ...a, isActive: true }));
      setAdsList(updated);
      saveStoredAds(updated);
    }
    setAdsNotice(enabled ? 'Global Ads ENABLED across all user sessions.' : 'Global Ads PAUSED / HIDDEN across the entire website.');
    setTimeout(() => setAdsNotice(null), 3500);
  };

  // Bulk Show / Hide All Individual Ads
  const handleBulkSetAdsStatus = (active: boolean) => {
    const updated = adsList.map(a => ({ ...a, isActive: active }));
    setAdsList(updated);
    saveStoredAds(updated);
    if (active) {
      setGlobalAdsEnabled(true);
      setUserAdsVisible(true);
      setGlobalAdsOn(true);
    }
    setAdsNotice(active ? 'All ad placements ACTIVATED and set to visible.' : 'All ad placements PAUSED.');
    setTimeout(() => setAdsNotice(null), 3000);
  };

  // Security: Change Admin Password
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordNotice('Error: Passwords do not match');
      return;
    }
    if (newAdminPassword.length < 6) {
      setPasswordNotice('Error: Password must be at least 6 characters');
      return;
    }

    const creds = getAdminCredentials();
    creds.passwordHash = newAdminPassword;
    creds.updatedAt = new Date().toISOString();
    saveAdminCredentials(creds);
    setNewAdminPassword('');
    setConfirmAdminPassword('');
    setPasswordNotice('Admin master password updated successfully!');
    setTimeout(() => setPasswordNotice(null), 3500);
  };

  // 2FA: Save Two-Factor Authentication Settings (Email OTP or Google Authenticator)
  const handleVerifyAndSave2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError(null);
    setTwoFactorNotice(null);

    if (is2FAEnabled && twoFactorMethod === 'authenticator') {
      if (!testTotpInput.trim()) {
        setTwoFactorError('Please enter the 6-digit code from Google Authenticator to confirm setup.');
        return;
      }

      const isValid = verifyTotpCode(twoFactorSecret, testTotpInput.trim(), 1);
      if (!isValid) {
        setTwoFactorError('Invalid 6-digit code. Please verify the code in Google Authenticator and make sure your phone clock is synced.');
        return;
      }
    }

    const res = updateTwoFactorSettings(
      is2FAEnabled, 
      twoFactorMethod, 
      twoFactorSecret, 
      twoFactorMethod === 'authenticator' ? testTotpInput : undefined
    );

    if (res.success) {
      const msg = is2FAEnabled 
        ? (twoFactorMethod === 'email_otp' 
            ? `Email OTP 2-Step Verification is active! Login codes will be sent to ${AUTHORIZED_ADMIN_EMAIL}.` 
            : 'Google Authenticator 2-Step Verification is active & secured!')
        : '2-Step Verification has been disabled.';
      setTwoFactorNotice(msg);
      setTestTotpInput('');
      const updatedCreds = getAdminCredentials();
      setAdminCreds(updatedCreds);
    } else {
      setTwoFactorError(res.error || 'Failed to update 2FA settings');
    }
  };

  // 2FA: Regenerate new Secret Key
  const handleGenerateNewSecret = () => {
    if (confirm('Generate a new Google Authenticator secret? You will need to re-scan the QR code.')) {
      const newSecret = generateBase32Secret(16);
      setTwoFactorSecret(newSecret);
      setTwoFactorNotice('New secret generated. Scan the updated QR code with Google Authenticator.');
      setTimeout(() => setTwoFactorNotice(null), 4000);
    }
  };

  // 2FA: Regenerate Backup Codes
  const handleRegenerateBackupCodes = () => {
    if (confirm('Generate new emergency backup recovery codes? Old codes will become invalid.')) {
      const newCodes = refreshBackupCodes();
      setBackupCodes(newCodes);
      setTwoFactorNotice('Fresh backup recovery keys generated. Save them safely.');
      setTimeout(() => setTwoFactorNotice(null), 4000);
    }
  };

  // Copy Secret Key
  const handleCopySecret = () => {
    navigator.clipboard.writeText(twoFactorSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // Copy Backup Codes
  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  // Export Complete Backup JSON
  const handleExportCompleteBackup = async () => {
    setBackupExporting(true);
    setBackupError(null);
    setBackupNotice(null);
    try {
      const res = await fetch('/api/admin/backup', {
        headers: getAdminAuthHeaders(),
      });
      const data = await res.json();
      const serverGroups: Group[] = data.success && Array.isArray(data.groups) ? data.groups : groups;

      let totalComments = 0;
      let totalRatings = 0;
      let totalSticky = 0;
      let totalNsfw = 0;

      serverGroups.forEach(g => {
        if (Array.isArray(g.comments)) totalComments += g.comments.length;
        if (typeof g.ratingCount === 'number') totalRatings += g.ratingCount;
        if (g.isSticky) totalSticky++;
        if (g.isNsfw || g.category === 'Adult / 18+') totalNsfw++;
      });

      const fullBackupPayload = {
        appName: 'Group Links Community Master Backup',
        version: '2.5.0',
        exportedAt: new Date().toISOString(),
        totalGroups: serverGroups.length,
        totalComments,
        totalRatings,
        totalSticky,
        totalNsfw,
        restrictedKeywords: Array.isArray(data.restrictedKeywords) ? data.restrictedKeywords : keywordsList,
        groups: serverGroups,
        customKeywords: getStoredKeywords(),
        autoFilterEnabled: isAutoFilterEnabled(),
        adPlacements: getStoredAds(),
        globalAdsEnabled: isGlobalAdsEnabled(),
        customScripts: getCustomScriptsConfig(),
      };

      const jsonString = JSON.stringify(fullBackupPayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `GroupLinks_Master_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupNotice(`Complete master backup JSON (${serverGroups.length} groups, ${totalComments} comments, ratings, keywords, ads & scripts) exported successfully!`);
    } catch (err: any) {
      setBackupError(err.message || 'Failed to generate backup export.');
    } finally {
      setBackupExporting(false);
    }
  };

  // Inspect Selected Backup File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupFile(file);
    setBackupError(null);
    setBackupNotice(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let incomingGroups: Group[] = [];
        if (Array.isArray(parsed)) {
          incomingGroups = parsed;
        } else if (parsed && Array.isArray(parsed.groups)) {
          incomingGroups = parsed.groups;
        } else {
          throw new Error('Invalid backup file structure. File must contain a "groups" array or be an array of groups.');
        }

        let totalCommentsCount = 0;
        let totalRatingsCount = 0;
        let totalStickyCount = 0;
        let totalNsfwCount = 0;

        incomingGroups.forEach(g => {
          if (Array.isArray(g.comments)) totalCommentsCount += g.comments.length;
          if (typeof g.ratingCount === 'number') totalRatingsCount += g.ratingCount;
          if (g.isSticky) totalStickyCount++;
          if (g.isNsfw || g.category === 'Adult / 18+') totalNsfwCount++;
        });

        const customKw = Array.isArray(parsed.customKeywords) ? parsed.customKeywords : [];
        const adsList = Array.isArray(parsed.adPlacements) ? parsed.adPlacements : [];
        const hasScripts = Boolean(parsed.customScripts && typeof parsed.customScripts === 'object');

        setBackupPreview({
          version: parsed.version || '2.5.0',
          exportedAt: parsed.exportedAt || 'Unknown',
          totalGroups: incomingGroups.length,
          totalCommentsCount,
          totalRatingsCount,
          totalStickyCount,
          totalNsfwCount,
          customKeywordsCount: customKw.length,
          adPlacementsCount: adsList.length,
          hasScriptsConfig: hasScripts,
          rawPayload: parsed,
        });
      } catch (err: any) {
        setBackupError(err.message || 'Failed to read or parse backup JSON file.');
        setBackupPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore Operation
  const handleExecuteRestore = async () => {
    if (!backupPreview || !backupPreview.rawPayload) return;

    setBackupRestoring(true);
    setBackupError(null);
    setBackupNotice(null);

    try {
      const payload = backupPreview.rawPayload;
      const incomingGroups = Array.isArray(payload) ? payload : payload.groups;
      const restrictedKeywords = Array.isArray(payload.restrictedKeywords) ? payload.restrictedKeywords : [];

      // 1. Send Groups and restricted keywords to Server
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          groups: incomingGroups,
          restrictedKeywords,
          mode: restoreMode,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server failed to process backup restore.');
      }

      // 2. Restore Client Settings if available in payload
      if (Array.isArray(payload.customKeywords)) {
        saveStoredKeywords(payload.customKeywords);
        setKeywordsList(payload.customKeywords);
      }

      if (typeof payload.autoFilterEnabled === 'boolean') {
        setAutoFilterEnabled(payload.autoFilterEnabled);
      }

      if (Array.isArray(payload.adPlacements)) {
        saveStoredAds(payload.adPlacements);
        setAdsList(payload.adPlacements);
      }

      if (payload.customScripts && typeof payload.customScripts === 'object') {
        saveCustomScriptsConfig(payload.customScripts);
      }

      const commentsRestored = typeof data.totalComments === 'number' ? data.totalComments : backupPreview.totalCommentsCount;
      const msg = data.mode === 'replace'
        ? `Database replaced successfully! Total ${data.total} groups and ${commentsRestored} comments restored.`
        : `Backup merged successfully! ${data.added} new groups added, ${data.updated} updated (${data.total} total groups, ${commentsRestored} total comments).`;

      setBackupNotice(msg);
      setBackupPreview(null);
      setBackupFile(null);

      // Refresh window state after 1.5 seconds to propagate restored items
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setBackupError(err.message || 'Failed to restore backup.');
    } finally {
      setBackupRestoring(false);
    }
  };

  // Execute Reset Engagement Metrics to Zero (Upvotes, Joins, Shares)
  const handleExecuteResetMetrics = async () => {
    setIsResettingMetrics(true);
    setResetMetricsError(null);
    setResetMetricsSuccess(null);

    try {
      const res = await fetch('/api/admin/reset-metrics', {
        method: 'POST',
        headers: {
          ...getAdminAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resetOptions),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset community metrics.');
      }

      setResetMetricsSuccess(data.message || 'All group upvotes, joins, and shares have been successfully reset to zero.');
      setShowResetMetricsModal(false);

      // Refresh groups list in admin view
      fetchAdminPage(1, adminPageSize, false);
      if (typeof refreshInjectedDomStats === 'function') {
        refreshInjectedDomStats();
      }
    } catch (err: any) {
      setResetMetricsError(err.message || 'Failed to execute metrics reset.');
    } finally {
      setIsResettingMetrics(false);
    }
  };

  const detectedBulkUrls = useMemo(() => {
    return extractUrlsFromText(bulkInputText);
  }, [bulkInputText]);

  // Execute Bulk Import Pipeline
  const handleExecuteBulkImport = async () => {
    const urls = extractUrlsFromText(bulkInputText);
    if (urls.length === 0) return;

    setBulkIsProcessing(true);
    setBulkSummary(null);
    setBulkProgress({ current: 0, total: urls.length });

    const initialResults = urls.map((url, idx) => ({
      id: `bulk-${idx}-${Date.now()}`,
      url,
      platform: detectPlatformFromUrl(url),
      category: bulkCategory === 'auto' ? undefined : (bulkCategory as Category),
      status: 'pending' as const,
    }));
    setBulkResults(initialResults);

    // Try server-side parallel crawl first
    try {
      const bulkRes = await fetch('/api/admin/bulk-import', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          urls,
          autoScrape: bulkAutoScrape,
          category: bulkCategory,
          language: bulkLanguage,
          region: bulkRegion,
          markVerified: true,
        }),
      });

      if (bulkRes.ok) {
        const data = await bulkRes.json();
        if (data.success && Array.isArray(data.results)) {
          let successCount = 0;
          let failCount = 0;
          const mapped = data.results.map((r: any, idx: number) => {
            const isOk = r.success && (r.status === 'created' || r.status === 'duplicate');
            if (isOk) successCount++;
            else failCount++;

            if (r.group && onAddGroup && r.status === 'created') {
              onAddGroup(r.group);
            }

            return {
              id: `bulk-${idx}-${Date.now()}`,
              url: r.url,
              platform: r.group?.platform || detectPlatformFromUrl(r.url),
              title: r.group?.title,
              description: r.group?.description,
              imageUrl: r.group?.imageUrl,
              category: r.group?.category,
              status: isOk ? ('success' as const) : ('error' as const),
              errorMessage: r.error || (r.status === 'duplicate' ? 'Already in directory' : undefined),
              createdGroup: r.group,
            };
          });

          setBulkResults(mapped);
          setBulkProgress({ current: urls.length, total: urls.length });
          setBulkSummary({
            total: urls.length,
            success: data.successCount ?? successCount,
            failed: data.failCount ?? failCount,
          });
          setBulkIsProcessing(false);
          fetchAdminPage(1, adminPageSize, false);
          return;
        }
      }
    } catch {
      // Fallback to client sequential crawl
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const rawUrl = urls[i];
      const item = initialResults[i];

      setBulkResults(prev => prev.map(r => r.id === item.id ? { ...r, status: 'scraping' } : r));

      try {
        let title = '';
        let description = '';
        let imageUrl = '';
        let category: Category = bulkCategory === 'auto' ? 'Tech & Programming' : (bulkCategory as Category);
        let language: Language = bulkLanguage;
        let region: Region = bulkRegion;
        let customTags = ['#community', `#${item.platform}`];
        let memberCount = 250;

        if (bulkAutoScrape) {
          try {
            const scrapeRes = await fetch('/api/scrape-metadata', {
              method: 'POST',
              headers: getAdminAuthHeaders(),
              body: JSON.stringify({ url: rawUrl, platform: item.platform }),
            });
            if (scrapeRes.ok) {
              const scData = await scrapeRes.json();
              if (scData.success) {
                title = scData.title || '';
                description = scData.description || '';
                imageUrl = scData.imageUrl || '';
                
                // Only override category if user selected Auto-Detect mode
                if (bulkCategory === 'auto') {
                  if (scData.suggestedCategory && (CATEGORIES as readonly string[]).includes(scData.suggestedCategory)) {
                    category = scData.suggestedCategory as Category;
                  }
                } else {
                  category = bulkCategory as Category;
                }

                if (scData.suggestedLanguage && (LANGUAGES as readonly string[]).includes(scData.suggestedLanguage)) {
                  language = scData.suggestedLanguage as Language;
                }
                if (scData.suggestedTags && Array.isArray(scData.suggestedTags) && scData.suggestedTags.length > 0) {
                  customTags = scData.suggestedTags;
                }
                if (scData.memberCount) memberCount = scData.memberCount;
              }
            }
          } catch {
            // Ignore scrape error, fallback
          }
        }

        // Strict category preservation for explicit user selections
        if (bulkCategory !== 'auto') {
          category = bulkCategory as Category;
        }

        if (!title) {
          try {
            const parsed = new URL(rawUrl);
            const path = parsed.pathname.replace(/^\/|\/$/g, '').split('/').pop() || '';
            title = path ? `${item.platform.toUpperCase()}: ${path.replace(/[-_+]/g, ' ')}` : `${item.platform.toUpperCase()} Group #${i + 1}`;
          } catch {
            title = `${item.platform.toUpperCase()} Group #${i + 1}`;
          }
        }
        if (!description) {
          description = `Welcome to our official ${item.platform.toUpperCase()} community group! Connect with active members and discuss shared topics.`;
        }
        if (!imageUrl) {
          const cleanSeed = encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `bulk-${i}`);
          imageUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanSeed}&backgroundColor=0f172a,1e293b,334155,1e1b4b,172554`;
        }

        const adultAnalysis = analyzeGroupContent({ title, description, customTags });
        const isNsfw = category === 'Adult / 18+' || adultAnalysis.isAdult;
        if (isNsfw) {
          category = 'Adult / 18+';
        }

        setBulkResults(prev => prev.map(r => r.id === item.id ? {
          ...r,
          title,
          description,
          imageUrl,
          category,
          status: 'publishing'
        } : r));

        const payload: Omit<Group, 'id' | 'createdAt' | 'slug' | 'upvotes' | 'bookmarks' | 'reports'> = {
          title,
          description,
          url: rawUrl,
          platform: item.platform,
          category,
          language,
          region,
          customTags,
          imageUrl,
          memberCount,
          growthRate: Math.floor(Math.random() * 15) + 5,
          clicks: 0,
          verified: true,
          featured: false,
          isNsfw,
          status: 'approved',
          isActive: true,
          safetyScore: isNsfw ? 40 : 95,
          rankScore: calculateRankScore(title, description, customTags),
          rankGrade: calculateRankGrade(calculateRankScore(title, description, customTags)),
          rankKeywords: [`${item.platform} group`, 'online community', category.toLowerCase()],
          lastActive: 'Just now',
        };

        const createRes = await fetch('/api/groups', {
          method: 'POST',
          headers: getAdminAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            ...payload,
            status: 'approved',
            isActive: true,
            verified: true,
          }),
        });

        const resData = await createRes.json();
        if (!createRes.ok || !resData.success) {
          throw new Error(resData.error || 'Failed to register group in database');
        }

        if (onAddGroup && resData.group) {
          onAddGroup(resData.group);
        }

        successCount++;
        setBulkResults(prev => prev.map(r => r.id === item.id ? {
          ...r,
          status: 'success',
          category: resData.group?.category || category,
          createdGroup: resData.group,
        } : r));
      } catch (err: any) {
        failCount++;
        setBulkResults(prev => prev.map(r => r.id === item.id ? {
          ...r,
          status: 'error',
          errorMessage: err.message || 'Failed to process group link',
        } : r));
      }

      setBulkProgress({ current: i + 1, total: urls.length });
    }

    setBulkIsProcessing(false);
    setBulkSummary({
      total: urls.length,
      success: successCount,
      failed: failCount,
    });
    fetchAdminPage(1, adminPageSize, false);
  };

  // Fetch Background Importer Worker Status from Server
  const fetchBackgroundJobStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/background-import/status', {
        headers: getAdminAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.job) {
          setBgJob(data.job);
        }
      }
    } catch {
      // Ignore network errors in polling
    }
  }, []);

  // Poll status periodically
  useEffect(() => {
    fetchBackgroundJobStatus();
    const interval = setInterval(() => {
      fetchBackgroundJobStatus();
    }, bgJob?.status === 'running' ? 2500 : 8000);
    return () => clearInterval(interval);
  }, [fetchBackgroundJobStatus, bgJob?.status]);

  // Analyze uploaded .txt / .csv file client-side
  const handleSelectBackgroundFile = (file: File) => {
    if (!file) return;
    setBgFile(file);
    setBgNotice(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setBgFileContent(text);
      const urls = extractUrlsFromText(text);

      const counts: Record<string, number> = {};
      urls.forEach(u => {
        const p = detectPlatformFromUrl(u);
        counts[p] = (counts[p] || 0) + 1;
      });

      const lines = text.split(/\r\n|\r|\n/).filter(l => l.trim().length > 0).length;

      setBgFileStats({
        fileName: file.name,
        sizeBytes: file.size,
        rawLines: lines,
        validUrls: urls.length,
        platformCounts: counts,
      });
    };
    reader.readAsText(file);
  };

  // Start Offline Background Job on Cloud Server
  const handleStartBackgroundImport = async () => {
    const content = bgImportMode === 'fileUpload' ? bgFileContent : bulkInputText;
    if (!content || content.trim().length === 0) {
      setBgNotice('⚠️ Please upload a file with group links or paste URLs first.');
      return;
    }

    setBgIsStarting(true);
    setBgNotice(null);

    try {
      const res = await fetch('/api/admin/background-import/upload', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          content,
          fileName: bgFile?.name || (bgImportMode === 'quickPaste' ? 'Pasted-Batch.txt' : undefined),
          options: {
            autoScrape: bulkAutoScrape,
            category: bulkCategory,
            language: bulkLanguage,
            region: bulkRegion,
            markVerified: bgMarkVerified,
            concurrency: bgConcurrency,
            delayMs: bgDelayMs,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start background import job');
      }

      setBgJob(data.job);
      setBgNotice(`🚀 Background scraping job launched with ${data.job.total} links! It is now running 24/7 on the server. You can safely close your browser or go offline.`);
      // Refresh admin page
      fetchAdminPage(1, adminPageSize, false);
    } catch (err: any) {
      setBgNotice(`❌ ${err.message || 'Error starting background job'}`);
    } finally {
      setBgIsStarting(false);
    }
  };

  // Send worker control actions: pause, resume, cancel, clear
  const handleBackgroundAction = async (action: 'pause' | 'resume' | 'cancel' | 'clear') => {
    setBgActionLoading(true);
    try {
      const res = await fetch('/api/admin/background-import/action', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success && data.job) {
        setBgJob(data.job);
        if (action === 'clear') {
          setBgFile(null);
          setBgFileContent('');
          setBgFileStats(null);
          setBgNotice('Job history cleared.');
        } else if (action === 'pause') {
          setBgNotice('⏸️ Background worker paused.');
        } else if (action === 'resume') {
          setBgNotice('▶️ Background worker resumed.');
        } else if (action === 'cancel') {
          setBgNotice('⏹️ Background worker cancelled.');
        }
      }
      fetchAdminPage(1, adminPageSize, false);
    } catch (err: any) {
      setBgNotice(`Error: ${err.message}`);
    } finally {
      setBgActionLoading(false);
    }
  };

  // Download Failed URLs Report
  const handleExportFailedLinks = () => {
    window.open('/api/admin/background-import/export-failed', '_blank');
  };

  // Standard RFC 6238 OTPAuth URI for Google Authenticator QR Code
  const otpAuthUri = getOtpAuthUri(twoFactorSecret, AUTHORIZED_ADMIN_EMAIL, 'GroupLinks');

  const handleDmcaReview = async (groupId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/dmca/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({ groupId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process DMCA review.');
      }
      alert(data.message || 'Successfully processed DMCA review.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Error processing DMCA review.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                  Group Links Admin Master Portal
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  /kiran8728
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Logged in as <strong>{AUTHORIZED_ADMIN_EMAIL}</strong> • Complete directory control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 overflow-x-auto bg-neutral-50/40 dark:bg-neutral-900/40 text-xs font-bold">
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'groups'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Manage Groups ({groups.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dmcaReviews')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'dmcaReviews'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>⚖️ DMCA Reviews ({groups.filter(g => g.dmcaStatus === 'pending_review').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('adsenseSafety')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'adsenseSafety'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>🛡️ AdSense & Safety (Adult Filter)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              hideAdultContent
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
            }`}>
              {hideAdultContent ? 'Safe Mode ON' : '18+ Visible'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('promotions')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'promotions'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Megaphone className="w-4 h-4 text-amber-500" />
            <span>🚀 Promoted Groups (UPI)</span>
          </button>

          <button
            onClick={() => setActiveTab('userCredits')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'userCredits'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Coins className="w-4 h-4 text-emerald-500" />
            <span>💰 Custom User Credits</span>
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'rewards'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Coins className="w-4 h-4 text-indigo-500" />
            <span>⚙️ Reward Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Bell className="w-4 h-4 text-indigo-500" />
            <span>📢 Broadcast Notifs</span>
          </button>

          <button
            onClick={() => setActiveTab('bulkImport')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'bulkImport'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>⚡ Bulk Add & Offline Scraper</span>
            {bgJob?.status === 'running' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>Scraping ({Math.round(((bgJob.processed || 0) / (bgJob.total || 1)) * 100)}%)</span>
              </span>
            )}
            {bgJob?.status === 'paused' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Paused
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('healthAutomation')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'healthAutomation'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>🛡️ Health & Night Automation</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
              Auto-Heal
            </span>
          </button>

          <button
            onClick={() => setActiveTab('directFilter')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'directFilter'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Direct groups filter</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
              {groups.filter(g => g.showInDirectPromoted || g.isDirectPromoted).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('keywords')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'keywords'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Adult Keywords Box ({keywordsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('restrictedKeywords')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'restrictedKeywords'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>🚫 Prohibited Content Moderation</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'comments'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-indigo-500" />
            <span>💬 Moderate Comments</span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'ads'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Ad Management & Display ({adsList.length})</span>
            {!globalAdsOn && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                Paused
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('adsTxt')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'adsTxt'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>ads.txt Manager</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
              /ads.txt
            </span>
          </button>

          <button
            onClick={() => setActiveTab('customScripts')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'customScripts'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Code2 className="w-4 h-4 text-sky-500" />
            <span>Header & Footer Codes / SEO</span>
            {liveInjectedStats.activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono">
                {liveInjectedStats.activeCount} Live
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('twofactor')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'twofactor'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            {twoFactorMethod === 'email_otp' ? <Mail className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            <span>2-Step Verification (2FA)</span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] ${
              is2FAEnabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-neutral-200 text-neutral-600'
            }`}>
              {is2FAEnabled ? (twoFactorMethod === 'email_otp' ? 'Email OTP Active' : 'App 2FA Active') : 'Off'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Master Password</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Database className="w-4 h-4 text-indigo-500" />
            <span>Backup & Restore Data</span>
          </button>
        </div>

        {/* Global Animated Action Progress Bar */}
        {actionProgress && (
          <div className="mx-4 sm:mx-6 mt-3 mb-1 p-4 rounded-2xl bg-gradient-to-r from-neutral-900 via-indigo-950 to-neutral-900 border-2 border-indigo-500/50 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 relative z-30">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
                <span className="font-extrabold text-sm tracking-wide truncate">{actionProgress.title}</span>
              </div>
              <div className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs shrink-0">
                {Math.round((actionProgress.current / Math.max(1, actionProgress.total)) * 100)}% ({actionProgress.current} / {actionProgress.total})
              </div>
            </div>
            <div className="w-full h-3 rounded-full bg-black/40 overflow-hidden p-0.5 border border-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 transition-all duration-300 ease-out shadow-lg"
                style={{ width: `${Math.min(100, Math.max(4, Math.round((actionProgress.current / Math.max(1, actionProgress.total)) * 100)))}%` }}
              />
            </div>
            {actionProgress.statusText && (
              <div className="mt-2 text-xs font-medium text-indigo-200 truncate flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>{actionProgress.statusText}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Groups Management Table & Sticky Promoter */}
        {activeTab === 'groups' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            
            {/* AdSense Safe Mode Status & Quick-Toggle Banner */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              hideAdultContent
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
            }`}>
              <div className="flex items-start sm:items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${hideAdultContent ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs sm:text-sm">
                      {hideAdultContent ? '🛡️ AdSense Safe Mode: ACTIVE (Adult Content Hidden)' : '⚠️ Adult (18+) Communities: VISIBLE'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hideAdultContent ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {hideAdultContent ? 'Site-Wide Clean' : 'Unrestricted'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80 mt-0.5 max-w-2xl leading-relaxed">
                    {hideAdultContent
                      ? 'All mature groups, adult keywords, and the Adult / 18+ category are 100% hidden. Visiting /adult-groups or /categories/adult-18 cleanly serves Technology communities.'
                      : 'Adult / 18+ groups are visible behind the age verification gate. Turn on AdSense Safe Mode to obtain Google AdSense site approval.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={isUpdatingAdultSetting}
                  onClick={() => handleToggleAdultVisibility(!hideAdultContent)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    hideAdultContent
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                  }`}
                >
                  {isUpdatingAdultSetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{hideAdultContent ? 'Show Adult Groups' : 'Activate AdSense Safe Mode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('adsenseSafety')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                >
                  Configure
                </button>
              </div>
            </div>

            {/* User Group Updates Control Banner */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              allowUserGroupUpdates
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-950 dark:text-indigo-100'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
            }`}>
              <div className="flex items-start sm:items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${allowUserGroupUpdates ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'}`}>
                  {allowUserGroupUpdates ? <RefreshCw className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs sm:text-sm">
                      {allowUserGroupUpdates
                        ? '👥 Community Updates by Visitors & Members: ENABLED (1 Time / Week Cooldown)'
                        : '🔒 Community Updates by Visitors & Members: DISABLED (Master Admin Only)'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      allowUserGroupUpdates ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'
                    }`}>
                      {allowUserGroupUpdates ? 'Public 1/Week' : 'Admin Locked'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80 mt-0.5 max-w-2xl leading-relaxed">
                    {allowUserGroupUpdates
                      ? 'Users and visitors can update existing listings at most once per week. Master admins can update anytime, change images, or refetch details.'
                      : 'All user/visitor updates are blocked site-wide. Only the master admin can update groups, change group images, or refetch metadata.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={isUpdatingUserUpdatesSetting}
                  onClick={() => handleToggleUserGroupUpdates(!allowUserGroupUpdates)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm ${
                    allowUserGroupUpdates
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {isUpdatingUserUpdatesSetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {allowUserGroupUpdates ? <Lock className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{allowUserGroupUpdates ? 'Disable User Updates' : 'Enable User Updates (1/Week)'}</span>
                </button>
              </div>
            </div>

            {adultSettingNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{adultSettingNotice}</span>
              </div>
            )}

            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900/60 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, description, tag..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                {/* Platform Filter */}
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-300 font-semibold focus:outline-none"
                >
                  <option value="all">All Platforms</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="discord">Discord</option>
                </select>

                {/* Status Type Filter */}
                <select
                  value={selectedFilterType}
                  onChange={(e) => setSelectedFilterType(e.target.value as any)}
                  className="px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-300 font-semibold focus:outline-none"
                >
                  <option value="all">All Categories & Statuses</option>
                  <option value="sticky">📌 Sticky On Top Only</option>
                  <option value="adult_hidden">🙈 Hide All Adult / 18+ & Banned Keywords</option>
                  <option value="adult_only">🔞 Show Adult / 18+ Only</option>
                  <option value="verified">✅ Verified Groups</option>
                </select>

                {/* Custom Quick Selection Preset Dropdown */}
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectPreset(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-2 text-xs bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-900 dark:text-indigo-200 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>⚡ Select Options...</option>
                  <option value="all_filtered">Select Current Page ({adminGroups.length})</option>
                  <option value="adult_only">Select 18+ Adult on Page</option>
                  <option value="safe_only">Select Safe on Page</option>
                  <option value="sticky_only">Select Sticky / Promoted</option>
                  <option value="verified_only">Select Verified</option>
                  <option value="unverified_only">Select Unverified</option>
                  <option value="platform_whatsapp">Select WhatsApp</option>
                  <option value="platform_telegram">Select Telegram</option>
                  <option value="platform_discord">Select Discord</option>
                  <option value="clear">Clear Selection</option>
                </select>

                {/* Refresh Table Button */}
                <button
                  type="button"
                  onClick={() => fetchAdminPage(adminPage, adminPageSize, false)}
                  disabled={isLoadingAdminGroups}
                  title="Refresh Community List"
                  className="p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingAdminGroups ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-bold">
                  <span>Per page:</span>
                  <select
                    value={adminPageSize}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setAdminPageSize(newSize);
                      fetchAdminPage(1, newSize, false);
                    }}
                    className="px-2 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value={20}>20</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResetMetricsModal(true)}
                  title="Reset all community upvotes, joins, and shares to zero"
                  className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-850 font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Reset Stats (0)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('bulkImport')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  <span>⚡ Bulk Add</span>
                </button>

                <button
                  onClick={() => setIsAddingGroup(true)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Single Group</span>
                </button>
              </div>
            </div>

            {/* Notification Banner for Bulk Deletion */}
            {bulkDeleteNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs font-bold text-emerald-950 dark:text-emerald-200 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bulkDeleteNotice}</span>
                </div>
              </div>
            )}

            {/* Batch Action Toolbar when groups are selected */}
            {selectedGroupIds.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150 shadow-sm relative z-20">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  <CheckSquare className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Selected <strong className="text-indigo-700 dark:text-indigo-300">{selectedGroupIds.length}</strong> group(s)</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* 1. Make Sticky Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenBulkDropdown(prev => prev === 'sticky' ? null : 'sticky')}
                      disabled={isBulkUpdating || isDeletingBulk}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Pin className="w-3.5 h-3.5" />
                      <span>Make Sticky</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {openBulkDropdown === 'sticky' && (
                      <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-30 p-1 divide-y divide-neutral-100 dark:divide-neutral-800 text-xs font-semibold">
                        <div className="p-1.5 text-[10px] uppercase font-bold text-neutral-400">Apply Sticky Promotion</div>
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkSticky(24, 1)}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-center gap-2 cursor-pointer"
                          >
                            <Pin className="w-3.5 h-3.5 text-amber-500" />
                            <span>Pin 24 Hours (Rank #1)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkSticky(168, 1)}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-center gap-2 cursor-pointer"
                          >
                            <Pin className="w-3.5 h-3.5 text-amber-500" />
                            <span>Pin 7 Days (Rank #1)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkSticky(720, 1)}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-center gap-2 cursor-pointer"
                          >
                            <Pin className="w-3.5 h-3.5 text-amber-500" />
                            <span>Pin 30 Days (Rank #1)</span>
                          </button>
                        </div>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkSticky(null)}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Remove Sticky Status</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Status Options Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenBulkDropdown(prev => prev === 'status' ? null : 'status')}
                      disabled={isBulkUpdating || isDeletingBulk}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Status Options</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {openBulkDropdown === 'status' && (
                      <div className="absolute left-0 mt-1 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-30 p-1 divide-y divide-neutral-100 dark:divide-neutral-800 text-xs font-semibold">
                        <div className="p-1.5 text-[10px] uppercase font-bold text-neutral-400">Community Status</div>
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkStatus('verified', true)}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 flex items-center gap-2 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Mark as Verified</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkStatus('verified', false)}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-2 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Mark as Unverified</span>
                          </button>
                        </div>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkStatus('featured', true)}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-center gap-2 cursor-pointer"
                          >
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            <span>Mark as Featured</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkStatus('featured', false)}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-2 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Remove Featured</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Flags Options Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenBulkDropdown(prev => prev === 'flags' ? null : 'flags')}
                      disabled={isBulkUpdating || isDeletingBulk}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Flags & Content</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {openBulkDropdown === 'flags' && (
                      <div className="absolute left-0 mt-1 w-60 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-30 p-1 divide-y divide-neutral-100 dark:divide-neutral-800 text-xs font-semibold">
                        <div className="p-1.5 text-[10px] uppercase font-bold text-neutral-400">Content Moderation & Flags</div>
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkFlags('adult_quarantine')}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            <span>Mark 18+ / Adult Quarantined</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkFlags('mark_safe')}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Mark Safe Content</span>
                          </button>
                        </div>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkFlags('enable_direct_pay')}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center gap-2 cursor-pointer"
                          >
                            <Megaphone className="w-3.5 h-3.5 text-purple-600" />
                            <span>Enable Direct Pay Promoted</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteBulkFlags('disable_direct_pay')}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-2 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Disable Direct Pay Promoted</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Change Category Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenBulkDropdown(prev => prev === 'category' ? null : 'category')}
                      disabled={isBulkUpdating || isDeletingBulk}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Change Category</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {openBulkDropdown === 'category' && (
                      <div className="absolute left-0 mt-1 w-64 max-h-72 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-30 p-1.5 divide-y divide-neutral-100 dark:divide-neutral-800 text-xs font-semibold">
                        <div className="p-1.5 text-[10px] uppercase font-bold text-neutral-400">Apply Category to Selected ({selectedGroupIds.length})</div>
                        <div className="py-1 space-y-0.5">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleExecuteBulkCategory(cat)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/40 text-neutral-800 dark:text-neutral-200 hover:text-teal-700 dark:hover:text-teal-300 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                            >
                              <span className="truncate">{cat}</span>
                              {cat === 'Adult / 18+' && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold shrink-0">18+</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const allFilteredIds = filteredAdminGroups.map(g => g.id);
                      setSelectedGroupIds(Array.from(new Set([...selectedGroupIds, ...allFilteredIds])));
                    }}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    Select All ({filteredAdminGroups.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupIds([])}
                    className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteBulkDelete}
                    disabled={isDeletingBulk || isBulkUpdating}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ml-auto"
                  >
                    {isDeletingBulk ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting Real Time...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Selected ({selectedGroupIds.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Groups Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100/70 dark:bg-neutral-800/70 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="Select / Deselect all visible groups"
                        />
                      </th>
                      <th className="py-3 px-4">Community / Platform</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Sticky Promotion Timer</th>
                      <th className="py-3 px-4">Stats & Traffic</th>
                      <th className="py-3 px-4">Status & Flags</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {isLoadingAdminGroups && filteredAdminGroups.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-neutral-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Loading directory communities &amp; analytics...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredAdminGroups.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-400">
                          {adminFetchError ? (
                            <div className="flex flex-col items-center justify-center gap-2 text-rose-500 font-semibold text-xs">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                                <span>{adminFetchError}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => fetchAdminPage(1, adminPageSize, false)}
                                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                              >
                                Retry
                              </button>
                            </div>
                          ) : (
                            'No groups found matching filter criteria.'
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredAdminGroups.map((g) => {
                        const isSticky = isGroupCurrentlySticky(g);
                        const stickyRemaining = isSticky ? getRemainingStickyTime(g) : null;
                        const isAdult = isAdultGroup(g);
                        const isSelected = selectedGroupIds.includes(g.id);

                        return (
                          <tr 
                            key={g.id} 
                            className={`transition-colors ${
                              isSelected 
                                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/60' 
                                : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40'
                            }`}
                          >
                            {/* Checkbox column */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectGroup(g.id)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            {/* Title & Platform */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200 dark:border-neutral-700">
                                  {g.imageUrl ? (
                                    <img src={g.imageUrl.replace(/&amp;/g, '&')} alt={g.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-neutral-400">
                                      {g.title.charAt(0)}
                                    </div>
                                  )}
                                  <div className="absolute bottom-0 right-0 p-0.5 rounded-tl-md bg-white dark:bg-neutral-900 shadow-xs">
                                    <PlatformIcon platform={g.platform} className="w-2.5 h-2.5" />
                                  </div>
                                </div>
                                <div className="max-w-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-neutral-900 dark:text-white line-clamp-1">
                                      {g.title}
                                    </span>
                                    {g.verified && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600/10 shrink-0" />
                                    )}
                                  </div>
                                  <a 
                                    href={g.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[11px] text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block max-w-xs flex items-center gap-1 mt-0.5"
                                  >
                                    <span>{g.url}</span>
                                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                  </a>
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
                                {g.category}
                              </span>
                            </td>

                            {/* Sticky Timer */}
                            <td className="py-3 px-4">
                              {isSticky ? (
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                                    <Pin className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    <span>Rank #{g.stickyOrder || 1}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-400">
                                    <Clock className="w-3 h-3" />
                                    <span>{stickyRemaining?.formatted || 'Active'}</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setUnstickingGroup(g);
                                      setUnstickConfirmTitle('');
                                      setUnstickError(null);
                                      setCopiedUnstickTitle(false);
                                    }}
                                    className="text-[10px] text-rose-500 hover:text-rose-600 font-bold hover:underline block cursor-pointer"
                                  >
                                    Remove Sticky
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setPromotingGroup(g);
                                    setStickyOrderVal(1);
                                    setStickyDurationHours(24);
                                  }}
                                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 flex items-center gap-1 shadow-2xs"
                                >
                                  <Pin className="w-3 h-3" />
                                  <span>Make Sticky</span>
                                </button>
                              )}
                            </td>

                            {/* Stats */}
                            <td className="py-3 px-4">
                              <div className="text-[11px] space-y-0.5">
                                <div>Members: <strong>{formatMemberCount(g.memberCount)}</strong></div>
                                <div>Joins: <strong>{g.clicks}</strong></div>
                              </div>
                            </td>

                            {/* Flags */}
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {isAdult ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" />
                                    <span>18+ Quarantined</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                    <span>Safe Content</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleChangeGroupImage(g)}
                                  title="Change Image (Upload to Cloudflare R2 / cdn.grouplinks.app)"
                                  className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleGroupLock(g)}
                                  title={g.isUpdateLocked ? 'Updates Locked for Users (Click to Unlock)' : 'Updates Allowed for Users (Click to Lock)'}
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    g.isUpdateLocked
                                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-amber-600 border border-neutral-200 dark:border-neutral-700'
                                  }`}
                                >
                                  {g.isUpdateLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGroupImage(g)}
                                  title="Remove Group Image (Revert to Category Default)"
                                  className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                                >
                                  <ImageOff className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleForceRescrapeGroup(g)}
                                  disabled={rescrapingGroupId === g.id}
                                  title="Refetch Details & Icon Live (Scrape from Invite Link)"
                                  className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${rescrapingGroupId === g.id ? 'animate-spin text-indigo-600' : ''}`} />
                                </button>
                                <button
                                  onClick={() => setEditingGroup(g)}
                                  title="Edit Community"
                                  className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 border border-neutral-200 dark:border-neutral-700 transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    triggerDeleteGroup(g.id || g.slug || g.url);
                                  }}
                                  title="Delete Community"
                                  className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-rose-600 hover:bg-rose-50 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Server-Side Pagination Controls */}
              <div className="p-3.5 bg-neutral-50/90 dark:bg-neutral-900/90 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-neutral-500 font-semibold flex items-center gap-2">
                  <span>
                    Showing{' '}
                    <strong className="text-neutral-800 dark:text-neutral-200">
                      {adminTotalCount === 0 ? 0 : (adminPage - 1) * adminPageSize + 1}
                    </strong>
                    {' '}-{' '}
                    <strong className="text-neutral-800 dark:text-neutral-200">
                      {Math.min(adminTotalCount, (adminPage - 1) * adminPageSize + adminGroups.length)}
                    </strong>
                    {' '}of{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400">{adminTotalCount}</strong>
                    {' '}communities
                  </span>
                  {isLoadingAdminGroups && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Loading page...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fetchAdminPage(1, adminPageSize, false)}
                    disabled={adminPage <= 1 || isLoadingAdminGroups}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 font-bold transition-colors cursor-pointer"
                  >
                    First
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchAdminPage(Math.max(1, adminPage - 1), adminPageSize, false)}
                    disabled={adminPage <= 1 || isLoadingAdminGroups}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    ‹ Prev
                  </button>

                  <div className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-extrabold text-xs">
                    Page {adminPage} / {adminTotalPages || 1}
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchAdminPage(Math.min(adminTotalPages, adminPage + 1), adminPageSize, false)}
                    disabled={adminPage >= adminTotalPages || isLoadingAdminGroups}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    Next ›
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchAdminPage(adminTotalPages, adminPageSize, false)}
                    disabled={adminPage >= adminTotalPages || isLoadingAdminGroups}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 font-bold transition-colors cursor-pointer"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: AdSense Approval & Adult Content Filter */}
        {activeTab === 'adsenseSafety' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* Header & Mode Switcher Card */}
            <div className={`p-6 rounded-3xl border transition-all ${
              hideAdultContent
                ? 'bg-gradient-to-br from-emerald-950/40 via-neutral-900/60 to-emerald-950/20 border-emerald-500/40 shadow-xl shadow-emerald-950/20'
                : 'bg-gradient-to-br from-rose-950/40 via-neutral-900/60 to-rose-950/20 border-rose-500/40 shadow-xl shadow-rose-950/20'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>AdSense Compliance & Monetization Safety</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                    <span>Adult Content Visibility Control</span>
                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                      hideAdultContent
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}>
                      {hideAdultContent ? '🛡️ SAFE MODE ACTIVE' : '⚠️ ADULT GROUPS VISIBLE'}
                    </span>
                  </h2>
                  <p className="text-neutral-300 text-sm max-w-2xl leading-relaxed">
                    Toggle between standard directory mode and strict <strong>Google AdSense Safe Mode</strong>. When hidden, all 18+ groups, adult keywords, and the Adult / 18+ category are completely masked site-wide. Any visitor or search crawler requesting adult URLs will smoothly see family-friendly <strong>Technology & Programming</strong> communities.
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-auto">
                  <button
                    type="button"
                    disabled={isUpdatingAdultSetting}
                    onClick={() => handleToggleAdultVisibility(!hideAdultContent)}
                    className={`w-full md:w-auto px-6 py-3.5 rounded-2xl text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-3 shadow-lg ${
                      hideAdultContent
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 shadow-neutral-950/40'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:scale-[1.02]'
                    }`}
                  >
                    {isUpdatingAdultSetting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Setting...</span>
                      </>
                    ) : hideAdultContent ? (
                      <>
                        <Eye className="w-4 h-4 text-neutral-400" />
                        <span>Turn Safe Mode OFF (Show Adult Groups)</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-200" />
                        <span>Turn Safe Mode ON (Hide All Adult Content)</span>
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-neutral-400 font-medium">
                    {hideAdultContent ? 'Site is currently 100% compliant for AdSense review' : 'Adult content is currently accessible via age consent'}
                  </span>
                </div>
              </div>

              {adultSettingNotice && (
                <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{adultSettingNotice}</span>
                </div>
              )}
            </div>

            {/* How It Works & Substitution Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Route Substitution */}
              <div className="p-5 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Automated URL Substitution Engine</span>
                </div>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  To prevent 404 crawl errors or empty page flags during Google AdSense quality reviews, sensitive routes automatically serve the family-safe <strong>Technology & Programming</strong> category:
                </p>

                <div className="space-y-2.5 pt-2">
                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-mono text-[11px] text-neutral-400">/adult-groups</div>
                      <div className="text-emerald-400 font-bold mt-0.5">
                        {hideAdultContent ? '➜ Serves Technology & Programming' : '➜ Serves Adult (18+) Directory'}
                      </div>
                    </div>
                    <a
                      href="/adult-groups"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-bold transition-all flex items-center gap-1 shrink-0"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-mono text-[11px] text-neutral-400">/categories/adult-18</div>
                      <div className="text-emerald-400 font-bold mt-0.5">
                        {hideAdultContent ? '➜ Redirects to /categories/tech-programming' : '➜ Serves Adult Category'}
                      </div>
                    </div>
                    <a
                      href="/categories/adult-18"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-bold transition-all flex items-center gap-1 shrink-0"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-mono text-[11px] text-neutral-400">/categories (Index Directory)</div>
                      <div className="text-emerald-400 font-bold mt-0.5">
                        {hideAdultContent ? '➜ Adult / 18+ card completely removed' : '➜ Adult card visible'}
                      </div>
                    </div>
                    <a
                      href="/categories"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-bold transition-all flex items-center gap-1 shrink-0"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Card 2: AdSense Policy Checklist */}
              <div className="p-5 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Google AdSense Policy Compliance Audit</span>
                </div>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Current enforcement status across all programmatic layers of your site:
                </p>

                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-950/40">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">Adult Category Scrubbed</span>
                      <p className="text-[11px] text-neutral-400">Omitted from header, navigation pills, categories index, and footer.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-950/40">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">Adult Keywords Stripped</span>
                      <p className="text-[11px] text-neutral-400">Tag clouds, tag directory, and search queries filtered from mature phrases.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-950/40">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">Zero Consent Modals Displayed</span>
                      <p className="text-[11px] text-neutral-400">Reviewers and bots will never see "18+ Age Verification" popups or warnings.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-950/40">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">XML Sitemaps Clean</span>
                      <p className="text-[11px] text-neutral-400">sitemap-categories.xml and sitemap-groups.xml exclude all mature records.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab: Promoted Groups (UPI) */}
        {activeTab === 'promotions' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <AdminPromotionsManager
              onGroupUpdated={(updatedGroup) => {
                onUpdateGroup(updatedGroup);
              }}
            />
          </div>
        )}

        {/* Tab: Broadcast Push Notifications */}
        {activeTab === 'notifications' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <AdminNotificationsManager />
          </div>
        )}

        {/* Tab: Direct groups filter */}
        {activeTab === 'directFilter' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* Header info banner with quick links */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-sm text-neutral-900 dark:text-white">Direct groups filter</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                    Live Endpoints
                  </span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Toggle which community groups appear on the <strong className="text-amber-700 dark:text-amber-300">/direct-promoted-groups</strong> page and <strong className="text-emerald-700 dark:text-emerald-300">/direct-pay</strong>. Selections save automatically.
                </p>

                {/* Direct Page Links & Quick Reference Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href="/direct-promoted-groups"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 dark:border-amber-600/40 text-amber-900 dark:text-amber-200 font-bold text-xs transition-all shadow-2xs group"
                    title="Open /direct-promoted-groups in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>/direct-promoted-groups</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300">Live Collection</span>
                  </a>

                  <a
                    href="/direct-pay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 dark:border-emerald-600/40 text-emerald-900 dark:text-emerald-200 font-bold text-xs transition-all shadow-2xs group"
                    title="Open /direct-pay checkout in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>/direct-pay</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">Payment Gateway</span>
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Custom Quick Selection Preset Dropdown for Direct Filter */}
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleDirectFilterPreset(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1.5 text-xs bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-950 dark:text-amber-200 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>⚡ Custom Select Options...</option>
                  <option value="all_filtered">Select All Visible Filtered ({filteredDirectFilterGroups.length})</option>
                  <option value="adult_only">Select All 18+ Adult Groups</option>
                  <option value="safe_only">Select All Safe Groups</option>
                  <option value="sticky_only">Select All Sticky / Promoted</option>
                  <option value="platform_whatsapp">Select All WhatsApp</option>
                  <option value="platform_telegram">Select All Telegram</option>
                  <option value="platform_discord">Select All Discord</option>
                  <option value="clear">Clear Selection</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    filteredDirectFilterGroups.forEach(g => {
                      if (!g.showInDirectPromoted) {
                        triggerUpdateGroup({ ...g, showInDirectPromoted: true });
                      }
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  Enable All Filtered ({filteredDirectFilterGroups.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    filteredDirectFilterGroups.forEach(g => {
                      if (g.showInDirectPromoted) {
                        triggerUpdateGroup({ ...g, showInDirectPromoted: false });
                      }
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Disable All Filtered
                </button>
              </div>
            </div>

            {/* Batch Toolbar when Direct Filter groups are checked */}
            {selectedDirectFilterGroupIds.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-950 dark:text-amber-200">
                  <CheckSquare className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                  <span>Selected <strong>{selectedDirectFilterGroupIds.length}</strong> group(s)</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleBulkToggleDirectPromoted(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Enable Promoted ({selectedDirectFilterGroupIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkToggleDirectPromoted(false)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>Disable Promoted</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDeleteDirectFilter}
                    disabled={isDeletingBulk}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedDirectFilterGroupIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDirectFilterGroupIds([])}
                    className="px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-bold"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Controls Bar: Search + Adult Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-neutral-50 dark:bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search groups by title, category, or platform..."
                  value={directFilterSearch}
                  onChange={(e) => setDirectFilterSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                />
                {directFilterSearch && (
                  <button
                    onClick={() => setDirectFilterSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Adult group filter tabs */}
              <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setDirectFilterAdultMode('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    directFilterAdultMode === 'all'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  All ({groups.length})
                </button>

                <button
                  type="button"
                  onClick={() => setDirectFilterAdultMode('safe')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    directFilterAdultMode === 'safe'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  Safe Only ({groups.filter(g => !isAdultGroup(g)).length})
                </button>

                <button
                  type="button"
                  onClick={() => setDirectFilterAdultMode('adult')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    directFilterAdultMode === 'adult'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>18+ Adult Only ({groups.filter(g => isAdultGroup(g)).length})</span>
                </button>
              </div>
            </div>

            {/* Filter Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100/70 dark:bg-neutral-800/70 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllDirectFilterSelected}
                          onChange={handleToggleSelectAllDirectFilter}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          title="Select / Deselect all visible groups"
                        />
                      </th>
                      <th className="py-3 px-4">Community Group</th>
                      <th className="py-3 px-4">Platform & Category</th>
                      <th className="py-3 px-4">Members</th>
                      <th className="py-3 px-4">Type / Badges</th>
                      <th className="py-3 px-4 text-right">Direct Groups Filter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {filteredDirectFilterGroups.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-400">
                          No matching groups found.
                        </td>
                      </tr>
                    ) : (
                      filteredDirectFilterGroups.map((g) => {
                        const isSelected = Boolean(g.showInDirectPromoted || g.isDirectPromoted);
                        const isAdult = isAdultGroup(g);
                        const isRowChecked = selectedDirectFilterGroupIds.includes(g.id);
                        return (
                          <tr
                            key={g.id}
                            className={`transition-colors ${
                              isRowChecked
                                ? 'bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100/70 dark:hover:bg-amber-950/60'
                                : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40'
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isRowChecked}
                                onChange={() => handleToggleSelectDirectFilterGroup(g.id)}
                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-bold text-neutral-400">
                                  {g.imageUrl ? (
                                    <img src={g.imageUrl.replace(/&amp;/g, '&')} alt={g.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                  ) : (
                                    g.title.charAt(0)
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-neutral-900 dark:text-white line-clamp-1">
                                    {g.title}
                                  </div>
                                  <div className="text-[10px] text-neutral-400 font-mono">
                                    ID: {g.id}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="capitalize text-neutral-500 font-medium">{g.platform}</span>
                                <span className="text-neutral-400">•</span>
                                <span className="font-semibold text-neutral-700 dark:text-neutral-300">{g.category}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono font-medium">
                              {formatMemberCount(g.memberCount)}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isAdult && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" />
                                    18+ Adult
                                  </span>
                                )}
                                {g.isDirectPromoted ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    Direct Pay Promoted
                                  </span>
                                ) : !isAdult ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                                    Standard
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  triggerUpdateGroup({
                                    ...g,
                                    showInDirectPromoted: !isSelected
                                  });
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ml-auto cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-500'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-700'
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Shown on /direct-promoted-groups</span>
                                  </>
                                ) : (
                                  <span>Hidden</span>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab: Custom User Credits Tool */}
        {activeTab === 'userCredits' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-500/20 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-xl font-black text-neutral-900 dark:text-white">
                  Admin Custom User Credits Tool
                </h2>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-2xl">
                Directly add or adjust promotion credits for any registered user profile using their email address. Credit transactions are permanently logged into the immutable user ledger with an admin approval timestamp.
              </p>
            </div>

            {customCreditNotice && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{customCreditNotice}</span>
                </div>
                <button onClick={() => setCustomCreditNotice(null)} className="text-xs text-neutral-400 hover:text-neutral-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {customCreditError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>{customCreditError}</span>
                </div>
                <button onClick={() => setCustomCreditError(null)} className="text-xs text-neutral-400 hover:text-neutral-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleGrantCustomCredits} className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
                    User Account Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={customCreditEmail}
                      onChange={(e) => setCustomCreditEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
                    Adjustment Mode <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCustomCreditMode('add')}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        customCreditMode === 'add'
                          ? 'bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
                      }`}
                    >
                      Add / Deduct
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomCreditMode('set')}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        customCreditMode === 'set'
                          ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
                      }`}
                    >
                      Set Balance
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {customCreditMode === 'add' ? 'Adjustment Amount' : 'New Credit Balance'} <span className="text-rose-500">*</span>
                  </label>
                  {customCreditMode === 'add' && (
                    <span className="text-[11px] text-neutral-400">Use negative values to deduct (e.g. -50)</span>
                  )}
                </div>
                <input
                  type="number"
                  required
                  value={customCreditAmount}
                  onChange={(e) => setCustomCreditAmount(Number(e.target.value))}
                  placeholder="e.g. 100"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-mono font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-neutral-400">Quick Presets:</span>
                  {[+10, +50, +100, +500, +1000, -50].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setCustomCreditAmount(amt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                        amt > 0
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20'
                      }`}
                    >
                      {amt > 0 ? `+${amt}` : amt} Pts
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
                  Reason / Audit Note <span className="font-normal text-neutral-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={customCreditReason}
                  onChange={(e) => setCustomCreditReason(e.target.value)}
                  placeholder="e.g. Reward for promoting community on Telegram channel"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isGrantingCustomCredits || !customCreditEmail}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGrantingCustomCredits ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying Credits to Account...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>Grant {customCreditAmount > 0 ? `+${customCreditAmount}` : customCreditAmount} Credits to User</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Keyword Exclusion Box */}
        {activeTab === 'keywords' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-900 dark:text-rose-200">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span className="font-bold">Adult & Excluded Keywords Quarantine Engine</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Any community group whose title, description, custom tags, or rules contain one of these keywords will be <strong>automatically isolated as Adult / 18+</strong> and hidden from all public categories unless safe-search is turned off.
              </p>
            </div>

            {keywordNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{keywordNotice}</span>
              </div>
            )}

            {/* Keyword Input Box */}
            <form onSubmit={handleAddKeywords} className="space-y-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Add Adult / Excluded Keywords (Single or Bulk Comma-Separated)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="e.g. nsfw, adult, cam, escort, leaked, onlyfans (comma separated)"
                  className="flex-1 px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Keywords</span>
                </button>
              </div>
            </form>

            {/* Keyword List Chips */}
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-xs text-neutral-900 dark:text-white">
                  Active Excluded Keywords List ({keywordsList.length})
                </h3>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    placeholder="Search keywords..."
                    className="px-2.5 py-1 text-[11px] bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                  />
                  <button
                    onClick={handleResetKeywords}
                    className="px-2 py-1 text-[11px] font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto p-2 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800">
                {keywordsList
                  .filter(k => !keywordSearch || k.toLowerCase().includes(keywordSearch.toLowerCase()))
                  .map((kw) => (
                    <span 
                      key={kw}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 shadow-2xs group"
                    >
                      <span>{kw}</span>
                      <button
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-neutral-400 hover:text-rose-600 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>
            </div>

            {/* Live Filter Test Box */}
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Live Simulator: Test Text for Keyword Detection
              </label>
              <textarea
                rows={2}
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Type any test group title or description here to verify detection..."
                className="w-full p-3 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none"
              />
              {testText && (
                <div className="mt-2">
                  {(() => {
                    const res = analyzeGroupContent({ title: testText, description: testText });
                    return res.isAdult ? (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                        <span><strong>18+ Flagged!</strong> Matched keywords: {res.matchedKeywords.join(', ')}</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span><strong>Safe Content:</strong> No adult keywords detected.</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab: Zero-Tolerance Restricted Keywords Moderation */}
        {activeTab === 'restrictedKeywords' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <AdminRestrictedKeywordsManager />
          </div>
        )}

        {/* Tab: User Comments & Feedback Moderation */}
        {activeTab === 'comments' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <AdminCommentsManager />
          </div>
        )}

        {/* Tab 3: Ad Boxes & Master Show/Hide Controls */}
        {activeTab === 'ads' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* MASTER GLOBAL AD VISIBILITY SWITCH BANNER */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-indigo-500/10 to-purple-500/15 border-2 border-amber-300 dark:border-amber-700/80 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
                    globalAdsOn ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-rose-600 shadow-rose-600/30'
                  }`}>
                    {globalAdsOn ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-neutral-900 dark:text-white">
                        Global Ads Master Visibility Switch
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                        globalAdsOn 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {globalAdsOn ? '● LIVE / SHOWING' : '○ PAUSED / HIDDEN'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                      Toggle to instantly hide or show all advertisement banners and injected scripts across the entire platform.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleToggleGlobalAds(true)}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                      globalAdsOn 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Show Ads</span>
                  </button>

                  <button
                    onClick={() => handleToggleGlobalAds(false)}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                      !globalAdsOn 
                        ? 'bg-rose-600 text-white shadow-md' 
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>Hide Ads</span>
                  </button>
                </div>
              </div>
            </div>

            {/* QUICK LINK TO ADS.TXT & HEADER SCRIPT INJECTOR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-emerald-950 dark:text-emerald-100">
                      Google AdSense /ads.txt
                    </div>
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      Manage authorized sellers & publisher tokens
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('adsTxt')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0 shadow-xs"
                >
                  Edit /ads.txt →
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Code2 className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-sky-950 dark:text-sky-100">
                      Header & Footer Custom Code
                    </div>
                    <div className="text-[11px] text-sky-800 dark:text-sky-300">
                      Inject Google AdSense script tags & pixels
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('customScripts')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-colors shrink-0 shadow-xs"
                >
                  Custom Scripts →
                </button>
              </div>
            </div>

            {adsNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{adsNotice}</span>
              </div>
            )}

            {/* Domain Ad Management Tabs & Quick Preset Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Box 1: All Placements */}
              <div 
                onClick={() => setAdDomainFilter('all')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  adDomainFilter === 'all'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-500" />
                    All Ad Campaigns
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                    {adsList.length} total
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Global view of all active and paused ad placements across all domains.
                </p>
              </div>

              {/* Box 2: Main Domain grouplinks.app */}
              <div 
                onClick={() => setAdDomainFilter('safe')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  adDomainFilter === 'safe'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    grouplinks.app (Safe)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    {adsList.filter(a => a.target === 'safe_only' || a.target === 'all' || a.target === 'everywhere').length} ads
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Google AdSense &amp; family-safe sponsor codes for the main site.
                </p>
              </div>

              {/* Box 3: Subdomain adult.grouplinks.app */}
              <div 
                onClick={() => setAdDomainFilter('adult')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  adDomainFilter === 'adult'
                    ? 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    adult.grouplinks.app (18+)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                    {adsList.filter(a => a.target === 'adult_only' || a.target === 'all' || a.target === 'everywhere').length} ads
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  High-converting adult network codes &amp; banners exclusively for adult.grouplinks.app.
                </p>
              </div>
            </div>

            {/* Quick Bulk Actions Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                  <span>Ad Campaigns &amp; Custom HTML Codes</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200">
                    Filter: {adDomainFilter === 'all' ? 'All Domains' : adDomainFilter === 'safe' ? 'grouplinks.app Only' : 'adult.grouplinks.app Only'}
                  </span>
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  Manage placement locations, custom scripts, banner code, and domain targeting.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleBulkSetAdsStatus(true)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-bold border border-neutral-200 dark:border-neutral-700"
                >
                  Activate All
                </button>
                <button
                  onClick={() => handleBulkSetAdsStatus(false)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold border border-neutral-200 dark:border-neutral-700"
                >
                  Pause All
                </button>
                <button
                  onClick={() => {
                    setEditingAd({
                      id: `ad-${Date.now()}`,
                      title: 'Adult Domain Ad Campaign',
                      slot: 'header_top',
                      target: 'adult_only',
                      format: 'custom_code',
                      sponsorName: 'Adult Network Partner',
                      bannerText: 'Exclusive 18+ promotions and sponsored content.',
                      imageUrl: '',
                      targetUrl: 'https://adult.grouplinks.app',
                      ctaText: 'Explore Now',
                      code: '<!-- adult.grouplinks.app ad banner snippet -->\n<div style="text-align:center; padding:10px;"><a href="https://adult.grouplinks.app" target="_blank" rel="noopener"><strong>18+ Exclusive Partner Offer</strong></a></div>',
                      isActive: true,
                      impressions: 0,
                      clicks: 0,
                      createdAt: new Date().toISOString()
                    });
                    setIsCreatingAd(true);
                  }}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Ad for adult.grouplinks.app</span>
                </button>
                <button
                  onClick={() => {
                    setEditingAd({
                      id: `ad-${Date.now()}`,
                      title: 'New Ad Campaign',
                      slot: 'header_top',
                      target: 'safe_only',
                      format: 'banner_image',
                      sponsorName: 'Featured Partner',
                      bannerText: 'Get exclusive deals and tools for your online community.',
                      imageUrl: '',
                      targetUrl: 'https://grouplinks.app',
                      ctaText: 'Learn More',
                      isActive: true,
                      impressions: 0,
                      clicks: 0,
                      createdAt: new Date().toISOString()
                    });
                    setIsCreatingAd(true);
                  }}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Standard Ad</span>
                </button>
              </div>
            </div>

            {/* Ad Placements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adsList
                .filter(ad => {
                  if (adDomainFilter === 'safe') return ad.target === 'safe_only' || ad.target === 'all' || ad.target === 'everywhere';
                  if (adDomainFilter === 'adult') return ad.target === 'adult_only' || ad.target === 'all' || ad.target === 'everywhere';
                  return true;
                })
                .map((ad) => (
                <div 
                  key={ad.id}
                  className={`p-4 rounded-2xl bg-white dark:bg-neutral-900 border transition-all flex flex-col justify-between ${
                    ad.isActive && globalAdsOn
                      ? 'border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md'
                      : 'border-dashed border-neutral-300 dark:border-neutral-700 opacity-60'
                  }`}
                >
                  <div>
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        (ad.slot === 'join_button_ad' || ad.slot === 'above_join_button')
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}>
                        {ad.slot === 'join_button_ad' ? '🔘 Join button ad' : ad.slot === 'above_join_button' ? '🔝 Above Join Flow' : `Slot: ${ad.slot}`}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        {ad.target === 'safe_only' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            🛡️ Safe Only
                          </span>
                        ) : ad.target === 'adult_only' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            🔞 Adult Only
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                            🌐 All Groups
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ad.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-neutral-200 text-neutral-600'
                        }`}>
                          {ad.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white line-clamp-1">
                      {ad.title}
                    </h4>
                    <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                      {ad.format === 'custom_code' ? (ad.code?.substring(0, 100) + '...') : ad.bannerText}
                    </p>

                    <div className="flex items-center gap-3 mt-3 text-[11px] text-neutral-400">
                      <span>Format: <strong>{ad.format}</strong></span>
                      <span>•</span>
                      <span>Impressions: <strong>{ad.impressions || 0}</strong></span>
                      <span>•</span>
                      <span>Clicks: <strong>{ad.clicks || 0}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 mt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400">
                      Sponsor: {ad.sponsorName || 'Network'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const updated = adsList.map(a => a.id === ad.id ? { ...a, isActive: !a.isActive } : a);
                          setAdsList(updated);
                          saveStoredAds(updated);
                        }}
                        className={`p-1.5 rounded-lg text-xs font-bold border ${
                          ad.isActive 
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title={ad.isActive ? 'Pause Ad' : 'Activate Ad'}
                      >
                        {ad.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          setEditingAd(ad);
                          setIsCreatingAd(false);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-indigo-50 hover:text-indigo-600 border border-neutral-200 dark:border-neutral-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAd(ad.id)}
                        className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* Tab 4: 2-Step Verification (2FA Email OTP & Authenticator) */}
        {activeTab === 'twofactor' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
            
            {/* Header banner */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-emerald-300 dark:border-emerald-800/80 shadow-sm flex items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 shrink-0">
                  {twoFactorMethod === 'email_otp' ? <Mail className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                      2-Step Verification (2FA Security)
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      is2FAEnabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      {is2FAEnabled ? (twoFactorMethod === 'email_otp' ? 'EMAIL OTP ACTIVE' : 'AUTHENTICATOR ACTIVE') : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                    Secures admin logins on <strong>/kiran8728</strong> with dynamic one-time authentication codes.
                  </p>
                </div>
              </div>

              {twoFactorMethod === 'authenticator' && (
                <div className="bg-white dark:bg-neutral-800 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-center shrink-0 hidden md:block">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase">Live Code Test</div>
                  <div className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                    {currentLiveCode}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    Sync in {totpSecondsRemaining}s
                  </div>
                </div>
              )}
            </div>

            {twoFactorNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{twoFactorNotice}</span>
              </div>
            )}

            {twoFactorError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{twoFactorError}</span>
              </div>
            )}

            {/* 2FA Method Selector */}
            <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white">
                    1. Choose 2FA Delivery Method
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Select how you want to receive your 6-digit second factor login verification codes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Enable 2FA:</span>
                  <input
                    type="checkbox"
                    checked={is2FAEnabled}
                    onChange={(e) => setIs2FAEnabled(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Method 1: Email OTP */}
                <button
                  type="button"
                  onClick={() => setTwoFactorMethod('email_otp')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    twoFactorMethod === 'email_otp'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-neutral-900 dark:text-white">
                      <Mail className="w-4 h-4 text-emerald-600" />
                      <span>Email OTP Verification</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    One-time 6-digit passcode delivered to <strong>{AUTHORIZED_ADMIN_EMAIL}</strong> on every admin login. No mobile app setup needed.
                  </p>
                </button>

                {/* Method 2: Google Authenticator */}
                <button
                  type="button"
                  onClick={() => setTwoFactorMethod('authenticator')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    twoFactorMethod === 'authenticator'
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-neutral-900 dark:text-white">
                      <Smartphone className="w-4 h-4 text-indigo-600" />
                      <span>Google Authenticator (TOTP)</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                      App-Based
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Generates 30-second rolling codes via Google Authenticator or Microsoft Authenticator app on your smartphone.
                  </p>
                </button>
              </div>
            </div>

            {/* Email OTP Configuration Panel */}
            {twoFactorMethod === 'email_otp' && (
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-4">
                <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>2. Email OTP Confirmation</span>
                </h4>
                
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Registered Admin Email:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{AUTHORIZED_ADMIN_EMAIL}</span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    When logging in on <strong>/kiran8728</strong>, after entering your password, a dynamic 6-digit OTP code is instantly sent to your inbox. You can resend every 60 seconds with rate-limit protection.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyAndSave2FA}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{is2FAEnabled ? 'Save Email OTP 2FA Setting' : 'Disable 2-Step Verification'}</span>
                </button>
              </div>
            )}

            {/* Google Authenticator QR Code & Key Setup Grid */}
            {twoFactorMethod === 'authenticator' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Box 1: Scan QR Code */}
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>2. Setup Authenticator App</span>
                    </h4>
                    <button
                      onClick={handleGenerateNewSecret}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>New Key</span>
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 gap-3">
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium text-center max-w-xs">
                      Tap the button below to auto-import into <strong>Google Authenticator</strong> or your default 2FA app, or enter the secret key manually.
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={otpAuthUri}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 transition-colors"
                        title="Click to launch Google Authenticator or default 2FA app on this device"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Open in Authenticator App</span>
                      </a>
                    </div>
                  </div>

                  {/* Secret Key Box */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-neutral-500 uppercase">
                        Or Enter Secret Key Manually
                      </label>
                      <span className="text-[10px] text-neutral-400">Base32 Secret</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={formatSecretKey(twoFactorSecret)}
                        className="flex-1 font-mono text-xs font-bold p-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white select-all tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 shrink-0 transition-colors"
                      >
                        {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      In Google Authenticator, tap <strong>"+"</strong> &rarr; <strong>"Enter a setup key"</strong> &rarr; Account: <code>kirankumar8728@gmail.com</code> &rarr; Key type: <strong>Time-based</strong>.
                    </p>
                  </div>
                </div>

                {/* Box 2: Verification & Toggle Settings */}
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white mb-2">
                      3. Confirm Authenticator Code
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                      Enter the 6-digit code currently shown in your Authenticator app to link and activate.
                    </p>

                    {/* Live Clock & Device Sync Indicator */}
                    <div className="p-3 mb-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span className="font-bold text-emerald-900 dark:text-emerald-200">
                            Live Device Sync Preview:
                          </span>
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          Sync in {totpSecondsRemaining}s
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                          Your phone should currently show:
                        </span>
                        <span className="font-mono text-base font-black tracking-widest text-emerald-600 dark:text-emerald-400 bg-white dark:bg-neutral-900 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm">
                          {currentLiveCode}
                        </span>
                      </div>
                    </div>

                    {is2FAEnabled && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          Enter 6-Digit Code from Phone to Save
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={testTotpInput}
                          onChange={(e) => setTestTotpInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 123456"
                          className="w-full px-3.5 py-2.5 text-center font-mono text-xl font-bold tracking-widest bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="text-[11px] text-neutral-400">
                          Type the code shown in Google Authenticator to verify phone synchronization before saving.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleVerifyAndSave2FA}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Authenticator 2FA Settings</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Emergency Single-Use Backup Recovery Codes */}
            <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white">
                    Emergency Backup Recovery Keys ({backupCodes.length} remaining)
                  </h4>
                  <p className="text-xs text-neutral-500">
                    If you ever lose access to your email or authenticator app, enter one of these single-use 8-digit recovery keys on the login screen.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyBackupCodes}
                    className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-200 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1.5"
                  >
                    {copiedBackup ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBackup ? 'Copied All' : 'Copy All'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateBackupCodes}
                    className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-200 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {backupCodes.map((code, idx) => (
                  <div 
                    key={idx}
                    className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 font-mono text-center font-bold text-xs text-neutral-800 dark:text-neutral-200 select-all"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab: ads.txt Manager */}
        {activeTab === 'adsTxt' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
            
            {/* Header banner */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-300 dark:border-emerald-800/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                      Authorized Digital Sellers (<code className="text-emerald-600 dark:text-emerald-400">/ads.txt</code>) Manager
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                      HTTP 200 Live
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed">
                    Standardized IAB verification file required by Google AdSense, Google Ad Manager, Media.net, and advertising networks to authenticate your domain and prevent counterfeit ad inventory.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/ads.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Open /ads.txt</span>
                </a>
              </div>
            </div>

            {/* Notification messages */}
            {adsTxtNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2.5 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{adsTxtNotice}</span>
              </div>
            )}

            {adsTxtError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 text-xs font-semibold flex items-center gap-2.5 border border-rose-200 dark:border-rose-800 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{adsTxtError}</span>
              </div>
            )}

            {/* Live Verification & Status Tool */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    Live Route Verification & Crawler Checker
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestAdsTxtLive}
                    disabled={isTestingAdsTxt}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isTestingAdsTxt ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing Live Route...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Test Live /ads.txt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {adsTxtTestStatus && (
                <div className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 border ${
                  adsTxtTestStatus.ok 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {adsTxtTestStatus.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>
                      <strong>Status:</strong> {adsTxtTestStatus.statusText} • <strong>Active Records Detected:</strong> {adsTxtTestStatus.linesCount} lines
                    </span>
                  </div>
                  <span className="text-[11px] font-mono opacity-80">
                    {adsTxtTestStatus.ok ? 'Ready for Google AdSense & Ad Networks' : 'Check route configuration'}
                  </span>
                </div>
              )}
            </div>

            {/* Quick 1-Click Templates */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                1-Click Quick Provider Templates (Click to append into editor):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const snippet = `google.com, pub-5329614490007911, DIRECT, f08c47fec0942fa0\n`;
                    setAdsTxtContent(prev => prev ? `${prev.trimEnd()}\n${snippet}` : snippet);
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors"
                >
                  + Google AdSense (DIRECT)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const snippet = `google.com, pub-5329614490007911, RESELLER, f08c47fec0942fa0\n`;
                    setAdsTxtContent(prev => prev ? `${prev.trimEnd()}\n${snippet}` : snippet);
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors"
                >
                  + Google Ad Manager (RESELLER)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const snippet = `media.net, 8CU12345, DIRECT\n`;
                    setAdsTxtContent(prev => prev ? `${prev.trimEnd()}\n${snippet}` : snippet);
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors"
                >
                  + Media.net
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const snippet = `applovin.com, 12345, DIRECT\n`;
                    setAdsTxtContent(prev => prev ? `${prev.trimEnd()}\n${snippet}` : snippet);
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors"
                >
                  + AppLovin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const snippet = `taboola.com, 12345, DIRECT\n`;
                    setAdsTxtContent(prev => prev ? `${prev.trimEnd()}\n${snippet}` : snippet);
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors"
                >
                  + Taboola
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const snippet = `ezoic.com, 12345, DIRECT\n`;
                    setAdsTxtContent(prev => prev ? `${prev.trimEnd()}\n${snippet}` : snippet);
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors"
                >
                  + Ezoic
                </button>
              </div>
            </div>

            {/* Main ads.txt Editor */}
            <form onSubmit={handleSaveAdsTxt} className="space-y-4">
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    ads.txt File Editor (Plain Text)
                  </label>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                    <span>Format: &lt;Domain&gt;, &lt;PublisherID&gt;, &lt;DIRECT|RESELLER&gt;, &lt;AuthID&gt;</span>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={12}
                    value={adsTxtContent}
                    onChange={(e) => setAdsTxtContent(e.target.value)}
                    placeholder={`# ads.txt for Group Links Platform\n# Lines starting with # are comments\ngoogle.com, pub-5329614490007911, DIRECT, f08c47fec0942fa0\n`}
                    spellCheck={false}
                    className="w-full p-4 text-xs font-mono bg-neutral-950 text-emerald-400 rounded-xl border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed tab-size-4"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 pt-1">
                  <span>
                    Total Lines: <strong>{adsTxtContent ? adsTxtContent.split('\n').length : 0}</strong> • Active Records: <strong>{adsTxtContent ? adsTxtContent.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length : 0}</strong>
                  </span>
                  <span className="italic">
                    Tip: Replace <code className="text-amber-500">pub-5329614490007911</code> with your 16-digit Google AdSense Publisher ID.
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Reset ads.txt to standard default Google AdSense template?')) {
                        setAdsTxtContent(`# ads.txt - Group Links Directory\n# Replace with your actual publisher IDs provided by Google AdSense or your Ad Network\n# Format: <Field #1>, <Field #2>, <Field #3>, <Field #4>\ngoogle.com, pub-5329614490007911, DIRECT, f08c47fec0942fa0\n`);
                      }
                    }}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors"
                  >
                    Reset to Default
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([adsTxtContent], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'ads.txt';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSavingAdsTxt}
                  className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/30 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSavingAdsTxt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing ads.txt...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Publish ads.txt</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        )}

        {/* Tab: Header & Footer Scripts / SEO & Tracking Verifications */}
        {activeTab === 'customScripts' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
            
            <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <Code2 className="w-6 h-6 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <h4 className="font-bold text-sm text-sky-950 dark:text-sky-100">
                    Header & Footer Custom Code Injection / SEO Verifications
                  </h4>
                  <p className="text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
                    Paste Google Analytics tracking IDs, Google Search Console, Bing tags, or arbitrary custom HTML/JS/CSS code into your website's header and footer.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    refreshInjectedDomStats();
                    setIsInspectingDom(prev => !prev);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isInspectingDom ? 'Hide DOM Inspector' : 'Inspect Injected Elements'}</span>
                </button>
              </div>
            </div>

            {/* Live DOM Injection Status Indicator */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  Live Front-End DOM Status:
                </span>
                <span className="text-xs text-neutral-600 dark:text-neutral-300">
                  <strong>{liveInjectedStats.activeCount}</strong> active elements ({liveInjectedStats.headCount} in &lt;head&gt;, {liveInjectedStats.bodyCount} in &lt;body&gt;)
                </span>
              </div>
              <button
                type="button"
                onClick={refreshInjectedDomStats}
                className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Re-scan DOM</span>
              </button>
            </div>

            {/* Expandable Live DOM Inspector Preview */}
            {isInspectingDom && (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-200 space-y-3 font-mono text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between text-neutral-400 pb-2 border-b border-neutral-800">
                  <span className="font-bold text-neutral-200 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-sky-400" />
                    Currently Injected Active DOM Elements ({injectedNodesList.length})
                  </span>
                  <span className="text-[11px]">Inspectable via Browser DevTools Elements tab</span>
                </div>

                {injectedNodesList.length === 0 ? (
                  <p className="text-neutral-500 italic py-2">No custom elements currently injected. Paste code below and click "Save & Apply".</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {injectedNodesList.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-start gap-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                          item.section === 'head' ? 'bg-sky-950 text-sky-400 border border-sky-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          &lt;{item.section}&gt;
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-800 text-neutral-300 font-bold shrink-0">
                          &lt;{item.tag}&gt;
                        </span>
                        <span className="text-emerald-400 text-[11px] truncate flex-1 font-mono">
                          {item.preview}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {scriptsNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2.5 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{scriptsNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveScriptsConfig} className="space-y-6">
              
              {/* Quick Presets / Shortcuts */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 dark:bg-neutral-900/60 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-500" />
                  Quick Presets & Testing Tools
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScriptsConfig(prev => ({
                        ...prev,
                        googleAnalyticsId: prev.googleAnalyticsId || 'G-EXAMPLE123',
                      }));
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    + Add Sample GA4 ID
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScriptsConfig(prev => ({
                        ...prev,
                        googleVerificationCode: prev.googleVerificationCode || '<meta name="google-site-verification" content="sample_verification_token_123" />',
                      }));
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    + Add Sample Meta Verification
                  </button>
                </div>
              </div>

              {/* Grid: Search Engine & Analytics Quick Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Google Analytics */}
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <label className="block text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Google Analytics ID (GA4)
                  </label>
                  <input
                    type="text"
                    value={scriptsConfig.googleAnalyticsId}
                    onChange={(e) => setScriptsConfig(prev => ({ ...prev, googleAnalyticsId: e.target.value }))}
                    placeholder="e.g. G-ABC123XYZ"
                    className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                    Auto-loads Google <code className="text-sky-600 dark:text-sky-400">gtag.js</code> and initializes traffic measurement across all pages.
                  </p>
                </div>

                {/* 2. Google Search Console */}
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <label className="block text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Google Search Console Code
                  </label>
                  <input
                    type="text"
                    value={scriptsConfig.googleVerificationCode}
                    onChange={(e) => setScriptsConfig(prev => ({ ...prev, googleVerificationCode: e.target.value }))}
                    placeholder='Code or <meta name="..." content="..." />'
                    className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                    Verifies website ownership in Search Console. Accepts raw token or full meta tag.
                  </p>
                </div>

                {/* 3. Bing / Microsoft Webmaster */}
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <label className="block text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Bing Webmaster Tag
                  </label>
                  <input
                    type="text"
                    value={scriptsConfig.bingVerificationCode}
                    onChange={(e) => setScriptsConfig(prev => ({ ...prev, bingVerificationCode: e.target.value }))}
                    placeholder='Code or <meta name="msvalidate.01" ... />'
                    className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                    Verifies site ownership in Bing Webmaster Tools (<code className="text-amber-600 dark:text-amber-400">msvalidate.01</code>).
                  </p>
                </div>

              </div>

              {/* Textarea 1: Custom Header Scripts (<head>) */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-sky-500" />
                    Custom Header Code & Scripts (&lt;head&gt;)
                  </label>
                  <span className="text-[10px] font-mono text-neutral-400">Injected in &lt;head&gt;</span>
                </div>
                <textarea
                  rows={5}
                  value={scriptsConfig.customHeadCode}
                  onChange={(e) => setScriptsConfig(prev => ({ ...prev, customHeadCode: e.target.value }))}
                  placeholder={`<!-- Paste custom <script>, <meta>, or <link> tags here -->\n<meta name="custom-meta" content="value" />\n<script>\n  console.log("Custom header code initialized");\n</script>`}
                  className="w-full p-3 text-xs font-mono bg-neutral-950 text-emerald-400 rounded-xl border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Ideal for Google Tag Manager <code className="text-neutral-300">&lt;head&gt;</code> scripts, Google AdSense auto-ads code, Facebook Pixel, Pinterest Tag, custom CSS fonts, or additional verification tags.
                </p>
              </div>

              {/* Textarea 2: Custom Footer Scripts (<body>) */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-500" />
                    Custom Footer Code & Scripts (Before &lt;/body&gt;)
                  </label>
                  <span className="text-[10px] font-mono text-neutral-400">Injected before &lt;/body&gt;</span>
                </div>
                <textarea
                  rows={5}
                  value={scriptsConfig.customBodyCode}
                  onChange={(e) => setScriptsConfig(prev => ({ ...prev, customBodyCode: e.target.value }))}
                  placeholder={`<!-- Paste custom footer scripts, chat widgets, or conversion tracking here -->\n<script>\n  // Custom footer tracking snippet\n</script>`}
                  className="w-full p-3 text-xs font-mono bg-neutral-950 text-emerald-400 rounded-xl border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Ideal for live chat widgets (Tawk.to, Crisp, Intercom), affiliate conversion pixels, or asynchronous analytics widgets.
                </p>
              </div>

              {/* Actions Toolbar */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all custom header and footer script configurations?')) {
                      const emptyConfig = {
                        googleAnalyticsId: '',
                        googleVerificationCode: '',
                        bingVerificationCode: '',
                        customHeadCode: '',
                        customBodyCode: '',
                      };
                      setScriptsConfig(emptyConfig);
                      saveCustomScriptsConfig(emptyConfig);
                      refreshInjectedDomStats();
                      setScriptsNotice('All custom script configurations cleared.');
                      setTimeout(() => setScriptsNotice(null), 3000);
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors"
                >
                  Clear All Scripts
                </button>

                <button
                  type="submit"
                  disabled={isSavingScripts}
                  className="px-6 py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-950/30 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSavingScripts ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving & Applying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Apply Script Settings</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        )}

        {/* Tab 5: Security & Master Password */}
        {activeTab === 'security' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
            
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-3">
              <KeyRound className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-100">
                  Primary Administrator Access & Credentials
                </h4>
                <p className="text-xs text-indigo-800 dark:text-indigo-300">
                  Password reset OTP verification is bound strictly to: <strong>{AUTHORIZED_ADMIN_EMAIL}</strong>
                </p>
              </div>
            </div>

            {passwordNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{passwordNotice}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                Change Master Admin Password
              </h3>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  New Admin Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all"
              >
                Save New Password
              </button>
            </form>

          </div>
        )}

        {/* Tab: Backup & Restore Data */}
        {activeTab === 'backup' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
            
            {/* Header info banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-start gap-3">
              <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-100">
                  Comprehensive System Backup & Restore
                </h4>
                <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                  Backup and restore all user-submitted groups, custom tags, categories, adult banned keywords, custom ad placements, and SEO header/footer tracking codes in 1 click.
                </p>
              </div>
            </div>

            {backupNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{backupNotice}</span>
              </div>
            )}

            {backupError && (
              <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{backupError}</span>
              </div>
            )}



            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Export Complete Backup */}
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-4 flex flex-col justify-between shadow-xs">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                      Export Master Backup JSON
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                      Downloads a complete `.json` snapshot of all groups ({groups.length}), custom tags, filter keywords, ads, and SEO tracking codes to your computer.
                    </p>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                    <div className="flex items-center justify-between">
                      <span>• Total Database Groups:</span>
                      <strong className="text-neutral-900 dark:text-white font-mono">{adminTotalCount || groups.length}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>• Total Comments Data:</span>
                      <strong className="text-neutral-900 dark:text-white font-mono">
                        {groups.reduce((acc, g) => acc + (Array.isArray(g.comments) ? g.comments.length : 0), 0)} comments
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>• Group Ratings & URLs:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Preserved</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>• Banned Filter Keywords:</span>
                      <strong className="text-neutral-900 dark:text-white font-mono">{keywordsList.length}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>• Active Ad Placements:</span>
                      <strong className="text-neutral-900 dark:text-white font-mono">{adsList.length}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportCompleteBackup}
                  disabled={backupExporting}
                  className="w-full py-3 px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {backupExporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Exporting Complete Master Backup...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Master Backup (JSON)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Box 2: Restore Backup */}
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-4 flex flex-col justify-between shadow-xs">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                      Restore System Backup (JSON)
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                      Upload a previously exported backup file to restore all your groups, comments data, user ratings, links, tags, and settings.
                    </p>
                  </div>

                  {/* File Upload Dropzone */}
                  <label className="block cursor-pointer">
                    <div className="p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl bg-neutral-50/50 dark:bg-neutral-800/50 text-center transition-all">
                      <FileJson className="w-6 h-6 text-neutral-400 mx-auto mb-1.5" />
                      <span className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        {backupFile ? backupFile.name : 'Click to select Backup JSON file'}
                      </span>
                      <span className="block text-[10px] text-neutral-400 mt-0.5">
                        Supports .json exported files (All groups, comments, ratings & URLs)
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Backup Inspection Card */}
                {backupPreview && (
                  <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-200">
                      <span className="flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <span>Backup Ready to Restore</span>
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">v{backupPreview.version}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                      <div>📁 Groups: <strong className="text-neutral-900 dark:text-white font-mono">{backupPreview.totalGroups}</strong></div>
                      <div>💬 Comments: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{backupPreview.totalCommentsCount}</strong></div>
                      <div>⭐ Ratings: <strong className="text-amber-600 dark:text-amber-400 font-mono">{backupPreview.totalRatingsCount}</strong></div>
                      <div>📌 Pinned: <strong className="text-neutral-900 dark:text-white font-mono">{backupPreview.totalStickyCount}</strong></div>
                      <div>🛡️ Keywords: <strong className="text-neutral-900 dark:text-white font-mono">{backupPreview.customKeywordsCount}</strong></div>
                      <div>📢 Ads: <strong className="text-neutral-900 dark:text-white font-mono">{backupPreview.adPlacementsCount}</strong></div>
                    </div>

                    {/* Restore Mode Selector */}
                    <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 space-y-1">
                      <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                        Restore Strategy:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRestoreMode('merge')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            restoreMode === 'merge'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          🔀 Merge (Safe)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRestoreMode('replace')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            restoreMode === 'replace'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          🔄 Replace All
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleExecuteRestore}
                      disabled={backupRestoring}
                      className="w-full mt-2 py-2.5 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {backupRestoring ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Restoring Data...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Confirm & Restore Backup</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Box: Reset All Engagement Metrics to Zero */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/60 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                        Reset Community Metrics to Zero
                      </h3>
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        Clear all Upvotes, Joins, and Shares across all groups
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed pt-1">
                    Instantly zeroes out accumulated <strong>upvotes</strong>, <strong>clicks/joins</strong>, <strong>shares</strong>, and <strong>24-hour activity scores</strong> across all groups in MySQL and in-memory cache. Group titles, invite links, categories, and tags remain 100% intact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetMetricsModal(true)}
                  className="shrink-0 px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All to Zero</span>
                </button>
              </div>

              {resetMetricsSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetMetricsSuccess}</span>
                </div>
              )}

              {resetMetricsError && (
                <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resetMetricsError}</span>
                </div>
              )}
            </div>

            {/* Explanatory Help Footer Card */}
            <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                <HardDrive className="w-4 h-4 text-indigo-500" />
                <span>Hostinger & Deployment Backup Workflow Tip</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                Before pushing new code to GitHub or redeploying your app on Hostinger, click <strong>"Download Master Backup (JSON)"</strong> to save a snapshot. After Hostinger finishes deploying, visit <strong>/kiran8728</strong>, upload your JSON file under <strong>Restore System Backup</strong>, and select <strong>Merge (Safe)</strong> to instantly restore all user-submitted links, tags, and custom settings.
              </p>
            </div>

            {/* Dedicated Push Subscriber Backup & Migration Component */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <PushSubscriberBackupUtility />
            </div>

          </div>
        )}

        {/* Tab: Platform Reward & Credit Settings */}
        {activeTab === 'rewards' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Platform Reward & Credit Configuration</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Customize how many credits users earn for signups, upvotes, shares, ratings, comments, and referrals.
                </p>
              </div>
            </div>

            {rewardSuccessMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{rewardSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveRewardSettings} className="space-y-5 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                    <span>Signup Bonus Credits (+Default)</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Given on new user registration</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={rewardSettings?.signupBonus ?? ''}
                    onChange={(e) => setRewardSettings(prev => ({ ...prev, signupBonus: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                    <span>Upvote Reward Credits</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Per community upvote</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rewardSettings?.upvoteReward ?? ''}
                    onChange={(e) => setRewardSettings(prev => ({ ...prev, upvoteReward: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                    <span>Share Reward Credits</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Per community share</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rewardSettings?.shareReward ?? ''}
                    onChange={(e) => setRewardSettings(prev => ({ ...prev, shareReward: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                    <span>Rating Reward Credits</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Per star review / rating</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rewardSettings?.ratingReward ?? ''}
                    onChange={(e) => setRewardSettings(prev => ({ ...prev, ratingReward: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                    <span>Comment Reward Credits</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Per valid comment posted</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rewardSettings?.commentReward ?? ''}
                    onChange={(e) => setRewardSettings(prev => ({ ...prev, commentReward: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                    <span>Referral Reward Credits</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Per successful referral signup</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rewardSettings?.referralReward ?? ''}
                    onChange={(e) => setRewardSettings(prev => ({ ...prev, referralReward: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSavingRewards}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSavingRewards ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Reward Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab: Bulk Add & Auto Scrape Group Links */}
        {activeTab === 'bulkImport' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
            
            {/* Header info banner */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 dark:from-indigo-950/60 dark:via-purple-950/60 dark:to-emerald-950/60 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                  <Server className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm sm:text-base text-neutral-900 dark:text-white">
                      Bulk Group Links Scraper & Offline Background Engine
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                      <Zap className="w-3 h-3" />
                      20,000+ Links Capable
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    Upload a <strong>.txt</strong> or <strong>.csv</strong> file containing thousands of invite links. The server queue extracts metadata, scrapes titles, avatars, descriptions, assigns categories, deduplicates, and publishes groups <strong>24/7 in the background</strong> even if you close your browser or turn off your computer!
                  </p>
                </div>
              </div>

              {/* Top Mode Switcher */}
              <div className="flex items-center gap-1 p-1 bg-white/80 dark:bg-neutral-900/80 rounded-2xl border border-neutral-200 dark:border-neutral-700 shrink-0 self-stretch sm:self-auto justify-center">
                <button
                  type="button"
                  onClick={() => setBgImportMode('fileUpload')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    bgImportMode === 'fileUpload'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>📁 Offline File Importer (20k+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBgImportMode('quickPaste')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    bgImportMode === 'quickPaste'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>✍️ Quick Paste</span>
                </button>
              </div>
            </div>

            {/* Notification alert banner */}
            {bgNotice && (
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{bgNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBgNotice(null)}
                  className="p-1 hover:bg-indigo-200/50 dark:hover:bg-indigo-900/50 rounded-lg text-indigo-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* LIVE SERVER BACKGROUND WORKER DASHBOARD (Always visible if a job is active or completed) */}
            {bgJob && (bgJob.status === 'running' || bgJob.status === 'paused' || bgJob.processed > 0) && (
              <div className="bg-white dark:bg-neutral-900 p-5 sm:p-6 rounded-3xl border border-indigo-200 dark:border-indigo-800 space-y-5 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white ${
                      bgJob.status === 'running' ? 'bg-emerald-600 animate-pulse' :
                      bgJob.status === 'paused' ? 'bg-amber-500' :
                      bgJob.status === 'completed' ? 'bg-indigo-600' : 'bg-neutral-600'
                    }`}>
                      {bgJob.status === 'running' ? <Activity className="w-5 h-5" /> :
                       bgJob.status === 'paused' ? <Pause className="w-5 h-5" /> :
                       bgJob.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-neutral-900 dark:text-white">
                          Cloud Background Scraper Status
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          bgJob.status === 'running' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' :
                          bgJob.status === 'paused' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800' :
                          bgJob.status === 'completed' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                          'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}>
                          {bgJob.status === 'running' ? '🟢 Running 24/7 on Server' :
                           bgJob.status === 'paused' ? '⏸️ Worker Paused' :
                           bgJob.status === 'completed' ? '✅ Completed' : bgJob.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                        Job: {bgJob.fileName || bgJob.id} • {bgJob.total.toLocaleString()} total links
                      </p>
                    </div>
                  </div>

                  {/* Worker Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {bgJob.status === 'running' && (
                      <button
                        type="button"
                        onClick={() => handleBackgroundAction('pause')}
                        disabled={bgActionLoading}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                    )}

                    {bgJob.status === 'paused' && (
                      <button
                        type="button"
                        onClick={() => handleBackgroundAction('resume')}
                        disabled={bgActionLoading}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                    )}

                    {(bgJob.status === 'running' || bgJob.status === 'paused') && (
                      <button
                        type="button"
                        onClick={() => handleBackgroundAction('cancel')}
                        disabled={bgActionLoading}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </button>
                    )}

                    {bgJob.failed > 0 && (
                      <button
                        type="button"
                        onClick={handleExportFailedLinks}
                        className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Failed URLs ({bgJob.failed})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleBackgroundAction('clear')}
                      disabled={bgActionLoading || bgJob.status === 'running'}
                      className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-xs font-bold disabled:opacity-30 cursor-pointer"
                    >
                      Clear Job
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Numerical Metrics */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-900 dark:text-white">
                    <span className="flex items-center gap-2">
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                        {Math.round(((bgJob.processed || 0) / (bgJob.total || 1)) * 100)}%
                      </span>
                      <span>Progress ({bgJob.processed.toLocaleString()} of {bgJob.total.toLocaleString()} processed)</span>
                    </span>

                    {bgJob.status === 'running' && bgJob.ratePerMinute > 0 && (
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>{bgJob.ratePerMinute} links/min</span>
                        {bgJob.estimatedSecondsRemaining > 0 && (
                          <span>• ETA: ~{Math.ceil(bgJob.estimatedSecondsRemaining / 60)} min</span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-neutral-200 dark:border-neutral-700">
                    <div
                      className="bg-gradient-to-r from-indigo-600 to-emerald-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, Math.round(((bgJob.processed || 0) / (bgJob.total || 1)) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* 4 Metric Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Published</span>
                    </div>
                    <div className="text-xl font-black text-emerald-950 dark:text-emerald-100 mt-1 font-mono">
                      {bgJob.successful.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                    <div className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Skipped (Dupes)</span>
                    </div>
                    <div className="text-xl font-black text-indigo-950 dark:text-indigo-100 mt-1 font-mono">
                      {bgJob.skippedDuplicates.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                    <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Errors / Invalid</span>
                    </div>
                    <div className="text-xl font-black text-rose-950 dark:text-rose-100 mt-1 font-mono">
                      {bgJob.failed.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700">
                    <div className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Remaining</span>
                    </div>
                    <div className="text-xl font-black text-neutral-900 dark:text-white mt-1 font-mono">
                      {Math.max(0, bgJob.total - bgJob.processed).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Offline Safe Notice */}
                <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                  <WifiOff className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-tight">
                    <span className="font-extrabold">Offline-Safe Background Worker Guarantee:</span>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      You can close this tab, shut down your PC, or disconnect your Wi-Fi. The cloud container will continue fetching metadata and publishing groups. Refresh or log in from any device to see live progress.
                    </p>
                  </div>
                </div>

                {/* Live Activity Stream Table */}
                {bgJob.recentLogs && bgJob.recentLogs.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      <span>Live Worker Log (Latest {bgJob.recentLogs.length} events)</span>
                      <button
                        type="button"
                        onClick={fetchBackgroundJobStatus}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Refresh Stream</span>
                      </button>
                    </div>

                    <div className="max-h-52 overflow-y-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/50 p-2 font-mono text-[11px] space-y-1">
                      {bgJob.recentLogs.map((l) => (
                        <div key={l.id} className="flex items-start gap-2 py-1 px-2 rounded hover:bg-white dark:hover:bg-neutral-900 transition-colors">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                            l.status === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            l.status === 'duplicate' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                            l.status === 'error' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                            'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}>
                            {l.status}
                          </span>
                          <span className="text-neutral-400 text-[10px] shrink-0">
                            {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="text-neutral-900 dark:text-neutral-200 font-semibold truncate max-w-[200px]">
                            {l.title || l.platform}
                          </span>
                          <span className="text-neutral-500 dark:text-neutral-400 truncate flex-1">
                            {l.message || l.url}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* MAIN UPLOAD / INPUT FORM */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-5 shadow-xs">
              
              {bgImportMode === 'fileUpload' ? (
                /* FILE DRAG & DROP / SELECTOR (FOR 20k+ LINKS) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-900 dark:text-white">
                      Upload Links File (.txt or .csv up to 50,000+ URLs):
                    </label>
                    <span className="text-[11px] text-neutral-500">
                      Supports WhatsApp, Telegram, Discord, Reddit, Facebook, Signal, Snapchat
                    </span>
                  </div>

                  <div className="relative border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-6 sm:p-8 text-center bg-indigo-50/20 dark:bg-indigo-950/20 transition-all">
                    <input
                      type="file"
                      accept=".txt,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSelectBackgroundFile(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <div className="flex flex-col items-center justify-center space-y-2.5 pointer-events-none">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shadow-xs">
                        <FileUp className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-extrabold text-neutral-900 dark:text-white">
                          {bgFile ? bgFile.name : 'Click to Browse or Drag & Drop your .txt / .csv File'}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {bgFile ? `${(bgFile.size / 1024).toFixed(1)} KB uploaded` : 'One link per line or raw CSV/text block'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detected File Breakdown Card */}
                  {bgFileStats && (
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-neutral-900 dark:text-white">
                        <span>File Scan Results:</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {bgFileStats.validUrls.toLocaleString()} valid group links found
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {Object.entries(bgFileStats.platformCounts).map(([plat, count]) => (
                          <span key={plat} className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200">
                            {plat.toUpperCase()}: <strong>{count.toLocaleString()}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* QUICK PASTE TEXTAREA */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Paste Group Links (One per line or text block containing URLs):
                    </label>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      detectedBulkUrls.length > 0 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                        : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
                    }`}>
                      {detectedBulkUrls.length > 0 ? `Detected ${detectedBulkUrls.length} valid links` : 'No links detected yet'}
                    </span>
                  </div>

                  <textarea
                    rows={6}
                    value={bulkInputText}
                    onChange={(e) => setBulkInputText(e.target.value)}
                    disabled={bulkIsProcessing || bgIsStarting}
                    placeholder={`Paste your group links here. For example:\nhttps://chat.whatsapp.com/ABC123xyz\nhttps://t.me/my_tech_community\nhttps://discord.gg/devhub\nhttps://facebook.com/groups/startupsconnect`}
                    className="w-full p-4 text-xs font-mono bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              )}

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center justify-between">
                    <span>Assign Category:</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                      {bulkCategory === 'auto' ? '✨ AI Auto-Detect' : '📌 Fixed Category'}
                    </span>
                  </label>
                  <select
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value as Category | 'auto')}
                    disabled={bulkIsProcessing || bgIsStarting}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="auto">✨ Auto-Detect (AI Smart Classification)</option>
                    <optgroup label="Or Force Fixed Category for All:">
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Language:
                  </label>
                  <select
                    value={bulkLanguage}
                    onChange={(e) => setBulkLanguage(e.target.value)}
                    disabled={bulkIsProcessing || bgIsStarting}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-white font-semibold focus:outline-none"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Region:
                  </label>
                  <select
                    value={bulkRegion}
                    onChange={(e) => setBulkRegion(e.target.value)}
                    disabled={bulkIsProcessing || bgIsStarting}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-white font-semibold focus:outline-none"
                  >
                    {REGIONS.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Advanced Concurrency & Auto-Scrape Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-950 dark:text-indigo-200 select-none">
                    <input
                      type="checkbox"
                      checked={bulkAutoScrape}
                      onChange={(e) => setBulkAutoScrape(e.target.checked)}
                      disabled={bulkIsProcessing || bgIsStarting}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Auto-Scrape Titles, Avatars & Meta via AI</span>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Concurrency Speed:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setBgConcurrency(2); setBgDelayMs(500); }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        bgConcurrency === 2 ? 'bg-indigo-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      Safe (2)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBgConcurrency(4); setBgDelayMs(250); }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        bgConcurrency === 4 ? 'bg-indigo-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      Balanced (4)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBgConcurrency(8); setBgDelayMs(100); }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        bgConcurrency === 8 ? 'bg-indigo-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      Turbo (8)
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBulkInputText('');
                    setBgFile(null);
                    setBgFileContent('');
                    setBgFileStats(null);
                    setBulkResults([]);
                    setBulkSummary(null);
                  }}
                  disabled={bulkIsProcessing || bgIsStarting || (!bulkInputText && !bgFile)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                >
                  Clear Form
                </button>

                {bgImportMode === 'fileUpload' ? (
                  <button
                    type="button"
                    onClick={handleStartBackgroundImport}
                    disabled={bgIsStarting || !bgFileStats || bgFileStats.validUrls === 0 || bgJob?.status === 'running'}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {bgIsStarting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Starting Cloud Background Queue...</span>
                      </>
                    ) : (
                      <>
                        <Server className="w-4 h-4" />
                        <span>🚀 Launch Offline Background Scraper ({bgFileStats?.validUrls.toLocaleString() || 0} Links)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleStartBackgroundImport}
                      disabled={bgIsStarting || detectedBulkUrls.length === 0 || bgJob?.status === 'running'}
                      className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-extrabold shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Server className="w-4 h-4" />
                      <span>Send to Background Queue</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExecuteBulkImport}
                      disabled={bulkIsProcessing || detectedBulkUrls.length === 0}
                      className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {bulkIsProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{bulkProgress.current}/{bulkProgress.total}</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4" />
                          <span>Direct Live Batch</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Direct Batch Progress & Log (if user used direct batch mode) */}
            {bulkIsProcessing && (
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-800 space-y-3 shadow-md">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-900 dark:text-white">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span>Direct Batch Importing...</span>
                  </span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {Math.round((bulkProgress.current / (bulkProgress.total || 1)) * 100)}% ({bulkProgress.current}/{bulkProgress.total})
                  </span>
                </div>
                
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(bulkProgress.current / (bulkProgress.total || 1)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Summary Banner for Direct Batch */}
            {bulkSummary && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs font-bold text-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Direct Batch Complete! Published <strong>{bulkSummary.success}</strong> of <strong>{bulkSummary.total}</strong> links.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('groups')}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  View Directory ({groups.length})
                </button>
              </div>
            )}

          </div>
        )}

        {/* Tab: DMCA Reviews & Copyright Takedowns */}
        {activeTab === 'dmcaReviews' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-amber-500" />
                <span>DMCA Takedown & Copyright Review Queue</span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                When a DMCA notice is submitted, the infringing image is instantly unlinked and replaced with the category fallback icon. Review claims below: approve to retain the category icon permanently, or reject to restore the original image.
              </p>
            </div>

            {groups.filter(g => g.dmcaStatus === 'pending_review').length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <ShieldAlert className="w-12 h-12 text-neutral-400 mx-auto" />
                <div className="font-bold text-neutral-700 dark:text-neutral-300">No Pending DMCA Claims</div>
                <div className="text-xs text-neutral-500">All copyright notices have been reviewed and resolved.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {groups.filter(g => g.dmcaStatus === 'pending_review').map(group => (
                  <div key={group.id} className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-amber-500/30 shadow-lg space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-1">
                          ⚠️ Pending DMCA Review
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{group.title}</h3>
                        <a href={group.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline truncate block">
                          {group.url}
                        </a>
                      </div>
                      <div className="text-xs text-neutral-500 font-mono">
                        Claimed: {group.dmcaClaimantAt ? new Date(group.dmcaClaimantAt).toLocaleString() : 'Recently'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-2">
                        <div className="font-bold text-neutral-700 dark:text-neutral-300">Claimant Information</div>
                        <div><strong>Name:</strong> {group.dmcaClaimantName || 'Anonymous'}</div>
                        <div><strong>Email:</strong> {group.dmcaClaimantEmail || 'Not provided'}</div>
                        <div><strong>Reason / Notice Details:</strong></div>
                        <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap italic bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 max-h-32 overflow-y-auto">
                          {group.dmcaReason || 'No detailed description provided.'}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-neutral-700 dark:text-neutral-300 mb-2">Image Takedown Status</div>
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="text-[10px] text-neutral-500 mb-1">Original Infringing Image</div>
                              {group.originalImageUrl ? (
                                <img src={group.originalImageUrl} alt="Original" className="w-16 h-16 rounded-xl object-cover border border-neutral-300 dark:border-neutral-700" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-xs text-neutral-400">Not stored</span>
                              )}
                            </div>
                            <div>
                              <div className="text-[10px] text-neutral-500 mb-1">Current Fallback Icon</div>
                              <img src={group.imageUrl} alt="Fallback" className="w-16 h-16 rounded-xl object-cover border border-neutral-300 dark:border-neutral-700" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                          <button
                            type="button"
                            onClick={() => handleDmcaReview(group.id, 'approve')}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                          >
                            ✓ Approve Takedown (Keep Fallback)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDmcaReview(group.id, 'reject')}
                            className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
                          >
                            ✕ Reject Notice (Restore Original)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Health & Night-Time Automation Dashboard */}
        {activeTab === 'healthAutomation' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
            <AdminHealthReport
              adminAuthHeaders={getAdminAuthHeaders()}
              onEditGroup={(g) => setEditingGroup(g)}
              groupsList={groups}
            />
          </div>
        )}

        {/* Modal: Sticky Promotion Duration Picker */}
        {promotingGroup && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pin className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                    Promote & Make Sticky on Top
                  </h3>
                </div>
                <button
                  onClick={() => setPromotingGroup(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Pinned group: <strong className="text-neutral-900 dark:text-white">{promotingGroup.title}</strong>. This group will stay locked at the top of directory listings with an active countdown timer.
              </p>

              <form onSubmit={handleApplyStickyPromotion} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                    Select Promotion Duration
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '1 Hour', hours: 1 },
                      { label: '6 Hours', hours: 6 },
                      { label: '12 Hours', hours: 12 },
                      { label: '24 Hours', hours: 24 },
                      { label: '3 Days', hours: 72 },
                      { label: '7 Days', hours: 168 },
                    ].map((dur) => (
                      <button
                        key={dur.hours}
                        type="button"
                        onClick={() => setStickyDurationHours(dur.hours)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                          stickyDurationHours === dur.hours
                            ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-xs'
                            : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {dur.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Sticky Sort Order Rank (1 = Topmost)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={stickyOrderVal}
                    onChange={(e) => setStickyOrderVal(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPromotingGroup(null)}
                    className="w-1/3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Flame className="w-4 h-4 fill-neutral-950" />
                    <span>Apply Sticky Pin</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2-Step Verification Modal: Remove Sticky */}
        {unstickingGroup && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                      2-Step Verification Required
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Confirm Removal of Sticky / Promoted Status
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUnstickingGroup(null);
                    setUnstickConfirmTitle('');
                    setUnstickError(null);
                  }}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Warning Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Unpinning Active Promoted Group</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Removing sticky status will unpin this community from top positions across all feeds instantly.
                </p>
              </div>

              {/* Copyable Target Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Copy Target Group Title:
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <span className="flex-1 font-mono font-bold text-xs text-neutral-900 dark:text-white truncate select-all">
                    {unstickingGroup.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(unstickingGroup.title);
                      setCopiedUnstickTitle(true);
                      setTimeout(() => setCopiedUnstickTitle(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1 transition-colors border border-neutral-200 dark:border-neutral-600 cursor-pointer"
                  >
                    {copiedUnstickTitle ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Verification Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                  Paste or Type Title to Confirm:
                </label>
                <input
                  type="text"
                  value={unstickConfirmTitle}
                  onChange={(e) => {
                    setUnstickConfirmTitle(e.target.value);
                    setUnstickError(null);
                  }}
                  placeholder="Paste exact group title here..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
                {unstickError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    {unstickError}
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUnstickingGroup(null);
                    setUnstickConfirmTitle('');
                    setUnstickError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={unstickConfirmTitle.trim() !== unstickingGroup.title.trim()}
                  onClick={() => {
                    if (unstickConfirmTitle.trim() !== unstickingGroup.title.trim()) {
                      setUnstickError('Group title does not match. Please copy and paste the exact title.');
                      return;
                    }
                    handleRemoveSticky(unstickingGroup);
                    setUnstickingGroup(null);
                    setUnstickConfirmTitle('');
                    setUnstickError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Confirm & Remove Sticky</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit or Add Group */}
        {(editingGroup || isAddingGroup) && (
          <EditGroupDialog
            group={editingGroup}
            isNew={isAddingGroup}
            onClose={() => {
              setEditingGroup(null);
              setIsAddingGroup(false);
            }}
            onDelete={(idToDelete) => {
              triggerDeleteGroup(idToDelete);
              setEditingGroup(null);
              setIsAddingGroup(false);
            }}
            onSave={(savedGroup) => {
              if (isAddingGroup) {
                triggerAddGroup(savedGroup);
              } else {
                triggerUpdateGroup(savedGroup);
              }
              setEditingGroup(null);
              setIsAddingGroup(false);
            }}
          />
        )}

        {/* Modal: Edit or Add Ad */}
        {(editingAd || isCreatingAd) && editingAd && (
          <EditAdDialog
            ad={editingAd}
            onClose={() => {
              setEditingAd(null);
              setIsCreatingAd(false);
            }}
            onSave={handleSaveAd}
          />
        )}

        {/* Modal: Mass Delete Confirmation Dialog */}
        <MassDeleteConfirmationModal
          isOpen={isMassDeleteConfirmModalOpen}
          onClose={() => {
            if (!isDeletingBulk) setIsMassDeleteConfirmModalOpen(false);
          }}
          groupsToDelete={adminGroups.filter(g => selectedGroupIds.includes(g.id))}
          onRemoveFromSelection={(idToRemove) => {
            setSelectedGroupIds(prev => prev.filter(id => id !== idToRemove));
          }}
          onConfirmDelete={handleConfirmMassDelete}
          isDeleting={isDeletingBulk}
          progress={massDeleteModalProgress}
        />

        {/* Modal: Reset Engagement Metrics (Upvotes, Joins & Shares to Zero) */}
        {showResetMetricsModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                      Reset Community Metrics
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Clear Upvotes, Joins & Shares to Zero
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetMetricsModal(false)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Warning Notice */}
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Permanent Metric Reset Action</span>
                </div>
                <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                  This action will permanently set all selected engagement counters to <strong>0</strong> across all groups in MySQL and cache memory. Group titles, URLs, tags, and category classifications will remain 100% safe.
                </p>
              </div>

              {/* Checkbox Options */}
              <div className="space-y-2.5 bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/60">
                <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Select Metrics to Reset to Zero:
                </div>

                <label className="flex items-center gap-3 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={resetOptions.resetUpvotes}
                    onChange={(e) => setResetOptions(prev => ({ ...prev, resetUpvotes: e.target.checked }))}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>Reset All <strong>Upvotes</strong> to 0</span>
                </label>

                <label className="flex items-center gap-3 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={resetOptions.resetJoins}
                    onChange={(e) => setResetOptions(prev => ({ ...prev, resetJoins: e.target.checked }))}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>Reset All <strong>Joins / Clicks / Views</strong> to 0</span>
                </label>

                <label className="flex items-center gap-3 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={resetOptions.resetShares}
                    onChange={(e) => setResetOptions(prev => ({ ...prev, resetShares: e.target.checked }))}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>Reset All <strong>Shares</strong> to 0</span>
                </label>
              </div>

              {resetMetricsError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-200">
                  {resetMetricsError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowResetMetricsModal(false)}
                  disabled={isResettingMetrics}
                  className="w-1/3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteResetMetrics}
                  disabled={isResettingMetrics || (!resetOptions.resetUpvotes && !resetOptions.resetJoins && !resetOptions.resetShares)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isResettingMetrics ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Resetting All to 0...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Confirm & Reset All to 0</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Sub-component: Edit Group Dialog
interface EditGroupDialogProps {
  group: Group | null;
  isNew: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onSave: (group: Group) => void;
}

const EditGroupDialog: React.FC<EditGroupDialogProps> = ({
  group,
  isNew,
  onClose,
  onDelete,
  onSave,
}) => {
  const [title, setTitle] = useState(group?.title || '');
  const [url, setUrl] = useState(group?.url || '');
  const [description, setDescription] = useState(group?.description || '');
  const [platform, setPlatform] = useState<Platform>(group?.platform || 'whatsapp');
  const [category, setCategory] = useState<Category>(group?.category || 'Tech & Programming');
  const [tagsInput, setTagsInput] = useState(group?.customTags ? group.customTags.join(', ') : '');
  const [memberCount, setMemberCount] = useState(group?.memberCount || 100);
  const [authorName, setAuthorName] = useState(group?.authorName || '');
  const [publishedAt, setPublishedAt] = useState(group?.publishedAt ? group.publishedAt.substring(0, 10) : new Date().toISOString().substring(0, 10));
  const [imageUrl, setImageUrl] = useState(group?.imageUrl || '');
  const [bannerUrl, setBannerUrl] = useState(group?.bannerUrl || '');
  const [verified, setVerified] = useState(group?.verified || false);
  const [isNsfw, setIsNsfw] = useState(group?.isNsfw || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map(t => {
        const clean = t.trim();
        return clean.startsWith('#') ? clean : `#${clean}`;
      })
      .filter(t => t.length > 1);

    const rankScore = calculateRankScore(title, description, tags);
    const rankGrade = calculateRankGrade(rankScore);

    const rawUrl = url.trim();
    const detected = detectPlatformFromUrl(rawUrl);
    const finalPlatform: Platform = detected !== 'other' ? detected : platform;
    const finalUrl = ensureUrlMatchesPlatform(rawUrl, finalPlatform, group?.slug || generateSlug(title.trim()));

    const saved: Group = {
      id: group?.id || `grp-${Date.now()}`,
      title: title.trim(),
      slug: group?.slug || generateSlug(title.trim()),
      description: description.trim(),
      url: finalUrl,
      platform: finalPlatform,
      category,
      language: group?.language || 'English',
      region: group?.region || 'Global',
      customTags: tags,
      imageUrl: imageUrl.trim() || group?.imageUrl || '',
      bannerUrl: bannerUrl.trim() || group?.bannerUrl || '',
      memberCount: Number(memberCount) || 100,
      growthRate: group?.growthRate || 8.5,
      clicks: group?.clicks || 0,
      upvotes: group?.upvotes || 0,
      bookmarks: group?.bookmarks || 0,
      verified,
      featured: group?.featured || false,
      isNsfw,
      isSticky: group?.isSticky || false,
      stickyUntil: group?.stickyUntil,
      stickyOrder: group?.stickyOrder || 0,
      isPromoted: group?.isPromoted || false,
      safetyScore: isNsfw ? 20 : (group?.safetyScore || 95),
      rankScore,
      rankGrade,
      rankKeywords: tags.map(t => t.replace('#', '')),
      authorName: authorName.trim() || 'Anonymous Visitor',
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : (group?.publishedAt || group?.createdAt || new Date().toISOString()),
      createdAt: group?.createdAt || new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    onSave(saved);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
            {isNew ? 'Add New Community' : 'Edit Community Details'}
          </h3>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Invite URL</label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
              >
                {Object.keys(PLATFORM_CONFIGS).map(p => (
                  <option key={p} value={p}>{PLATFORM_CONFIGS[p as Platform]?.name || p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Custom Tags (Comma Separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="#tag1, #tag2"
              className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Member Count</label>
              <input
                type="number"
                value={memberCount}
                onChange={(e) => setMemberCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Image URL or Upload
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... or upload"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="px-2.5 py-2 text-xs font-bold rounded-xl bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 hover:bg-rose-200 text-rose-700 dark:text-rose-200 cursor-pointer shrink-0 transition-colors"
                  title="Remove image and use initials"
                >
                  No Image
                </button>
                <label className="px-2.5 py-2 text-xs font-bold rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 cursor-pointer shrink-0 transition-colors">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.size > 2 * 1024 * 1024) {
                          alert(`Image size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 2 MB maximum limit.`);
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (re) => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const maxDim = 800;
                            let width = img.width;
                            let height = img.height;
                            if (width > maxDim || height > maxDim) {
                              if (width > height) {
                                height = Math.round((height * maxDim) / width);
                                width = maxDim;
                              } else {
                                width = Math.round((width * maxDim) / height);
                                height = maxDim;
                              }
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.drawImage(img, 0, 0, width, height);
                              setImageUrl(canvas.toDataURL('image/jpeg', 0.85));
                            } else {
                              setImageUrl(re.target?.result as string);
                            }
                          };
                          img.src = re.target?.result as string;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Banner URL
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setBannerUrl('')}
                  className="px-2.5 py-2 text-xs font-bold rounded-xl bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 hover:bg-rose-200 text-rose-700 dark:text-rose-200 cursor-pointer shrink-0 transition-colors"
                  title="Remove banner"
                >
                  No Banner
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Author / Submitter Name (Optional)</label>
              <input
                type="text"
                placeholder="Anonymous Visitor"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Date Published</label>
              <input
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Verified Community</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isNsfw}
                onChange={(e) => setIsNsfw(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <span>18+ Adult Content</span>
            </label>
          </div>

          <div className="pt-3 flex items-center justify-between gap-2">
            {!isNew && group && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(group.id || group.slug || group.url);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Save Group
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-component: Edit Ad Dialog
interface EditAdDialogProps {
  ad: AdPlacement;
  onClose: () => void;
  onSave: (ad: AdPlacement) => void;
}

const EditAdDialog: React.FC<EditAdDialogProps> = ({
  ad,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(ad.title || '');
  const [slot, setSlot] = useState<AdSlot>(ad.slot);
  const [target, setTarget] = useState<AdTargeting>(ad.target);
  const [format, setFormat] = useState<AdFormat>(ad.format);
  const [sponsorName, setSponsorName] = useState(ad.sponsorName || '');
  const [bannerText, setBannerText] = useState(ad.bannerText || '');
  const [imageUrl, setImageUrl] = useState(ad.imageUrl || '');
  const [targetUrl, setTargetUrl] = useState(ad.targetUrl || '');
  const [ctaText, setCtaText] = useState(ad.ctaText || 'Learn More');
  const [code, setCode] = useState(ad.code || '');
  const [isActive, setIsActive] = useState(ad.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...ad,
      title: title.trim(),
      slot,
      target,
      format,
      sponsorName: sponsorName.trim(),
      bannerText: bannerText.trim(),
      imageUrl: imageUrl.trim(),
      targetUrl: targetUrl.trim(),
      ctaText: ctaText.trim(),
      code,
      isActive
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
            Configure Ad Placement & Code
          </h3>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Ad Campaign Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Placement Slot</label>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as AdSlot)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
              >
                <option value="above_join_button">🔝 Above Join Flow (Top of rules/join page)</option>
                <option value="join_button_ad">🔘 Join button ad (Below Join Button)</option>
                <option value="header_top">Header Top Banner</option>
                <option value="feed_native">In-Feed Native Card</option>
                <option value="detail_banner">Group Detail Page Banner</option>
                <option value="rules_banner">Rules & Join Flow Banner</option>
                <option value="footer_banner">Footer Banner</option>
                <option value="sidebar">Sidebar Sticky Box</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Ad Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as AdFormat)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
              >
                <option value="banner_image">Image Banner + Link</option>
                <option value="custom_code">Custom HTML / Script Code</option>
              </select>
            </div>
          </div>

          {/* Safety & Targeting Mode */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
            <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200">
              Placement Targeting Rule
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTarget('safe_only')}
                className={`p-2 rounded-xl text-xs font-bold border transition-all text-left ${
                  target === 'safe_only'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-emerald-400'
                }`}
              >
                <div>🛡️ Safe Groups Only</div>
                <div className="text-[10px] font-normal opacity-90">Exclude 18+ & Adult pages</div>
              </button>

              <button
                type="button"
                onClick={() => setTarget('adult_only')}
                className={`p-2 rounded-xl text-xs font-bold border transition-all text-left ${
                  target === 'adult_only'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-rose-400'
                }`}
              >
                <div>🔞 Adult Groups Only</div>
                <div className="text-[10px] font-normal opacity-90">Show only on 18+ & Adult pages</div>
              </button>

              <button
                type="button"
                onClick={() => setTarget('everywhere')}
                className={`p-2 rounded-xl text-xs font-bold border transition-all text-left ${
                  target === 'everywhere' || target === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-indigo-400'
                }`}
              >
                <div>🌐 All Groups</div>
                <div className="text-[10px] font-normal opacity-90">All pages including 18+</div>
              </button>
            </div>
          </div>

          {format === 'custom_code' ? (
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Custom HTML / Script Ad Code Box
              </label>
              <textarea
                rows={5}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="<script async src='https://adnetwork.com/...'> or custom <div>..."
                className="w-full p-3 font-mono text-xs bg-neutral-900 text-emerald-400 border border-neutral-700 rounded-xl focus:outline-none"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Sponsor Brand Name</label>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="e.g. CloudScale Hosting"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g. Visit Sponsor"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Banner Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Target Click URL</label>
                <input
                  type="url"
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Banner Description / Copy</label>
                <textarea
                  rows={2}
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span>Campaign Active & Serving Live</span>
            </label>
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-extrabold shadow-sm"
            >
              Save Ad Placement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
