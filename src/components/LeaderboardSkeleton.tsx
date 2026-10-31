import React from 'react';

export function LeaderboardSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col antialiased">
      {/* Structural Header Placeholder */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/95 h-16 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 animate-pulse" />
            <div className="h-5 w-32 bg-neutral-800 rounded-md animate-pulse" />
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="h-9 w-28 bg-amber-900/30 rounded-xl animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Leaderboard Area Skeleton */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6 animate-pulse">
        {/* Title & Countdown Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-72 bg-neutral-800 rounded-lg" />
            <div className="h-4 w-96 max-w-full bg-neutral-800/60 rounded" />
          </div>
          <div className="h-10 w-44 bg-neutral-900 border border-neutral-800 rounded-2xl" />
        </div>

        {/* Champion Showcase Card (#1) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/90 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-5 w-full md:w-auto">
            <div className="w-20 h-20 rounded-2xl bg-neutral-800 shrink-0 border-2 border-amber-500/40" />
            <div className="space-y-2.5 flex-1">
              <div className="h-5 w-24 bg-amber-500/20 rounded-full" />
              <div className="h-6 w-56 sm:w-72 bg-neutral-800 rounded-md" />
              <div className="h-4 w-40 bg-neutral-800/60 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <div className="h-12 w-28 bg-amber-950/30 rounded-2xl" />
            <div className="h-10 w-28 bg-emerald-600/40 rounded-xl" />
          </div>
        </div>

        {/* Podium Runner-Ups (#2 and #3) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[2, 3].map((rank) => (
            <div
              key={rank}
              className="p-5 rounded-3xl border border-neutral-800 bg-neutral-900/80 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-800 shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-neutral-800 rounded" />
                  <div className="h-3 w-20 bg-neutral-800/60 rounded" />
                </div>
              </div>
              <div className="h-7 w-20 bg-amber-500/20 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Ranked Community Rows (#4 to #12) */}
        <div className="space-y-3 pt-2">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full bg-neutral-800 shrink-0" />
                <div className="w-10 h-10 rounded-xl bg-neutral-800 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-4 w-48 sm:w-64 bg-neutral-800 rounded" />
                  <div className="h-3 w-32 bg-neutral-800/60 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="h-6 w-16 bg-neutral-800 rounded" />
                <div className="h-8 w-20 bg-neutral-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
