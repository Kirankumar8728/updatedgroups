'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { Tag, ArrowRight } from 'lucide-react';
import { Group } from '../types';
import { tagToSlug } from '../utils/helpers';
import { isAdultTagOrKeyword } from '../utils/keywordFilter';

interface CustomTagCloudProps {
  groups: Group[];
  selectedTag: string | null;
  onSelectTag?: (tag: string | null) => void;
  hideAdultContent?: boolean;
}

const CustomTagCloudComponent: React.FC<CustomTagCloudProps> = ({
  groups,
  selectedTag,
  onSelectTag,
  hideAdultContent = true,
}) => {
  // Aggregate tags and count frequencies with useMemo
  const sortedTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    groups.forEach(g => {
      g.customTags?.forEach(t => {
        if (hideAdultContent && isAdultTagOrKeyword(t)) return;
        const clean = t.startsWith('#') ? t : `#${t}`;
        tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16);
  }, [groups, hideAdultContent]);

  if (sortedTags.length === 0) return null;

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-3 sm:p-4 border border-neutral-200/60 dark:border-neutral-800/60 mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
          <Tag className="w-3.5 h-3.5 text-indigo-500" />
          <span>Trending Custom Community Tags</span>
        </div>
        <div className="flex items-center gap-3">
          {selectedTag && onSelectTag && (
            <button
              onClick={() => onSelectTag(null)}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Clear filter
            </button>
          )}
          <Link
            href="/tags"
            prefetch={false}
            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-1"
          >
            <span>All Tags</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {sortedTags.map(([tag, count]) => {
          const cleanTagSlug = tagToSlug(tag) || tag.replace(/^#+/, '').toLowerCase();
          const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();

          return (
            <Link
              key={tag}
              href={`/tag/${cleanTagSlug}`}
              prefetch={false}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm scale-105'
                  : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-300'
              }`}
            >
              <span>{tag}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                isSelected ? 'bg-indigo-700 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
              }`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export const CustomTagCloud = React.memo(CustomTagCloudComponent);


