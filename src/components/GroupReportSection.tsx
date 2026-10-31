'use client';
import React, { useState } from 'react';
import { 
  Flag, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  Loader2, 
  X, 
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { Group } from '../types';

export const REPORT_OPTIONS = [
  { value: 'dmca_copyright', label: 'DMCA / Copyright Infringement', description: 'Infringing image, copyrighted asset, or unauthorized brand listing' },
  { value: 'fake/spam/fraud', label: 'fake/spam/fraud', description: 'Scam, deceptive invites, fraud, or spam bot' },
  { value: 'inappropriate', label: 'inappropriate', description: 'Explicit, unsafe, or non-compliant content' },
  { value: 'Link Now working', label: 'Link Now working', description: 'Invite link is expired, revoked, or broken' },
  { value: 'Group/server full', label: 'Group/server full', description: 'Community has reached maximum member capacity' },
  { value: 'Group in Wrong Category', label: 'Group in Wrong Category', description: 'Group does not match its assigned topic or category' },
  { value: 'religious hateful', label: 'religious hateful', description: 'Hate speech, religious harassment, or intolerance' },
  { value: 'other', label: 'other', description: 'Any other issue not covered by the categories above' },
] as const;

interface GroupReportSectionProps {
  group: Group;
  className?: string;
}

export const GroupReportSection: React.FC<GroupReportSectionProps> = ({ group, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedReason) {
      setError('Please select a reason from the dropdown.');
      return;
    }

    if (selectedReason === 'other' && !customMessage.trim()) {
      setError('Please provide a brief custom message explaining the issue for "other".');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/groups/${group.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: selectedReason,
          customMessage: customMessage.trim(),
          message: customMessage.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit report. Please try again.');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setSelectedReason('');
    setCustomMessage('');
    setError(null);
    setIsOpen(false);
  };

  return (
    <div 
      id="group-report-section"
      className={`rounded-2xl transition-all ${className}`}
    >
      {/* If submitted successfully */}
      {isSubmitted ? (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                Report Submitted Successfully
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300/80 leading-relaxed">
                Thank you for reporting this community. Our safety and moderation team will review &quot;{group.title}&quot; regarding &quot;<span className="font-semibold">{selectedReason}</span>&quot; within a week.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  id="dismiss-report-success-button"
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : !isOpen ? (
        /* Collapsed Bar: Clean prompt with "Report" button */
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 shrink-0 border border-rose-100 dark:border-rose-900/40">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">
                Notice an issue with this group?
              </h4>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                Report broken links, fake groups, inappropriate content, or spam to keep our directory safe.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="open-report-button"
            onClick={handleOpen}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        </div>
      ) : (
        /* Expanded Form: Dropdown + Custom message */
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-rose-200/80 dark:border-rose-900/50 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 shrink-0 border border-rose-200/50 dark:border-rose-900/40">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>Report Group:</span>
                  <span className="text-rose-600 dark:text-rose-400 truncate max-w-[200px] sm:max-w-[320px]">{group.title}</span>
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Select an issue category and add a custom message for our moderators.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="close-report-button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close report form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason Dropdown */}
            <div className="space-y-1.5">
              <label 
                htmlFor="report-reason-select"
                className="block text-xs font-bold text-neutral-700 dark:text-neutral-300"
              >
                Select Report Reason <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="report-reason-select"
                  value={selectedReason}
                  onChange={(e) => {
                    setSelectedReason(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 pr-10 cursor-pointer"
                >
                  <option value="">-- Choose a reason --</option>
                  {REPORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.description})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              {selectedReason && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 pl-1">
                  Selected: <span className="font-semibold text-rose-600 dark:text-rose-400">{selectedReason}</span>
                </p>
              )}
            </div>

            {/* Custom Message Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="report-custom-message"
                className="block text-xs font-bold text-neutral-700 dark:text-neutral-300"
              >
                Custom Message / Details {selectedReason === 'other' ? <span className="text-rose-500">*</span> : <span className="text-neutral-400 font-normal">(optional)</span>}
              </label>
              <textarea
                id="report-custom-message"
                rows={3}
                value={customMessage}
                onChange={(e) => {
                  setCustomMessage(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={
                  selectedReason === 'other'
                    ? 'Please specify what is wrong with this group or invite link...'
                    : selectedReason === 'Link Now working'
                    ? 'E.g., link says "expired", "revoked", or takes to a 404 page...'
                    : 'Provide any additional details or context for our safety team...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-y"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                id="cancel-report-button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="submit-report-button"
                disabled={isSubmitting || !selectedReason}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
