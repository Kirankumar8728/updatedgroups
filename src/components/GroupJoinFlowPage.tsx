'use client';
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  BookOpen, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Bookmark, 
  Share2, 
  Users, 
  Globe, 
  Languages, 
  Lock,
  ChevronLeft
} from 'lucide-react';
import { Group } from '../types';
import { PLATFORM_CONFIGS, formatMemberCount, getJoinButtonLabel, isAdultGroup, getPlatformJoinButtonClasses, optimizeImageUrl } from '../utils/helpers';
import { PlatformIcon } from './PlatformIcon';
import { AdDisplay } from './AdDisplay';
import { fireConfetti } from '../utils/confetti';

interface GroupJoinFlowPageProps {
  group: Group;
  currentStep: 1 | 2;
  onStepChange: (step: 1 | 2) => void;
  onBackToGroup: () => void;
  onConfirmJoin: (group: Group) => void;
  isBookmarked: boolean;
  onToggleBookmark: (group: Group) => void;
}

export const GroupJoinFlowPage: React.FC<GroupJoinFlowPageProps> = ({
  group,
  currentStep,
  onStepChange,
  onBackToGroup,
  onConfirmJoin,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const platformConfig = PLATFORM_CONFIGS[group.platform] || PLATFORM_CONFIGS.other;
  const isAdult = isAdultGroup(group);

  const handleCopy = () => {
    navigator.clipboard.writeText(group.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleFinalJoin = () => {
    fireConfetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6']
    });

    onConfirmJoin(group);
    window.open(group.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16">
      
      {/* Above Join Flow Ad Placement */}
      <AdDisplay slot="above_join_button" isCurrentContextSafe={!isAdult} />

      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={currentStep === 2 ? () => onStepChange(1) : onBackToGroup}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentStep === 2 ? 'Back to Guidelines & Rules' : 'Back to Community Overview'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleBookmark(group)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isBookmarked
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Progress Stepper Bar */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          
          {/* Step 1 Tab Button */}
          <button
            type="button"
            onClick={() => onStepChange(1)}
            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
              currentStep === 1
                ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-xs'
                : 'bg-neutral-50/50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 opacity-80 hover:opacity-100'
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
              currentStep === 1 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}>
              1
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                First Page
              </div>
              <div className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                Community Guidelines & Rules
              </div>
            </div>
          </button>

          {/* Step 2 Tab Button */}
          <button
            type="button"
            onClick={() => {
              if (agreedToRules) onStepChange(2);
            }}
            disabled={!agreedToRules}
            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
              currentStep === 2
                ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-xs'
                : 'bg-neutral-50/50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 opacity-80 hover:opacity-100'
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
              currentStep === 2 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}>
              2
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Second Page
              </div>
              <div className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                Invite Link & QR Code
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1: COMMUNITY GUIDELINES & RULES (FIRST PAGE)                          */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">

          {/* Guidelines Section in the Middle */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Community Guidelines & Joining Rules</span>
            </div>

            {/* Custom Admin Rules Summary if available */}
            {group.rulesSummary && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900 dark:text-amber-300">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Admin Code of Conduct:</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed">
                  {group.rulesSummary}
                </p>
              </div>
            )}

            {/* Structured Rules Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Respect & Healthy Discussion</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed pl-7">
                  Treat all community members with courtesy. Harassment, discrimination, hate speech, or abuse results in an immediate ban.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Strict Anti-Spam Policy</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed pl-7">
                  No unsolicited promotion, self-referral links, scam schemes, or direct messaging members without prior consent.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Safety & Privacy First</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed pl-7">
                  Never share passwords, verification codes, personal financial details, or confidential personal identification.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>Adhere to Admin Decisions</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed pl-7">
                  Follow channel topic rules. Community moderators reserve the right to enforce rules and maintain order.
                </p>
              </div>

            </div>
          </div>

          {/* Ad Placement: Rules Banner (Targeted & Safe) */}
          <AdDisplay slot="rules_banner" isCurrentContextSafe={!isAdult} className="my-2" />

          {/* Agreement Checkbox (Moved below Ad) */}
          <div className="pt-2">
            <label className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToRules}
                onChange={(e) => setAgreedToRules(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                I agree to the Community Guidelines & Rules
              </span>
            </label>
          </div>

          {/* Middle/Bottom Main Action Button: "I Agree and Join" */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={() => onStepChange(2)}
              disabled={!agreedToRules}
              className={`w-full py-4 px-8 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl transition-all ${
                agreedToRules
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <span>I Agree and Join</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: ACTUAL JOINING PAGE (SECOND PAGE)                                 */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
          
          {/* Verified Gateway Access Header */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-emerald-950 dark:text-emerald-200">
                Rules Accepted • Verified Gateway Access
              </div>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                Click the button below to join directly or copy the verified invite link.
              </p>
            </div>
          </div>

          {/* Copyable Link & Info Box Section */}
          <div className="space-y-4 p-5 sm:p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/70">
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Official Direct Invite Link
              </label>
              <div className="flex items-center gap-2 p-2 pl-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-2xs">
                <input
                  type="text"
                  readOnly
                  value={group.url}
                  className="bg-transparent text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 font-mono flex-1 outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Safety assurance */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200">
                <span className="font-bold">Official Direct Redirection:</span> Link verified to direct safely to {platformConfig.name}.
              </div>
            </div>
          </div>

          {/* Big Direct Join Action Button */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={handleFinalJoin}
              className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                isAdult
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : getPlatformJoinButtonClasses(group.platform)
              }`}
            >
              <span>{getJoinButtonLabel(group.platform)}</span>
              <ExternalLink className="w-5 h-5" />
            </button>

            {/* Join button ad placement (Hidden by default in admin dashboard) */}
            <AdDisplay slot="join_button_ad" isCurrentContextSafe={!isAdult} />

            <button
              type="button"
              onClick={() => onStepChange(1)}
              className="w-full py-2.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Community Guidelines & Rules</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
