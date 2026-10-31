'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Platform } from '../types';
import { PLATFORM_CONFIGS, getPlatformListingUrl } from '../utils/helpers';
import { PlatformIcon } from './PlatformIcon';
import { Layers } from 'lucide-react';

interface PlatformFilterProps {
  selectedPlatform: Platform | 'all';
  onSelectPlatform: (platform: Platform | 'all') => void;
  platformCounts?: Record<string, number>;
  totalCount?: number;
  lockedPlatform?: Platform;
}

const PLATFORM_GROUP_LABELS: Record<string, string> = {
  all: 'All Groups',
  whatsapp: 'WhatsApp Groups',
  telegram: 'Telegram Channels',
  discord: 'Discord Servers',
  facebook: 'Facebook Groups',
  signal: 'Signal Groups',
  instagram: 'Instagram Groups',
  snapchat: 'Snapchat Groups',
  reddit: 'Reddit Communities',
};

const PLATFORMS_LIST: (Platform | 'all')[] = [
  'all',
  'whatsapp',
  'telegram',
  'discord',
  'facebook',
  'signal',
  'instagram',
  'snapchat',
  'reddit',
];

const PlatformFilterComponent: React.FC<PlatformFilterProps> = ({
  selectedPlatform,
  onSelectPlatform,
  platformCounts = {},
  totalCount = 0,
  lockedPlatform,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative group/filter">
        <div className="w-full overflow-x-auto no-scrollbar py-2">
          <div className="flex items-center gap-2 min-w-max px-1">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-white opacity-50">
              <Layers className="w-4 h-4" />
              <span>All Groups</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group/filter">
      <div className="w-full overflow-x-auto no-scrollbar py-2 scroll-smooth">
        <div className="flex items-center gap-2 min-w-max px-1">
          {PLATFORMS_LIST.map((plat) => {
            const isSelected = selectedPlatform === plat;
            const label = PLATFORM_GROUP_LABELS[plat] || `${plat} Group`;
            const count = plat === 'all' ? totalCount : (platformCounts[plat] || 0);
            const href = plat === 'all' ? '/' : getPlatformListingUrl(plat);
            
            if (plat === 'all') {
              return (
                <Link
                  key="all"
                  href="/"
                  onClick={() => onSelectPlatform && onSelectPlatform('all')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md scale-105'
                      : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>{label}</span>
                  <span className={`px-2 py-0.5 text-[11px] font-extrabold rounded-full ${
                    isSelected 
                      ? 'bg-white/20 text-white' 
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600'
                  }`}>
                    {count}
                  </span>
                </Link>
              );
            }

            const config = PLATFORM_CONFIGS[plat];

            return (
              <Link
                key={plat}
                href={href}
                onClick={() => onSelectPlatform && onSelectPlatform(plat)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
                  isSelected
                    ? `${config.badgeClass} border-transparent shadow-md scale-105`
                    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <PlatformIcon platform={plat} className="w-4 h-4" />
                <span>{label}</span>
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                  isSelected
                    ? 'bg-black/20 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600'
                }`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none z-10" />
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none z-10" />
    </div>
  );
};

export const PlatformFilter = React.memo(PlatformFilterComponent);
