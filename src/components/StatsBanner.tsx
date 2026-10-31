'use client';
import React from 'react';
import Link from 'next/link';
import { Users, TrendingUp, Sparkles, Globe2, Zap } from 'lucide-react';
import { formatMemberCount } from '../utils/helpers';

interface StatsBannerProps {
  totalGroups: number;
  totalJoins: number;
  totalMembers: number;
  onOpenSubmit: () => void;
}

const StatsBannerComponent: React.FC<StatsBannerProps> = ({
  totalGroups,
  totalJoins,
  totalMembers,
  onOpenSubmit,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-neutral-900/90 text-white p-3.5 sm:p-4.5 border border-neutral-800 shadow-md mb-5">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 sm:gap-4">
        
        {/* Compact Brand Name & Tagline */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            prefetch={true}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center shadow-sm shrink-0 cursor-pointer"
            title="GroupLinks Directory Home"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                prefetch={true}
                className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5 hover:text-indigo-200 transition-colors cursor-pointer"
              >
                <span>Group</span>
                <span className="text-indigo-400">Links</span>
              </Link>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Official Directory
              </span>
            </div>
            <div className="text-xs text-neutral-300 font-medium flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
              <span className="text-neutral-400">Verified Links for</span>
              <Link
                href="/whatsapp-groups"
                prefetch={false}
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 decoration-emerald-500/40 hover:decoration-emerald-300 transition-colors cursor-pointer"
                title="Browse Verified WhatsApp Groups"
              >
                WhatsApp
              </Link>
              <span className="text-neutral-500">•</span>
              <Link
                href="/telegram-channels"
                prefetch={false}
                className="text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2 decoration-sky-500/40 hover:decoration-sky-300 transition-colors cursor-pointer"
                title="Browse Verified Telegram Channels & Groups"
              >
                Telegram
              </Link>
              <span className="text-neutral-500">•</span>
              <Link
                href="/discord-servers"
                prefetch={false}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 decoration-indigo-500/40 hover:decoration-indigo-300 transition-colors cursor-pointer"
                title="Browse Verified Discord Servers"
              >
                Discord
              </Link>
              <span className="text-neutral-500">•</span>
              <Link
                href="/signal-groups"
                prefetch={false}
                className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 decoration-blue-500/40 hover:decoration-blue-300 transition-colors cursor-pointer"
                title="Browse Verified Signal Groups"
              >
                Signal
              </Link>
              <span className="text-neutral-500">•</span>
              <Link
                href="/explore"
                prefetch={false}
                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 decoration-amber-500/40 hover:decoration-amber-300 transition-colors cursor-pointer"
                title="Explore All Platforms & Communities"
              >
                & More
              </Link>
              <span className="text-neutral-500 hidden sm:inline">•</span>
              <Link
                href="/explore"
                prefetch={false}
                className="text-indigo-300 hover:text-indigo-200 transition-colors hidden sm:inline underline underline-offset-2 decoration-indigo-400/30 hover:decoration-indigo-300 cursor-pointer"
                title="Discover & Connect Instantly"
              >
                Discover & Connect Instantly
              </Link>
            </div>
          </div>
        </div>

        {/* Streamlined Live Metrics Bar */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0">
          <div className="flex-1 sm:flex-initial bg-neutral-800/80 px-3 py-1.5 rounded-xl border border-neutral-700/60 text-center">
            <div className="text-[10px] font-medium text-indigo-300 flex items-center justify-center gap-1">
              <Globe2 className="w-3 h-3" />
              <span>Groups</span>
            </div>
            <div
              className="text-xs sm:text-sm font-black text-white leading-tight mt-0.5"
              title={`${totalGroups.toLocaleString()} Total Groups`}
            >
              {formatMemberCount(totalGroups)}
            </div>
          </div>

          <div className="flex-1 sm:flex-initial bg-neutral-800/80 px-3 py-1.5 rounded-xl border border-neutral-700/60 text-center">
            <div className="text-[10px] font-medium text-emerald-300 flex items-center justify-center gap-1">
              <Users className="w-3 h-3" />
              <span>Members</span>
            </div>
            <div
              className="text-xs sm:text-sm font-black text-white leading-tight mt-0.5"
              title={`${totalMembers.toLocaleString()} Total Members`}
            >
              {formatMemberCount(totalMembers)}
            </div>
          </div>

          <div className="flex-1 sm:flex-initial bg-neutral-800/80 px-3 py-1.5 rounded-xl border border-neutral-700/60 text-center">
            <div className="text-[10px] font-medium text-amber-300 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Joins</span>
            </div>
            <div
              className="text-xs sm:text-sm font-black text-white leading-tight mt-0.5"
              title={`${totalJoins.toLocaleString()} Total Joins`}
            >
              {formatMemberCount(totalJoins)}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export const StatsBanner = React.memo(StatsBannerComponent);

