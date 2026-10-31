'use client';
import React from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  ShieldAlert, 
  Loader2, 
  Users, 
  CheckCircle2, 
  Layers
} from 'lucide-react';
import { Group } from '../types';
import { PlatformIcon } from './PlatformIcon';
import { PLATFORM_CONFIGS, formatMemberCount, resolveValidGroupImage, getCategoryFallbackImage } from '../utils/helpers';

interface MassDeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupsToDelete: Group[];
  onRemoveFromSelection?: (id: string) => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
  progress?: number | {
    current: number;
    total: number;
    title?: string;
    statusText?: string;
  } | null;
}

export const MassDeleteConfirmationModal: React.FC<MassDeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  groupsToDelete,
  onRemoveFromSelection,
  onConfirmDelete,
  isDeleting,
  progress,
}) => {
  if (!isOpen) return null;

  const count = groupsToDelete.length;

  // Calculate percentage and status message
  let progressPercent = 0;
  let progressTitle = 'Executing mass deletion...';
  let progressSubtitle = '';

  if (typeof progress === 'number') {
    progressPercent = Math.min(100, Math.max(0, progress));
    progressSubtitle = `${progressPercent}% completed`;
  } else if (progress && typeof progress === 'object') {
    progressPercent = Math.min(100, Math.round((progress.current / Math.max(1, progress.total)) * 100));
    progressTitle = progress.title || 'Executing mass deletion...';
    progressSubtitle = progress.statusText || `${progress.current} / ${progress.total}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Top Danger Header */}
        <div className="p-6 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border-b border-rose-100 dark:border-rose-950/60 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-inner">
            <Trash2 className="w-6 h-6 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <ShieldAlert className="w-3.5 h-3.5" />
                Permanent Admin Deletion
              </span>
              {!isDeleting && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white mt-1">
              Confirm Mass Deletion
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              You are about to permanently delete <strong className="text-rose-600 dark:text-rose-400 font-bold">{count}</strong> community {count === 1 ? 'group' : 'groups'}.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Warning Banner */}
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 text-rose-900 dark:text-rose-200">
              <p className="font-bold">This operation is permanent and irreversible.</p>
              <p className="text-rose-700/90 dark:text-rose-300/80 leading-relaxed">
                The selected items will be completely purged from the server database, search indexes, platform directories, and public feeds immediately.
              </p>
            </div>
          </div>

          {/* Progress bar if deleting */}
          {isDeleting && (
            <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 space-y-2.5 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {progressTitle}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-600 dark:bg-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
              {progressSubtitle && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                  {progressSubtitle}
                </p>
              )}
            </div>
          )}

          {/* Items Preview List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Communities to be deleted ({count})
              </span>
              <span className="text-[11px] text-neutral-400">
                Click ✕ to keep a group
              </span>
            </div>

            <div className="max-h-52 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/40">
              {groupsToDelete.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400">
                  No groups currently selected.
                </div>
              ) : (
                groupsToDelete.map((group) => {
                  const platformConfig = PLATFORM_CONFIGS[group.platform] || PLATFORM_CONFIGS.other;
                  return (
                    <div 
                      key={group.id} 
                      className="p-2.5 flex items-center justify-between gap-3 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img
                          src={resolveValidGroupImage(group.imageUrl, group.category, group.title, false)}
                          alt={group.title}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = getCategoryFallbackImage(group.category, false, group.title);
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            {group.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400">
                            <span className={`inline-flex items-center gap-1 font-semibold ${platformConfig.badgeClass}`}>
                              <PlatformIcon platform={group.platform} className="w-2.5 h-2.5" />
                              {platformConfig.name}
                            </span>
                            <span>•</span>
                            <span className="truncate">{group.category}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Users className="w-2.5 h-2.5" />
                              {formatMemberCount(group.memberCount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Remove from selection button */}
                      {!isDeleting && onRemoveFromSelection && (
                        <button
                          type="button"
                          onClick={() => onRemoveFromSelection(group.id)}
                          title="Do not delete this group"
                          className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-5 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={isDeleting || count === 0}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting {count} Communities...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Permanently Delete {count} {count === 1 ? 'Community' : 'Communities'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
