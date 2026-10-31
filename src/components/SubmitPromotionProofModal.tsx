'use client';
import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Coins, 
  Copy, 
  Check, 
  Send, 
  AlertCircle, 
  Loader2, 
  Share2, 
  CheckCircle2, 
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { UserTrackingLink } from '../types/user';
import { getStoredSessionToken } from '../utils/userAuth';
import { fireConfetti } from '../utils/confetti';

interface SubmitPromotionProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingLink?: UserTrackingLink | null;
  onSuccess?: () => void;
  onRequireAuth?: () => void;
}

export const SubmitPromotionProofModal: React.FC<SubmitPromotionProofModalProps> = ({
  isOpen,
  onClose,
  trackingLink,
  onSuccess,
  onRequireAuth
}) => {
  const [platform, setPlatform] = useState<'telegram' | 'discord' | 'whatsapp' | 'facebook' | 'reddit' | 'website' | 'other'>('telegram');
  const [channelOrGroupUrl, setChannelOrGroupUrl] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const trackingUrl = trackingLink?.url || 'https://grouplinks.app/go/your-code';

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(trackingUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getStoredSessionToken();
    if (!token) {
      if (onRequireAuth) {
        onClose();
        onRequireAuth();
      } else {
        setError('Please sign in to submit promotion proof.');
      }
      return;
    }

    if (!channelOrGroupUrl.trim()) {
      setError('Please provide your channel, group, or post link.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/user/promotions/claim-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform,
          channelOrGroupUrl: channelOrGroupUrl.trim(),
          proofUrl: proofUrl.trim() || undefined,
          notes: notes.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        try {
          fireConfetti({ particleCount: 50, spread: 70 });
        } catch {}
        setSuccessMsg(data.message || 'Proof submitted successfully! +50 Credits will be credited once verified.');
        if (onSuccess) onSuccess();
      } else {
        setError(data.error || 'Failed to submit proof.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                  Earn +50 Credits
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Per Promotion
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Share GroupLinks on your channel, group, or website
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
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-neutral-900 dark:text-white">
              Proof Submitted!
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-md mx-auto leading-relaxed">
              {successMsg}
            </p>
            <button
              onClick={onClose}
              className="w-full max-w-xs mx-auto py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Step 1: Your Tracking Link */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Your Unique Tracking Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={trackingUrl}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-mono text-neutral-900 dark:text-white select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Post this link on your Telegram channel, Discord server topic, pinned message, or social bio.
              </p>
            </div>

            {/* Step 2: Platform Selection */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Where did you promote?
              </label>
              <select
                value={platform}
                onChange={(e: any) => setPlatform(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="telegram">Telegram Channel or Group</option>
                <option value="discord">Discord Server</option>
                <option value="whatsapp">WhatsApp Group or Channel</option>
                <option value="reddit">Reddit Post / Community</option>
                <option value="facebook">Facebook Group / Page</option>
                <option value="website">Personal Website / Blog</option>
                <option value="other">Other Platform</option>
              </select>
            </div>

            {/* Step 3: Channel / Post URL */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Your Channel, Group, or Post URL
              </label>
              <input
                type="url"
                required
                value={channelOrGroupUrl}
                onChange={(e) => setChannelOrGroupUrl(e.target.value)}
                placeholder="https://t.me/yourchannel or post link"
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Step 4: Optional Proof Link or Notes */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Direct Message Link / Screenshot Proof (Optional)
              </label>
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://t.me/yourchannel/123 or image link"
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  <span>Submit Proof for +50 Credits</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
