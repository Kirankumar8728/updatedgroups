'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  Loader2, 
  Link2Off, 
  Lightbulb, 
  ShieldAlert, 
  Info,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Group } from '../types';

export interface GroupFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: Group | null;
  initialType?: 'broken_link' | 'expired_invite' | 'inaccurate_info' | 'spam_or_abuse' | 'feature_suggestion' | 'general_feedback' | 'other';
}

const FEEDBACK_TYPES = [
  {
    id: 'broken_link',
    label: 'Broken / Invalid Link',
    icon: Link2Off,
    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    description: 'Invite link gives 404, invalid URL, or cannot be reached',
  },
  {
    id: 'expired_invite',
    label: 'Expired Invite Link',
    icon: AlertTriangle,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    description: 'Invite has expired, reached member limit, or was reset by admin',
  },
  {
    id: 'feature_suggestion',
    label: 'Feature / Suggestion',
    icon: Lightbulb,
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    description: 'Suggest improvements, new platforms, or directory features',
  },
  {
    id: 'inaccurate_info',
    label: 'Inaccurate Info / Topic',
    icon: Info,
    badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    description: 'Wrong category, misleading title, or outdated description',
  },
  {
    id: 'spam_or_abuse',
    label: 'Spam / Abusive Group',
    icon: ShieldAlert,
    badgeColor: 'text-red-400 bg-red-500/10 border-red-500/20',
    description: 'Scam, deceptive bots, illegal, or malicious content',
  },
  {
    id: 'general_feedback',
    label: 'General Feedback',
    icon: MessageSquare,
    badgeColor: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    description: 'General feedback, appreciation, or other inquiries',
  },
] as const;

const QUICK_TAGS: Record<string, string[]> = {
  broken_link: [
    'Invite link is completely invalid/dead',
    'Page shows "Group not found"',
    'Link format is corrupted',
  ],
  expired_invite: [
    'Invite link expired / revoked',
    'Group is full (reached max capacity)',
    'Requires paid entry / bot paywall',
  ],
  feature_suggestion: [
    'Add custom tags to group pages',
    'Add verified member badge',
    'Improve search filters',
  ],
  inaccurate_info: [
    'Group language is incorrect',
    'Assigned to wrong category',
    'Group description is completely wrong',
  ],
  spam_or_abuse: [
    'Scam / Crypto fraud bot',
    'Malware or phishing links shared',
    'Harassment or hate speech',
  ],
  general_feedback: [
    'Great directory experience!',
    'Suggestion for platform expansion',
  ],
};

export function GroupFeedbackModal({
  isOpen,
  onClose,
  group,
  initialType = 'broken_link',
}: GroupFeedbackModalProps) {
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedType(initialType);
      setIsSuccess(false);
      setError(null);
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const handleAddQuickTag = (tag: string) => {
    setMessage((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.includes(tag)) return trimmed;
      return `${trimmed}\n• ${tag}`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        groupId: group?.id,
        groupTitle: group?.title,
        groupUrl: group?.url,
        groupPlatform: group?.platform,
        category: group?.category,
        feedbackType: selectedType,
        message: message.trim(),
        userEmail: userEmail.trim() || undefined,
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      };

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback. Please try again.');
      }

      setIsSuccess(true);
      setMessage('');
      setUserEmail('');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                {group ? 'Report / Community Feedback' : 'Direct Admin Feedback'}
              </h3>
              <p className="text-xs text-slate-400">
                Delivered directly to the platform administration inbox
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {isSuccess ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto animate-in zoom-in-75">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-xl font-black text-white">Thank You for Your Feedback!</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Your feedback has been successfully submitted and delivered to the administrator. We review broken link reports and suggestions within 24 hours to keep our directory pristine.
                </p>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-sm shadow-lg shadow-indigo-600/25 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Group Context Card if provided */}
              {group && (
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Target Group
                    </span>
                    <p className="font-bold text-slate-200 truncate mt-0.5">
                      {group.title}
                    </p>
                    <p className="text-slate-400 text-[11px] truncate">
                      {group.platform.toUpperCase()} • {group.category}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-mono text-[11px] font-bold shrink-0 border border-indigo-500/20">
                    #{group.id.slice(0, 8)}
                  </span>
                </div>
              )}

              {/* Feedback Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Select Feedback Category <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FEEDBACK_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    const isSelected = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedType(type.id)}
                        className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-xs shadow-indigo-500/20'
                            : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg mb-2 ${type.badgeColor}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold leading-tight block">
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Suggestion Chips */}
              {QUICK_TAGS[selectedType] && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Quick details (click to add):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TAGS[selectedType].map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddQuickTag(tag)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-xs font-medium transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Message Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300 uppercase tracking-wider">
                    Message / Explanation <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-slate-500">{message.length}/1000</span>
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    selectedType === 'broken_link' || selectedType === 'expired_invite'
                      ? 'Please describe what happens when attempting to join the group (e.g., page 404, revoked link, group capacity full)...'
                      : 'Share your suggestion or detailed description for the administrator...'
                  }
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              {/* Optional User Email for Follow-up */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Your Email (Optional)</span>
                  <span className="text-[11px] text-slate-500 font-normal">For admin response &amp; updates</span>
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="w-full py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending to Administrator...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Feedback to Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
