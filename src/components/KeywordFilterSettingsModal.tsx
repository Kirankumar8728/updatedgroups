'use client';
import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Filter
} from 'lucide-react';
import { 
  DEFAULT_ADULT_KEYWORDS, 
  getCustomKeywords, 
  saveCustomKeywords, 
  addCustomKeyword, 
  removeCustomKeyword, 
  resetCustomKeywords,
  analyzeGroupContent,
  isAutoFilterEnabled,
  setAutoFilterEnabled
} from '../utils/keywordFilter';

interface KeywordFilterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeywordsUpdated?: () => void;
}

export const KeywordFilterSettingsModal: React.FC<KeywordFilterSettingsModalProps> = ({
  isOpen,
  onClose,
  onKeywordsUpdated,
}) => {
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabled, setFilterEnabled] = useState(true);
  
  // Interactive Live Filter Tester
  const [testText, setTestText] = useState('Join our exclusive 18+ VIP discussion group with daily leaks');
  const [testResult, setTestResult] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomKeywords(getCustomKeywords());
      setFilterEnabled(isAutoFilterEnabled());
    }
  }, [isOpen]);

  // Run live test whenever testText or customKeywords change
  useEffect(() => {
    const res = analyzeGroupContent({
      title: testText,
      description: testText,
      customTags: testText.split(' ')
    });
    setTestResult(res);
  }, [testText, customKeywords]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newKeyword.trim()) return;

    const updated = addCustomKeyword(newKeyword.trim());
    setCustomKeywords([...updated]);
    setNewKeyword('');
    showToast(`Added "${newKeyword.trim().toLowerCase()}" to auto-filter!`);
    if (onKeywordsUpdated) onKeywordsUpdated();
  };

  const handleRemove = (kw: string) => {
    const updated = removeCustomKeyword(kw);
    setCustomKeywords([...updated]);
    showToast(`Removed "${kw}"`);
    if (onKeywordsUpdated) onKeywordsUpdated();
  };

  const handleReset = () => {
    if (window.confirm('Reset all custom keyword filters to factory defaults?')) {
      resetCustomKeywords();
      setCustomKeywords([]);
      showToast('Keyword filters reset to defaults.');
      if (onKeywordsUpdated) onKeywordsUpdated();
    }
  };

  const handleToggleFilter = () => {
    const next = !filterEnabled;
    setFilterEnabled(next);
    setAutoFilterEnabled(next);
    showToast(next ? 'Keyword Auto-Filtering Activated' : 'Auto-Filtering Paused');
    if (onKeywordsUpdated) onKeywordsUpdated();
  };

  const allActiveKeywords = Array.from(new Set([...DEFAULT_ADULT_KEYWORDS, ...customKeywords]));
  const filteredKeywords = allActiveKeywords.filter(k => 
    k.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white leading-tight">
                  Customized Keyword Auto-Filtering Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Active Guard
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Automatically scans group titles, descriptions, URLs, & tags to isolate adult content from safe categories.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Notification Toast */}
          {notification && (
            <div className="p-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>{notification}</span>
              </div>
            </div>
          )}

          {/* Quick Status Bar */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${filterEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
              <div>
                <div className="text-xs font-bold text-neutral-900 dark:text-white">
                  Multi-Factor Safety Isolation: {filterEnabled ? 'Enabled (Active)' : 'Disabled'}
                </div>
                <div className="text-[11px] text-neutral-500">
                  {allActiveKeywords.length} total monitored keywords & patterns ({customKeywords.length} custom rules)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleFilter}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterEnabled 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                }`}
              >
                {filterEnabled ? 'Guard Active' : 'Enable Guard'}
              </button>

              {customKeywords.length > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-600 hover:text-red-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Auto-Filter Interactive Sandbox / Tester */}
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                  Live Auto-Filter Testing Simulator
                </h4>
              </div>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                Real-Time Sandbox
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Type any test group title, description, or tag..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-neutral-800 border border-indigo-200 dark:border-indigo-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-2xs"
              />

              {/* Live Test Outcome */}
              <div className="p-3 rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {testResult?.isAdult ? (
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>Status:</span>
                      {testResult?.isAdult ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          NSFW / Adult Content Detected (Auto-Isolated)
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Safe & Clean (Visible across general categories)
                        </span>
                      )}
                    </div>
                    {testResult?.isAdult && testResult.matchedKeywords.length > 0 && (
                      <div className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400 flex flex-wrap items-center gap-1">
                        <span>Matched Banned Keywords:</span>
                        {testResult.matchedKeywords.map((k: string) => (
                          <span key={k} className="px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-mono font-bold text-[10px]">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    testResult?.isAdult ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {testResult?.isAdult ? 'Category: 18+' : 'Category: Safe'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Add New Custom Keyword */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Add Custom Keyword / Pattern to Filter List</span>
            </label>

            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="e.g. gambling, #nsfwleaks, illicit keyword..."
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="submit"
                disabled={!newKeyword.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Keyword</span>
              </button>
            </form>
            <p className="text-[11px] text-neutral-500">
              Any group containing this keyword in its title, description, or custom tags will automatically be isolated from general categories.
            </p>
          </div>

          {/* Keyword Search & Directory List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search active keywords..."
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>
              <span className="text-xs text-neutral-500 shrink-0 font-medium">
                {filteredKeywords.length} of {allActiveKeywords.length} keywords
              </span>
            </div>

            {/* Keyword Chips Container */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 max-h-56 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {filteredKeywords.map((kw) => {
                  const isCustom = customKeywords.includes(kw);
                  return (
                    <span
                      key={kw}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                        isCustom
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 shadow-2xs'
                      }`}
                    >
                      <span>{kw}</span>
                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => handleRemove(kw)}
                          title="Delete custom keyword"
                          className="text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 p-0.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[9px] uppercase font-bold text-neutral-400">
                          Built-in
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/40">
          <div className="text-xs text-neutral-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            <span>Rules are persisted instantly across your session.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-colors shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
