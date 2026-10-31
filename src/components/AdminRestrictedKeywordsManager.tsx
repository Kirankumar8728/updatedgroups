'use client';
import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Lock, 
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { DEFAULT_RESTRICTED_KEYWORDS } from '../utils/moderation';
import { getAdminAuthHeaders } from '../utils/adminAuth';

export const AdminRestrictedKeywordsManager: React.FC = () => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchKeywords = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/restricted-keywords', {
        headers: getAdminAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.keywords)) {
        setKeywords(data.keywords);
      } else {
        setKeywords(DEFAULT_RESTRICTED_KEYWORDS);
      }
    } catch {
      setKeywords(DEFAULT_RESTRICTED_KEYWORDS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  const handleSaveKeywords = async (updated: string[]) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/restricted-keywords', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ keywords: updated })
      });
      const data = await res.json();
      if (data.success) {
        setKeywords(data.keywords || updated);
        setNotice('Restricted keywords list updated and enforced on live server.');
        setTimeout(() => setNotice(null), 3500);
      } else {
        throw new Error(data.error || 'Failed to save keywords');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update restricted keywords.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newKeyword.trim().toLowerCase();
    if (!clean) return;

    if (keywords.map(k => k.toLowerCase()).includes(clean)) {
      setError(`"${clean}" is already in the restricted keywords list.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    const updated = [...keywords, clean];
    setNewKeyword('');
    handleSaveKeywords(updated);
  };

  const handleRemoveKeyword = (target: string) => {
    const updated = keywords.filter(k => k.toLowerCase() !== target.toLowerCase());
    handleSaveKeywords(updated);
  };

  const handleResetToDefaults = () => {
    handleSaveKeywords(DEFAULT_RESTRICTED_KEYWORDS);
  };

  const filtered = keywords.filter(k => k.toLowerCase().includes(searchFilter.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-md shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-950 dark:text-rose-100 flex items-center gap-2">
              <span>Zero-Tolerance Restricted Keywords Moderation</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100">
                {keywords.length} Active Rules
              </span>
            </h3>
            <p className="text-xs text-rose-800/90 dark:text-rose-300/90 mt-1 max-w-2xl leading-relaxed">
              Any comment, community title, description, or group invite matching these restricted terms (e.g. <strong>"child porn"</strong>, illegal exploits, etc.) is <strong>strictly blocked from posting or submission</strong> with an automatic zero-tolerance violation response.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetToDefaults}
          disabled={isSaving}
          className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add New Keyword Form */}
      <form onSubmit={handleAddKeyword} className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <ShieldAlert className="w-4 h-4 text-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Add restricted keyword or phrase (e.g. child porn, illegal material)..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
        </div>
        <button
          type="submit"
          disabled={isSaving || !newKeyword.trim()}
          className="w-full sm:w-auto px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>Block Keyword</span>
        </button>
      </form>

      {/* Search & List of Restricted Keywords */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search restricted keywords..."
              className="w-full pl-10 pr-4 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="text-xs text-neutral-500">
            Showing {filtered.length} of {keywords.length} restricted terms
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-neutral-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading safety rules...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-400">
            No keywords match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {filtered.map((kw, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-rose-300 dark:hover:border-rose-800 flex items-center justify-between gap-2 shadow-xs transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                    {kw}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(kw)}
                  title="Remove keyword from restricted list"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
