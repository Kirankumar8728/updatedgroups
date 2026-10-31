'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Upload, 
  Database, 
  FileText, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Copy, 
  Check, 
  ShieldCheck, 
  Info, 
  Sparkles, 
  ArrowRight,
  Trash2,
  Send,
  Sliders
} from 'lucide-react';
import { getAdminSessionToken } from '../utils/adminAuth';
import { getStoredSessionToken } from '../utils/userAuth';

export interface PushSubscriberBackupUtilityProps {
  onDataChanged?: () => void;
  className?: string;
}

export const PushSubscriberBackupUtility: React.FC<PushSubscriberBackupUtilityProps> = ({
  onDataChanged,
  className = ''
}) => {
  // Stats
  const [stats, setStats] = useState<{ total: number; activeThisWeek: number } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [lastExportTime, setLastExportTime] = useState<string | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<{ success: boolean; msg: string } | null>(null);

  // Import State
  const [importText, setImportText] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [parsedPreview, setParsedPreview] = useState<{
    total: number;
    valid: number;
    invalid: number;
    sample: any[];
  } | null>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load subscriber metrics
  const fetchSubscriberStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/admin/notifications/stats', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setStats({ total: data.total, activeThisWeek: data.activeThisWeek });
      }
    } catch (err) {
      console.warn('Failed to load notification stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchSubscriberStats();
  }, []);

  // Parse and preview raw input
  const analyzeInput = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setParsedPreview(null);
      return;
    }

    try {
      // 1. Try parsing JSON
      const json = JSON.parse(trimmed);
      const list = Array.isArray(json) ? json : (Array.isArray(json?.subscribers) ? json.subscribers : []);
      let valid = 0;
      let invalid = 0;
      list.forEach((item: any) => {
        const ep = item.endpoint || item.keys?.endpoint;
        const p256 = item.p256dh || item.keys?.p256dh;
        const a = item.auth || item.keys?.auth;
        if (ep && typeof ep === 'string' && ep.startsWith('http') && p256 && a) {
          valid++;
        } else {
          invalid++;
        }
      });
      setParsedPreview({
        total: list.length,
        valid,
        invalid,
        sample: list.slice(0, 3)
      });
      return;
    } catch {
      // 2. Try parsing CSV
      const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        let valid = 0;
        let invalid = 0;
        const startIndex = lines[0].toLowerCase().includes('endpoint') ? 1 : 0;
        const sample: any[] = [];

        for (let i = startIndex; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.replace(/^"|"$/g, '').trim());
          // Expect CSV with endpoint, p256dh, auth in parts
          const hasHttp = parts.some(p => p.startsWith('http://') || p.startsWith('https://'));
          if (hasHttp && parts.length >= 3) {
            valid++;
            if (sample.length < 3) sample.push({ raw: lines[i] });
          } else {
            invalid++;
          }
        }

        setParsedPreview({
          total: lines.length - startIndex,
          valid,
          invalid,
          sample
        });
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setImportText(val);
    analyzeInput(val);
  };

  // Export handlers
  const handleExportDownload = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    setExportNotice(null);

    try {
      const res = await fetch(`/api/admin/notifications/subscribers/export?format=${format}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers_backup_${new Date().toISOString().slice(0, 10)}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      const timeStr = new Date().toLocaleTimeString();
      setLastExportTime(timeStr);
      setExportNotice({
        success: true,
        msg: `Exported ${stats?.total || 0} subscriber(s) to ${format.toUpperCase()} successfully at ${timeStr}.`
      });
    } catch (err: any) {
      setExportNotice({
        success: false,
        msg: err.message || 'Failed to download subscriber export file.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyJsonToClipboard = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin/notifications/subscribers/export?format=json', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      const formatted = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(formatted);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
      setExportNotice({
        success: true,
        msg: `Copied ${Array.isArray(data) ? data.length : 0} subscriber record(s) to clipboard.`
      });
    } catch (err: any) {
      setExportNotice({
        success: false,
        msg: 'Failed to copy JSON backup to clipboard.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Import handler
  const handleImportSubmit = async (customPayload?: string) => {
    const content = customPayload !== undefined ? customPayload : importText;
    if (!content.trim()) {
      setImportStatus({ success: false, msg: 'Please provide CSV or JSON subscriber data.' });
      return;
    }

    setIsImporting(true);
    setImportStatus(null);

    try {
      let isJson = false;
      let bodyData: any = content;

      try {
        const parsed = JSON.parse(content);
        isJson = true;
        bodyData = JSON.stringify(parsed);
      } catch {
        isJson = false;
      }

      const res = await fetch('/api/admin/notifications/subscribers/import', {
        method: 'POST',
        headers: {
          'Content-Type': isJson ? 'application/json' : 'text/csv',
          ...getAuthHeaders(),
        },
        body: bodyData,
      });

      const data = await res.json();
      if (data.success) {
        setImportStatus({
          success: true,
          msg: data.message || `Successfully imported ${data.importedCount || 0} subscriber(s).`
        });
        setImportText('');
        setParsedPreview(null);
        await fetchSubscriberStats();
        if (onDataChanged) onDataChanged();
      } else {
        setImportStatus({
          success: false,
          msg: data.error || 'Failed to import subscribers.'
        });
      }
    } catch (err: any) {
      setImportStatus({
        success: false,
        msg: err.message || 'Network error occurred while uploading subscribers.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Drag and Drop handlers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setImportText(text);
        analyzeInput(text);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Stats Overview Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Push Subscriber Backup & Migration Hub
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Admin Utility
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Export, backup, validate, and migrate web push subscriptions across staging, development, and production.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchSubscriberStats}
            disabled={isLoadingStats}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Total Subscribers
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {stats !== null ? stats.total.toLocaleString() : '...'}
            </div>
            <div className="text-[10px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 inline" />
              <span>Ready for Push Dispatch</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Active This Week
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">
              {stats !== null ? stats.activeThisWeek.toLocaleString() : '...'}
            </div>
            <div className="text-[10px] text-neutral-400 font-medium mt-0.5">
              Opted-in browser workers
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Supported Formats
            </div>
            <div className="text-base font-extrabold text-amber-300 mt-1 flex items-center gap-1.5">
              <span>JSON</span>
              <span className="text-neutral-500">•</span>
              <span>CSV</span>
            </div>
            <div className="text-[10px] text-neutral-400 font-medium mt-0.5">
              Standard W3C Push Payload
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Last Backup Export
            </div>
            <div className="text-sm font-bold text-neutral-200 mt-1 truncate">
              {lastExportTime || 'Not yet exported today'}
            </div>
            <div className="text-[10px] text-neutral-400 font-medium mt-0.5">
              Encrypted keys & endpoints
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Export (Left) & Import (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ======================= EXPORT CARD ======================= */}
        <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">
                  Export Subscribers (Backup)
                </h4>
                <p className="text-xs text-neutral-400">
                  Download all active push endpoints and encryption keys for off-site backup or server migration.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-2.5 text-xs text-neutral-300">
              <div className="flex items-center gap-2 font-bold text-neutral-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Backup Specifications:</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-neutral-400 pl-1">
                <li>Includes <code className="text-indigo-300 font-mono">endpoint</code>, <code className="text-indigo-300 font-mono">p256dh</code>, and <code className="text-indigo-300 font-mono">auth</code> keys.</li>
                <li>Fully compatible with Google FCM, Mozilla autopush, and Apple WebPush.</li>
                <li>JSON export provides exact raw objects; CSV is ideal for spreadsheet review.</li>
              </ul>
            </div>

            {exportNotice && (
              <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                exportNotice.success
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}>
                {exportNotice.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{exportNotice.msg}</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleExportDownload('json')}
                disabled={isExporting || (stats?.total === 0)}
                className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportDownload('csv')}
                disabled={isExporting || (stats?.total === 0)}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                <span>Export CSV</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyJsonToClipboard}
              disabled={isExporting || (stats?.total === 0)}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700 transition-colors cursor-pointer"
            >
              {copiedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedJson ? 'Copied to Clipboard!' : 'Copy Raw JSON Backup to Clipboard'}</span>
            </button>
          </div>
        </div>

        {/* ======================= IMPORT CARD ======================= */}
        <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">
                  Import Subscribers (Restore / Migration)
                </h4>
                <p className="text-xs text-neutral-400">
                  Upload an exported JSON/CSV file or paste subscriber data to restore subscriptions.
                </p>
              </div>
            </div>

            {/* Drag & Drop Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                dragActive 
                  ? 'border-indigo-400 bg-indigo-500/10' 
                  : 'border-neutral-700 hover:border-neutral-500 bg-neutral-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-1.5" />
              <div className="text-xs font-bold text-neutral-200">
                Drag & drop your <span className="text-indigo-400">.json</span> or <span className="text-emerald-400">.csv</span> backup here
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                or click to browse local files
              </div>
            </div>

            {/* Text area for raw paste */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-400">
                <span>Or Paste Raw Backup Payload</span>
                {importText && (
                  <button
                    type="button"
                    onClick={() => {
                      setImportText('');
                      setParsedPreview(null);
                    }}
                    className="text-neutral-500 hover:text-rose-400 text-[11px] transition-colors"
                  >
                    Clear Input
                  </button>
                )}
              </div>
              <textarea
                value={importText}
                onChange={handleTextChange}
                placeholder='Paste raw JSON array [ { "endpoint": "https://...", "p256dh": "...", "auth": "..." } ] or CSV rows...'
                rows={4}
                className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Parsed Preview Card */}
            {parsedPreview && (
              <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-300">Data Pre-Check</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-400 font-bold">✓ {parsedPreview.valid} Valid</span>
                    {parsedPreview.invalid > 0 && (
                      <span className="text-rose-400 font-bold">⚠ {parsedPreview.invalid} Skipped</span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-neutral-400 truncate">
                  Ready to merge {parsedPreview.valid} verified browser endpoint(s) into database.
                </div>
              </div>
            )}

            {/* Status Feedback Banner */}
            {importStatus && (
              <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                importStatus.success
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}>
                {importStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{importStatus.msg}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleImportSubmit()}
              disabled={isImporting || !importText.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Subscriber Import...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Execute Subscriber Import</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
