'use client';
import React from 'react';
import { X, Bookmark, ExternalLink, Trash2, Users, ArrowRight } from 'lucide-react';
import { Group } from '../types';
import { PLATFORM_CONFIGS, formatMemberCount, getJoinButtonLabel, resolveValidGroupImage, getCategoryFallbackImage } from '../utils/helpers';
import { PlatformIcon } from './PlatformIcon';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedGroups: Group[];
  onRemoveBookmark: (group: Group) => void;
  onOpenDetails: (group: Group) => void;
  onJoinClick: (group: Group) => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  savedGroups,
  onRemoveBookmark,
  onOpenDetails,
  onJoinClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Bookmark className="w-4 h-4 fill-indigo-600 dark:fill-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                Saved Communities
              </h3>
              <p className="text-xs text-neutral-500">
                {savedGroups.length} {savedGroups.length === 1 ? 'group' : 'groups'} bookmarked
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

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedGroups.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                <Bookmark className="w-8 h-8 text-neutral-400" />
              </div>
              <h4 className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                No saved groups yet
              </h4>
              <p className="text-xs text-neutral-400 max-w-xs mt-1">
                Click the bookmark icon on any community card to save it here for quick access later.
              </p>
            </div>
          ) : (
            savedGroups.map((group) => {
              const platformConfig = PLATFORM_CONFIGS[group.platform] || PLATFORM_CONFIGS.other;

              return (
                <div
                  key={group.id}
                  onClick={() => onOpenDetails(group)}
                  className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between gap-3 hover:border-indigo-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={resolveValidGroupImage(group.imageUrl, group.category, group.title, false)}
                      alt={group.title}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = getCategoryFallbackImage(group.category, false, group.title);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {group.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${platformConfig.badgeClass}`}>
                          {platformConfig.name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {formatMemberCount(group.memberCount)} members
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onJoinClick(group);
                      }}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                      aria-label={getJoinButtonLabel(group.platform)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveBookmark(group);
                      }}
                      className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      aria-label="Remove Bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {savedGroups.length > 0 && (
          <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
