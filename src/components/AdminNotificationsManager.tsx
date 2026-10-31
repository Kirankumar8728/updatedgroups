'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bell, 
  Info, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Download, 
  Upload, 
  Clock, 
  RefreshCw, 
  Sparkles, 
  Sliders, 
  FileText, 
  FileSpreadsheet, 
  Play,
  Users
} from 'lucide-react';
import { getStoredSessionToken } from '../utils/userAuth';
import { getAdminSessionToken } from '../utils/adminAuth';
import { PushSubscriberBackupUtility } from './PushSubscriberBackupUtility';

export const AdminNotificationsManager: React.FC = () => {
  // Broadcast Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('/');
  const [batchSize, setBatchSize] = useState<number>(25);
  const [delayMs, setDelayMs] = useState<number>(500);
  const [maxSubscribers, setMaxSubscribers] = useState<string>(''); // blank = all
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; msg?: string } | null>(null);

  // Stats State
  const [stats, setStats] = useState<{ total: number; activeThisWeek: number } | null>(null);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Automated Daily Notification State
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoTemplate, setAutoTemplate] = useState<'trending' | 'daily_champion' | 'new_verified' | 'custom'>('trending');
  const [autoCustomTitle, setAutoCustomTitle] = useState('');
  const [autoCustomBody, setAutoCustomBody] = useState('');
  const [autoTargetPercent, setAutoTargetPercent] = useState<number>(50);
  const [autoBatchSize, setAutoBatchSize] = useState<number>(25);
  const [autoDelayMs, setAutoDelayMs] = useState<number>(500);
  const [autoDailyHourUtc, setAutoDailyHourUtc] = useState<number>(9);
  const [autoLastRunDate, setAutoLastRunDate] = useState<string | null>(null);
  const [autoLastRunCount, setAutoLastRunCount] = useState<number | null>(null);
  const [isSavingAuto, setIsSavingAuto] = useState(false);
  const [isTestingAuto, setIsTestingAuto] = useState(false);
  const [autoStatusMsg, setAutoStatusMsg] = useState<{ success?: boolean; msg?: string } | null>(null);

  // Helper to obtain active auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const adminToken = getAdminSessionToken();
    const userToken = getStoredSessionToken();
    const token = adminToken || userToken || '';

    const headers: Record<string, string> = {
      'x-admin-key': 'kiran8728',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-admin-token'] = token;
    }
    return headers;
  };

  // Fetch Stats & Auto Config
  const loadData = async () => {
    setIsRefreshingStats(true);

    try {
      const res = await fetch('/api/admin/notifications/stats', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setStats({ total: data.total, activeThisWeek: data.activeThisWeek });
        if (data.autoConfig) {
          setAutoEnabled(Boolean(data.autoConfig.enabled));
          setAutoTemplate(data.autoConfig.template || 'trending');
          setAutoCustomTitle(data.autoConfig.customTitle || '');
          setAutoCustomBody(data.autoConfig.customBody || '');
          setAutoTargetPercent(data.autoConfig.targetPercent || 50);
          setAutoBatchSize(data.autoConfig.batchSize || 25);
          setAutoDelayMs(data.autoConfig.delayMs || 500);
          setAutoDailyHourUtc(data.autoConfig.dailyHourUtc ?? 9);
          setAutoLastRunDate(data.autoConfig.lastRunDate || null);
          setAutoLastRunCount(data.autoConfig.lastRunCount ?? null);
        }
      }
    } catch {} finally {
      setIsRefreshingStats(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Broadcast Submission
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !message) {
      setStatus({ success: false, msg: 'Title and message are required.' });
      return;
    }

    setIsSending(true);
    setStatus(null);

    try {
      const res = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          title,
          message,
          url,
          batchSize: Number(batchSize) || 25,
          delayMs: Number(delayMs) || 500,
          maxSubscribers: maxSubscribers ? Number(maxSubscribers) : undefined
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus({ success: true, msg: data.message });
        setTitle('');
        setMessage('');
        setUrl('/');
        loadData();
      } else {
        setStatus({ success: false, msg: data.error || 'Failed to send broadcast.' });
      }
    } catch {
      setStatus({ success: false, msg: 'Network error occurred.' });
    } finally {
      setIsSending(false);
    }
  };

  // Handle Save Auto Configuration
  const handleSaveAutoConfig = async () => {
    setIsSavingAuto(true);
    setAutoStatusMsg(null);

    try {
      const res = await fetch('/api/admin/notifications/auto-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          enabled: autoEnabled,
          template: autoTemplate,
          customTitle: autoCustomTitle,
          customBody: autoCustomBody,
          targetPercent: autoTargetPercent,
          batchSize: autoBatchSize,
          delayMs: autoDelayMs,
          dailyHourUtc: autoDailyHourUtc,
        })
      });
      const data = await res.json();
      if (data.success) {
        setAutoStatusMsg({ success: true, msg: 'Automated notification settings saved.' });
      } else {
        setAutoStatusMsg({ success: false, msg: data.error || 'Failed to save settings.' });
      }
    } catch {
      setAutoStatusMsg({ success: false, msg: 'Error saving settings.' });
    } finally {
      setIsSavingAuto(false);
    }
  };

  // Trigger Immediate Auto Notification Test
  const handleTestAutoNotification = async () => {
    setIsTestingAuto(true);
    setAutoStatusMsg(null);

    try {
      const res = await fetch('/api/admin/notifications/auto-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ force: true })
      });
      const data = await res.json();
      if (data.success) {
        setAutoStatusMsg({ success: true, msg: data.message });
        loadData();
      } else {
        setAutoStatusMsg({ success: false, msg: data.message || 'Auto-trigger failed.' });
      }
    } catch {
      setAutoStatusMsg({ success: false, msg: 'Error executing test.' });
    } finally {
      setIsTestingAuto(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <span>Push Notification Center</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Web Push
              </span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Targeted batch broadcasts, programmatic auto-notifications & subscriber management.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isRefreshingStats}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStats ? 'animate-spin' : ''}`} />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-1">Total Subscribers</span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white font-mono">
              {stats !== null ? stats.total : '---'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-1">Active This Week</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {stats !== null ? stats.activeThisWeek : '---'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-1">Auto Push Status</span>
            <span className={`text-sm font-black flex items-center gap-1.5 ${autoEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500'}`}>
              <span className={`w-2 h-2 rounded-full ${autoEnabled ? 'bg-indigo-600 animate-pulse' : 'bg-neutral-400'}`} />
              {autoEnabled ? 'Daily Active' : 'Disabled'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* SECTION 1: MANUAL BROADCAST WITH BATCH CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleBroadcast} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-500" />
                <span>Broadcast Push Notification</span>
              </h4>
              <span className="text-[11px] text-neutral-400 font-mono">Instant Dispatch</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Notification Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 🔥 Trending WhatsApp Groups Added!"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Message Content *</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Join the newest verified groups before slots fill up..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Target URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/active24hours"
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Custom Number of Users & Scheduling / Batching Controls */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span>Custom Batching & Rate-Limiting</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-neutral-500 block mb-1">Users Per Batch</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value, 10) || 25))}
                    className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-neutral-400 block mt-0.5">e.g. 25 at a time</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-500 block mb-1">Delay Between (ms)</label>
                  <input
                    type="number"
                    min={0}
                    max={5000}
                    step={100}
                    value={delayMs}
                    onChange={(e) => setDelayMs(Math.max(0, parseInt(e.target.value, 10) || 500))}
                    className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-neutral-400 block mt-0.5">e.g. 500ms delay</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-500 block mb-1">Max Users Cap</label>
                  <input
                    type="number"
                    min={1}
                    value={maxSubscribers}
                    onChange={(e) => setMaxSubscribers(e.target.value)}
                    placeholder="All users"
                    className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-neutral-400 block mt-0.5">Leave blank for all</span>
                </div>
              </div>
            </div>

            {status && (
              <div className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium ${
                status.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
              }`}>
                {status.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                <span>{status.msg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending in Batches...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Send Broadcast to Subscribers</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Device Notification Preview</h4>
            
            <div className="bg-slate-950 rounded-2xl p-4 shadow-xl border border-slate-800 text-white space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-indigo-400">GroupLinks</span>
                    <span>Just now</span>
                  </div>
                  <h5 className="font-bold text-sm text-white truncate">{title || 'Trending Groups Alert'}</h5>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {message || 'Your broadcast message preview will appear here in real-time as you compose it.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Notifications only reach opted-in subscribers with active browser service workers. Batched scheduling prevents gateway throttling.
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 2: AUTOMATED DAILY PROGRAMMATIC NOTIFICATIONS */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Automated Daily Notifications (Programmatic)</span>
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Automatically dispatch push alerts to a rotated fraction of subscribers each day.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoEnabled}
              onChange={(e) => setAutoEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            <span className="ml-3 text-xs font-bold text-neutral-700 dark:text-neutral-300">
              {autoEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
              Template Type
            </label>
            <select
              value={autoTemplate}
              onChange={(e) => setAutoTemplate(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-semibold"
            >
              <option value="trending">🔥 Top Trending Communities</option>
              <option value="daily_champion">👑 24H Leaderboard Champion</option>
              <option value="new_verified">✨ New Verified Groups</option>
              <option value="custom">✏️ Custom Template</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
              Target Audience (%)
            </label>
            <select
              value={autoTargetPercent}
              onChange={(e) => setAutoTargetPercent(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-semibold"
            >
              <option value={10}>10% of subscribers (Minimal)</option>
              <option value={25}>25% of subscribers (Quarter)</option>
              <option value={50}>50% of subscribers (Half sample)</option>
              <option value={75}>75% of subscribers</option>
              <option value={100}>100% of subscribers (All)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
              Daily Batch Size
            </label>
            <input
              type="number"
              min={5}
              max={250}
              value={autoBatchSize}
              onChange={(e) => setAutoBatchSize(Math.max(5, parseInt(e.target.value, 10) || 25))}
              className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
              Daily Scheduled Time (UTC)
            </label>
            <select
              value={autoDailyHourUtc}
              onChange={(e) => setAutoDailyHourUtc(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-semibold"
            >
              {[...Array(24)].map((_, hour) => (
                <option key={hour} value={hour}>
                  {hour.toString().padStart(2, '0')}:00 UTC
                </option>
              ))}
            </select>
          </div>
        </div>

        {autoTemplate === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Custom Title</label>
              <input
                type="text"
                value={autoCustomTitle}
                onChange={(e) => setAutoCustomTitle(e.target.value)}
                placeholder="e.g. Daily VIP Group Links"
                className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Custom Message</label>
              <input
                type="text"
                value={autoCustomBody}
                onChange={(e) => setAutoCustomBody(e.target.value)}
                placeholder="e.g. Tap here to discover top communities today."
                className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs"
              />
            </div>
          </div>
        )}

        {autoStatusMsg && (
          <div className={`p-3.5 rounded-2xl flex items-center gap-2 text-xs font-medium ${
            autoStatusMsg.success 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' 
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}>
            {autoStatusMsg.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{autoStatusMsg.msg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div className="text-xs text-neutral-500">
            {autoLastRunDate ? (
              <span>Last automatic run: <strong className="text-neutral-800 dark:text-neutral-200">{autoLastRunDate}</strong> ({autoLastRunCount ?? 0} sent)</span>
            ) : (
              <span>No automated dispatches logged yet today.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAutoConfig}
              disabled={isSavingAuto}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingAuto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Save Schedule Settings</span>
            </button>

            <button
              type="button"
              onClick={handleTestAutoNotification}
              disabled={isTestingAuto}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isTestingAuto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Test Auto Push Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: IMPORT & EXPORT SUBSCRIBERS BACKUP UTILITY */}
      <PushSubscriberBackupUtility onDataChanged={loadData} />

    </div>
  );
};
