'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  ShieldAlert,
  Moon,
  Clock,
  Play,
  RotateCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Edit3,
  Sliders,
  Flame,
  Check,
  Zap,
  ImageOff,
} from 'lucide-react';
import { Group } from '@/src/types';
import { isExternalSocialCdn, sanitizeImageUrl } from '@/src/utils/helpers';
import { unlinkGroupImageAction } from '@/src/app/actions/rescrape';

interface HealthAuditItem {
  id: string;
  slug: string;
  title: string;
  platform: string;
  category: string;
  imageUrl?: string;
  url?: string;
  imageValid: boolean;
  imageStatusCode?: number;
  imageError?: string;
  replacedImageUrl?: string;
  imageFixed: boolean;
  linkStatus?: 'active' | 'revoked' | 'expired' | 'dead' | 'unverified';
  linkStatusCode?: number;
  linkReason?: string;
  checkedAt: string;
}

interface HealthAuditReport {
  id: string;
  runType: 'nightly' | 'interval' | 'manual';
  checkedAt: string;
  durationMs: number;
  totalChecked: number;
  validImages: number;
  brokenImages: number;
  fixedImages: number;
  activeLinks: number;
  brokenLinks: number;
  items: HealthAuditItem[];
}

interface HealthAutomationState {
  settings: {
    mode: 'nightly' | 'interval' | 'manual';
    nightHour: number;
    intervalHours: number;
    batchSize: number;
    autoFixImages: boolean;
    checkLinks: boolean;
  };
  isStarted: boolean;
  isRunning: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalRuns: number;
  latestReport: HealthAuditReport | null;
  historySummary?: Array<{
    id: string;
    checkedAt: string;
    runType: string;
    totalChecked: number;
    brokenImages: number;
    fixedImages: number;
    brokenLinks: number;
    durationMs: number;
  }>;
}

interface AdminHealthReportProps {
  adminAuthHeaders: Record<string, string>;
  onEditGroup?: (group: Group) => void;
  groupsList?: Group[];
}

export function AdminHealthReport({ adminAuthHeaders, onEditGroup, groupsList = [] }: AdminHealthReportProps) {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [runningManual, setRunningManual] = useState(false);
  const [revalidatingId, setRevalidatingId] = useState<string | null>(null);
  const [state, setState] = useState<HealthAutomationState | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'broken_images' | 'healed' | 'dead_links'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const handleUnlinkImage = async (groupIdOrSlug: string) => {
    if (!confirm('Are you sure you want to remove/unlink this custom image (e.g. if flagged as adult content) and revert to the default category SVG fallback avatar?')) {
      return;
    }
    try {
      setUnlinkingId(groupIdOrSlug);
      const res = await unlinkGroupImageAction(groupIdOrSlug, typeof window !== 'undefined' ? localStorage.getItem('admin_token') || 'kiran8728' : 'kiran8728');
      if (res.success) {
        showToast('Image successfully unlinked and reverted to fallback avatar.');
        fetchStatus();
      } else {
        showToast(res.error || 'Failed to unlink image', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error unlinking image', 'error');
    } finally {
      setUnlinkingId(null);
    }
  };

  // Form settings state
  const [mode, setMode] = useState<'nightly' | 'interval' | 'manual'>('nightly');
  const [nightHour, setNightHour] = useState(2);
  const [intervalHours, setIntervalHours] = useState(24);
  const [batchSize, setBatchSize] = useState(50);
  const [autoFixImages, setAutoFixImages] = useState(true);
  const [checkLinks, setCheckLinks] = useState(true);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/health-automation', {
        headers: adminAuthHeaders,
      });
      const data = await res.json();
      if (data.success && data.data) {
        setState(data.data);
        setMode(data.data.settings.mode);
        setNightHour(data.data.settings.nightHour);
        setIntervalHours(data.data.settings.intervalHours);
        setBatchSize(data.data.settings.batchSize);
        setAutoFixImages(data.data.settings.autoFixImages);
        setCheckLinks(data.data.settings.checkLinks);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to fetch automation state', 'error');
    } finally {
      setLoading(false);
    }
  }, [adminAuthHeaders]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const res = await fetch('/api/admin/health-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          action: 'update_settings',
          mode,
          nightHour: Number(nightHour),
          intervalHours: Number(intervalHours),
          batchSize: Number(batchSize),
          autoFixImages,
          checkLinks,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setState(data.data);
        showToast('Automation schedule and options saved successfully!');
      } else {
        throw new Error(data.error || 'Failed to update settings');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRunManualAudit = async () => {
    try {
      setRunningManual(true);
      const res = await fetch('/api/admin/health-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          action: 'run_now',
          batchSize: Number(batchSize),
          autoFix: autoFixImages,
          checkLinks,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setState(data.data);
        showToast(`Audit completed! Checked ${data.report?.totalChecked || 0} groups.`);
      } else {
        throw new Error(data.error || 'Failed to run manual audit');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to execute manual audit', 'error');
    } finally {
      setRunningManual(false);
    }
  };

  const handleRevalidateGroup = async (groupId: string) => {
    try {
      setRevalidatingId(groupId);
      const res = await fetch('/api/admin/health-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          action: 'revalidate_group',
          groupId,
          autoFix: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        showToast(`Re-validated "${data.item.title || groupId}" successfully!`);
        // Update local report list
        if (state?.latestReport) {
          const updatedItems = state.latestReport.items.map((it) =>
            it.id === groupId || it.slug === groupId ? data.item : it
          );
          setState({
            ...state,
            latestReport: {
              ...state.latestReport,
              items: updatedItems,
            },
          });
        }
      } else {
        throw new Error(data.error || 'Revalidation failed');
      }
    } catch (err: any) {
      showToast(err?.message || 'Re-validation failed', 'error');
    } finally {
      setRevalidatingId(null);
    }
  };

  const report = state?.latestReport;
  const items = report?.items || [];

  const filteredItems = items.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (item.title || '').toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q) || (item.platform || '').toLowerCase().includes(q);
      if (!matchText) return false;
    }

    if (filterTab === 'broken_images') {
      return !item.imageValid && !item.imageFixed;
    }
    if (filterTab === 'healed') {
      return item.imageFixed;
    }
    if (filterTab === 'dead_links') {
      return item.linkStatus === 'expired' || item.linkStatus === 'revoked' || item.linkStatus === 'dead';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner: Automation Schedule & Execution Controller */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Schedule Configuration */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>Night-Time & Scheduled Health Automation</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    Auto-Heal Active
                  </span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Runs non-intrusive background image & invite link audits during off-peak night hours.
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            >
              {savingSettings ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Schedule Settings</span>
            </button>
          </div>

          {/* Schedule Options Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Option 1: Nightly */}
            <button
              type="button"
              onClick={() => setMode('nightly')}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                mode === 'nightly'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/30 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-extrabold">🌙 Night-Time Auto</span>
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Runs automatically during off-peak night hours (02:00 AM) with zero user impact.
              </p>
            </button>

            {/* Option 2: Interval */}
            <button
              type="button"
              onClick={() => setMode('interval')}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                mode === 'interval'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/30 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-xs font-extrabold">⏰ Periodic Interval</span>
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Executes recurring audits at fixed intervals (e.g. every 6h, 12h, 24h).
              </p>
            </button>

            {/* Option 3: Manual Only */}
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                mode === 'manual'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/30 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-extrabold">✋ Manual Trigger Only</span>
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Background cron disabled. Audits run only when you click &quot;Run Manual Audit&quot;.
              </p>
            </button>
          </div>

          {/* Granular Parameter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Night Hour */}
            {mode === 'nightly' && (
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Night-Time Run Hour (UTC)
                </label>
                <select
                  value={nightHour}
                  onChange={(e) => setNightHour(Number(e.target.value))}
                  className="w-full text-xs font-bold py-2 px-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>01:00 AM UTC (Off-peak)</option>
                  <option value={2}>02:00 AM UTC (Recommended)</option>
                  <option value={3}>03:00 AM UTC (Low traffic)</option>
                  <option value={4}>04:00 AM UTC (Pre-dawn)</option>
                  <option value={20}>08:00 PM UTC</option>
                  <option value={22}>10:00 PM UTC</option>
                </select>
              </div>
            )}

            {/* Interval Hours */}
            {mode === 'interval' && (
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Recurring Interval
                </label>
                <select
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(Number(e.target.value))}
                  className="w-full text-xs font-bold py-2 px-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={6}>Every 6 Hours</option>
                  <option value={12}>Every 12 Hours</option>
                  <option value={24}>Every 24 Hours</option>
                  <option value={48}>Every 48 Hours</option>
                </select>
              </div>
            )}

            {/* Batch Size */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Batch Size per Run
              </label>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full text-xs font-bold py-2 px-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={25}>25 groups / batch</option>
                <option value={50}>50 groups / batch (Default)</option>
                <option value={100}>100 groups / batch</option>
                <option value={150}>150 groups / batch</option>
              </select>
            </div>

            {/* Auto Fix Images Toggle */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoFixImages}
                  onChange={(e) => setAutoFixImages(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                  Auto-heal broken images
                </span>
              </label>
            </div>

            {/* Check Invite Links Toggle */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkLinks}
                  onChange={(e) => setCheckLinks(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                  Validate invite links
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Card 2: Live Status & On-Demand Execution */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-indigo-950 text-white border border-neutral-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-extrabold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Live Automation State
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Engine Active
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-white/10">
                <span className="text-neutral-400">Mode:</span>
                <span className="font-mono font-bold capitalize text-white">{state?.settings.mode || mode}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/10">
                <span className="text-neutral-400">Next Scheduled Run:</span>
                <span className="font-mono text-emerald-400 font-bold truncate max-w-[170px]" title={state?.nextRunAt || ''}>
                  {state?.nextRunAt ? new Date(state.nextRunAt).toLocaleString() : 'Manual Only'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/10">
                <span className="text-neutral-400">Last Execution:</span>
                <span className="font-mono text-indigo-300 truncate max-w-[170px]" title={state?.lastRunAt || ''}>
                  {state?.lastRunAt ? new Date(state.lastRunAt).toLocaleString() : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-neutral-400">Total Completed Runs:</span>
                <span className="font-mono font-bold text-white">{state?.totalRuns || 0}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleRunManualAudit}
              disabled={runningManual}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 active:scale-98 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {runningManual ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Auditing Batch ({batchSize} Groups)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>⚡ Run Manual Health Audit Now</span>
                </>
              )}
            </button>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="w-full py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status & Audit Results</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
              Groups Checked
            </span>
            <span className="text-xl font-black text-neutral-900 dark:text-white font-mono">
              {report.totalChecked}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Valid Images
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {report.validImages}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 shadow-xs">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 block mb-1 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Broken Images
            </span>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {report.brokenImages}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 shadow-xs">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Auto-Healed
            </span>
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {report.fixedImages}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Active Links
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {report.activeLinks}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 shadow-xs">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Dead/Expired Links
            </span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {report.brokenLinks}
            </span>
          </div>
        </div>
      )}

      {/* Main Table: Audited Groups & Live Re-Validation Action */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        {/* Table Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold pb-1 sm:pb-0">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
              }`}
            >
              All Checked ({items.length})
            </button>
            <button
              onClick={() => setFilterTab('broken_images')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 ${
                filterTab === 'broken_images'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Broken Images ({items.filter((i) => !i.imageValid && !i.imageFixed).length})</span>
            </button>
            <button
              onClick={() => setFilterTab('healed')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 ${
                filterTab === 'healed'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Healed ({items.filter((i) => i.imageFixed).length})</span>
            </button>
            <button
              onClick={() => setFilterTab('dead_links')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 ${
                filterTab === 'dead_links'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Dead/Expired Links ({items.filter((i) => i.linkStatus === 'expired' || i.linkStatus === 'revoked' || i.linkStatus === 'dead').length})</span>
            </button>
          </div>

          <div className="relative min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search group title or category..."
              className="w-full pl-3 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Results List / Table */}
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 dark:text-neutral-400 space-y-2">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              {items.length === 0 ? 'No health audit report available yet.' : 'No groups matching this filter.'}
            </p>
            <p className="text-xs">
              {items.length === 0
                ? 'Click "⚡ Run Manual Health Audit Now" above to initiate a comprehensive image & link check.'
                : 'Try selecting a different filter tab or clearing your search.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 font-bold border-b border-neutral-200 dark:border-neutral-700">
                  <th className="py-3 px-3">Community & Image</th>
                  <th className="py-3 px-3">Platform</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Image Health</th>
                  <th className="py-3 px-3">Invite Link Health</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredItems.map((item) => {
                  const displayImg = sanitizeImageUrl(item.replacedImageUrl || item.imageUrl);
                  const isRevalidating = revalidatingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Community & Image */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200 dark:border-neutral-700">
                            {displayImg ? (
                              <Image
                                src={displayImg}
                                alt={item.title}
                                fill
                                sizes="40px"
                                className="object-cover"
                                referrerPolicy="no-referrer"
                                unoptimized={isExternalSocialCdn(displayImg)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 font-bold text-xs">
                                404
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <div className="font-extrabold text-neutral-900 dark:text-white truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono truncate">
                              ID: {item.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Platform */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 uppercase">
                          {item.platform}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                          {item.category}
                        </span>
                      </td>

                      {/* Image Health Status */}
                      <td className="py-3 px-3">
                        {item.imageFixed ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                              <Sparkles className="w-3 h-3" /> Auto-Healed (SVG/Fallback)
                            </span>
                            {item.imageError && (
                              <div className="text-[10px] text-neutral-400 truncate max-w-[160px]" title={item.imageError}>
                                Was: {item.imageError}
                              </div>
                            )}
                          </div>
                        ) : item.imageValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> 200 OK Reachable
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <XCircle className="w-3 h-3" /> Broken ({item.imageStatusCode || '404'})
                            </span>
                            {item.imageError && (
                              <div className="text-[10px] text-rose-500 truncate max-w-[160px]" title={item.imageError}>
                                {item.imageError}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Invite Link Health */}
                      <td className="py-3 px-3">
                        {item.linkStatus === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <Check className="w-3 h-3" /> Active Invite
                          </span>
                        ) : item.linkStatus === 'expired' || item.linkStatus === 'revoked' || item.linkStatus === 'dead' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <AlertTriangle className="w-3 h-3" /> {item.linkStatus.toUpperCase()}
                            </span>
                            {item.linkReason && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 truncate max-w-[160px]" title={item.linkReason}>
                                {item.linkReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">Unchecked</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleRevalidateGroup(item.id)}
                            disabled={isRevalidating}
                            title="Re-validate image and invite link"
                            className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${isRevalidating ? 'animate-spin text-indigo-600' : ''}`} />
                          </button>

                          {onEditGroup && (
                            <button
                              onClick={() => {
                                const matching = groupsList.find((g) => g.id === item.id || g.slug === item.slug);
                                if (matching) {
                                  onEditGroup(matching);
                                }
                              }}
                              title="Edit group details & image"
                              className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleUnlinkImage(item.id)}
                            disabled={unlinkingId === item.id}
                            title="Unlink image & revert to fallback (Adult content removal)"
                            className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <ImageOff className={`w-3.5 h-3.5 ${unlinkingId === item.id ? 'animate-spin' : ''}`} />
                          </button>

                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Test invite link in new tab"
                              className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
