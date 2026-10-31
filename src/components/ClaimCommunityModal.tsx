'use client';
import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Copy, 
  Check, 
  Send, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  HelpCircle,
  ExternalLink,
  Search,
  Users
} from 'lucide-react';
import { Group } from '../types';
import { getStoredSessionToken } from '../utils/userAuth';
import { fireConfetti } from '../utils/confetti';
import { PlatformIcon } from './PlatformIcon';

interface ClaimCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: Group | null;
  onSuccess?: () => void;
  onRequireAuth?: () => void;
  onPromoteGroup?: (grp: any) => void;
}

export const ClaimCommunityModal: React.FC<ClaimCommunityModalProps> = ({
  isOpen,
  onClose,
  group,
  onSuccess,
  onRequireAuth,
  onPromoteGroup
}) => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Group[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [method, setMethod] = useState<'bio_code' | 'telegram_bot' | 'discord_bot' | 'public_post' | 'screenshot_proof'>('bio_code');
  const [proofUrl, setProofUrl] = useState('');
  const [proofDetails, setProofDetails] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync selectedGroup when group prop changes
  useEffect(() => {
    if (isOpen) {
      if (group) {
        setSelectedGroup(group);
      } else {
        setSelectedGroup(null);
        setSearchQuery('');
        setSearchResults([]);
      }
      setSuccessMsg(null);
      setError(null);
      setSearchError(null);
      // Generate a fresh verification code
      setVerificationCode(`GL-VERIFY-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
    }
  }, [isOpen, group]);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/groups?search=${encodeURIComponent(searchQuery)}&pageSize=10`);
      if (!res.ok) {
        throw new Error('Search failed.');
      }
      const data = await res.json();
      if (data && data.groups) {
        setSearchResults(data.groups);
        if (data.groups.length === 0) {
          setSearchError('No communities found in directory. Submit the community first to claim it!');
        }
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchError('Could not connect to the search service.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(verificationCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {}
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) {
      setError('Please select a community to claim.');
      return;
    }

    const token = getStoredSessionToken();
    if (!token) {
      if (onRequireAuth) {
        onClose();
        onRequireAuth();
      } else {
        setError('Please sign in to claim this community.');
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/user/claim-community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          communityId: selectedGroup.id,
          verificationMethod: method,
          proofUrl,
          proofDetails: `${proofDetails} (Code: ${verificationCode})`
        })
      });

      const data = await res.json();
      if (data.success) {
        try {
          fireConfetti({ particleCount: 40, spread: 60 });
        } catch {}
        setSuccessMsg('Congratulations! Your community ownership has been verified and claimed instantly! A verified owner badge is now active on your group page.');
        if (onSuccess) onSuccess();
      } else {
        setError(data.error || 'Failed to submit claim.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                Claim Community Ownership
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[280px]">
                {selectedGroup ? selectedGroup.title : 'Verify owner & activate promotions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg ? (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-sm text-emerald-800 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Claim Request Recorded!</span>
              </div>
              <p className="text-xs leading-relaxed">
                {successMsg}
              </p>
            </div>
            {onPromoteGroup && selectedGroup && (
              <button
                onClick={() => {
                  onClose();
                  onPromoteGroup(selectedGroup);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Promote & Boost This Group Now
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* SEARCH SECTION IF NO GROUP SELECTED */}
            {!selectedGroup ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Find and select your community:
                  </label>
                  <p className="text-[11px] text-neutral-500">
                    Search by group title or keywords to find the existing directory page.
                  </p>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. Active Gaming Hub"
                      className="w-full pl-9 pr-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0 disabled:opacity-50"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </form>

                {searchError && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                    {searchError}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Search Results</p>
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {searchResults.map((g) => (
                        <div key={g.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlatformIcon platform={g.platform} className="w-4 h-4" />
                            <div className="min-w-0">
                              <span className="font-bold text-neutral-900 dark:text-white block truncate">
                                {g.title}
                              </span>
                              <span className="text-[10px] text-neutral-400 block truncate">
                                {g.category} • {g.language}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedGroup(g)}
                            className="px-2.5 py-1 bg-neutral-100 hover:bg-emerald-600 hover:text-white text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 text-[10px] font-bold rounded-lg transition-colors shrink-0"
                          >
                            Select
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* CLAIM FORM SECTION FOR SELECTED GROUP */
              <form onSubmit={handleSubmitClaim} className="space-y-4">
                {/* Active Group Details */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlatformIcon platform={selectedGroup.platform} className="w-4 h-4" />
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
                        {selectedGroup.title}
                      </span>
                      <span className="text-[10px] text-neutral-400 block truncate">
                        {selectedGroup.platform.toUpperCase()} Group
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGroup(null)}
                    className="px-2 py-1 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[10px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Change Group
                  </button>
                </div>

                {/* Instant Verification Notice */}
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-2">
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Instant Ownership Verification Active</span>
                  </h4>
                  <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    You can claim this community instantly! There is no need to copy verification codes, update group bios, or submit any screenshot proofs.
                  </p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-normal">
                    Once claimed, you will instantly become the verified owner. This community will show up in your dashboard under <strong>My Submitted &amp; Claimed Communities</strong>, enabling real-time analytics and instant credit-based promotions.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4.5 h-4.5" />
                      <span>Verify &amp; Claim Instantly</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
