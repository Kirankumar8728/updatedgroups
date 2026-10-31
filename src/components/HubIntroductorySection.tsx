'use client';

import React from 'react';
import { ShieldCheck, Sparkles, Users, Layers, ExternalLink } from 'lucide-react';
import { SeoHubCopy } from '@/src/lib/programmatic-seo';

interface HubIntroductorySectionProps {
  hubCopy: SeoHubCopy;
  platformName?: string;
  categoryName?: string;
  activeCount?: number;
  totalMembers?: number;
}

export function HubIntroductorySection({
  hubCopy,
  platformName,
  categoryName,
  activeCount,
  totalMembers,
}: HubIntroductorySectionProps) {
  const count = activeCount !== undefined ? activeCount : hubCopy.totalGroupsCount;
  const members = totalMembers !== undefined ? totalMembers : hubCopy.totalMembersCount;
  const formattedMembers = members > 0 ? members.toLocaleString() : '10,000+';

  return (
    <div id="hub-intro-header" className="relative mb-8 rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 p-6 sm:p-8 md:p-10 shadow-2xl">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Verification & freshness badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {hubCopy.badge || 'Verified Daily • Real-Time Links'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-800/80 border border-neutral-700/80 text-neutral-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {count} Active {count === 1 ? 'Community' : 'Communities'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-800/80 border border-neutral-700/80 text-neutral-300">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            {formattedMembers} Total Members
          </span>
        </div>

        {/* H1 Heading */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
          {hubCopy.h1}
        </h1>

        {/* 100-150 word Programmatic Copy Summary */}
        <div className="space-y-2.5 max-w-4xl text-sm sm:text-base text-neutral-300 leading-relaxed font-normal">
          {hubCopy.introParagraphs.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
