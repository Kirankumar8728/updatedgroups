import React from 'react';

interface CommunitySkeletonGridProps {
  count?: number;
  badgeText?: string;
}

export function CommunitySkeletonGrid({ count = 9, badgeText }: CommunitySkeletonGridProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Structural Header Placeholder */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/95 h-16 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 animate-pulse" />
            <div className="h-5 w-28 bg-slate-800/80 rounded-md animate-pulse" />
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="h-9 w-24 bg-slate-800/60 rounded-xl animate-pulse" />
            <div className="h-9 w-28 bg-indigo-900/30 rounded-xl animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Content Area Skeleton */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6 animate-pulse">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-slate-800/60 rounded" />
          <div className="h-3 w-3 bg-slate-800/40 rounded-full" />
          <div className="h-4 w-36 bg-slate-800/80 rounded" />
        </div>

        {/* Hero / Filter Banner Skeleton */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            {badgeText && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-1">
                {badgeText}
              </span>
            )}
            <div className="h-7 w-64 sm:w-80 bg-slate-800 rounded-lg" />
            <div className="h-4 w-full sm:w-96 bg-slate-800/60 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 bg-slate-800/80 rounded-xl" />
            <div className="h-10 w-28 bg-slate-800/80 rounded-xl" />
          </div>
        </div>

        {/* Horizontal Platform Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-hidden py-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 w-28 bg-slate-900/80 border border-slate-800/70 rounded-xl shrink-0" />
          ))}
        </div>

        {/* Community Card Grid Skeleton matching exact GroupCard layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[...Array(count)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col bg-neutral-900/90 rounded-2xl border border-neutral-800/80 overflow-hidden h-[360px] shadow-sm"
            >
              {/* Banner / Header Image Placeholder */}
              <div className="h-20 w-full bg-slate-800/70 relative" />

              {/* Body */}
              <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 shrink-0 border border-slate-700/50" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="h-4 w-3/4 bg-slate-800 rounded" />
                      <div className="h-3 w-1/3 bg-slate-800/60 rounded" />
                    </div>
                  </div>

                  {/* Description lines */}
                  <div className="space-y-2 pt-1">
                    <div className="h-3 w-full bg-slate-800/50 rounded" />
                    <div className="h-3 w-5/6 bg-slate-800/50 rounded" />
                  </div>

                  {/* Tags placeholder */}
                  <div className="flex gap-1.5 pt-1">
                    <div className="h-5 w-14 bg-slate-800/60 rounded-md" />
                    <div className="h-5 w-16 bg-slate-800/60 rounded-md" />
                    <div className="h-5 w-12 bg-slate-800/60 rounded-md" />
                  </div>
                </div>

                {/* Card Footer: metrics & join button */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-800/70">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-12 bg-slate-800/60 rounded" />
                    <div className="h-4 w-10 bg-slate-800/60 rounded" />
                  </div>
                  <div className="h-8 w-24 bg-emerald-900/40 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
