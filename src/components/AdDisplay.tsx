'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Sparkles, Megaphone } from 'lucide-react';
import { AdPlacement, AdSlot } from '../types';
import { 
  getActiveAdsForSlot, 
  trackAdClick, 
  trackAdImpression,
  isGlobalAdsEnabled,
  isUserAdsVisible 
} from '../utils/adManager';

interface AdDisplayProps {
  slot: AdSlot;
  isCurrentContextSafe?: boolean; // false when on 18+/adult groups or category
  className?: string;
  adOverride?: AdPlacement;
  adIndex?: number;
}

export const AdDisplay: React.FC<AdDisplayProps> = ({
  slot,
  isCurrentContextSafe = true,
  className = '',
  adOverride,
  adIndex = 0,
}) => {
  const customCodeRef = useRef<HTMLDivElement>(null);
  const trackedAdIdRef = useRef<string | null>(null);
  const [version, setVersion] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen to ads visibility events (e.g. toggled from admin dashboard)
  useEffect(() => {
    const handleVisChange = () => setVersion(v => v + 1);
    window.addEventListener('nexus_ads_visibility_changed', handleVisChange);
    return () => window.removeEventListener('nexus_ads_visibility_changed', handleVisChange);
  }, []);

  const globalEnabled = mounted ? isGlobalAdsEnabled() : true;
  const userVisible = mounted ? isUserAdsVisible() : true;
  const activeAds = adOverride ? [adOverride] : (mounted && globalEnabled && userVisible ? getActiveAdsForSlot(slot, isCurrentContextSafe) : []);
  const selectedIndex = activeAds.length > 0 ? Math.abs(adIndex) % activeAds.length : 0;
  const ad = activeAds[selectedIndex];

  useEffect(() => {
    if (mounted && globalEnabled && userVisible && ad && ad.isActive) {
      if (trackedAdIdRef.current !== ad.id) {
        trackedAdIdRef.current = ad.id;
        trackAdImpression(ad.id);
      }
    }
  }, [ad?.id, ad?.isActive, mounted, globalEnabled, userVisible]);

  // Execute custom script tags inside custom HTML safely if provided
  useEffect(() => {
    if (mounted && globalEnabled && userVisible && ad && ad.isActive && ad.format === 'custom_code' && ad.code && customCodeRef.current) {
      customCodeRef.current.innerHTML = ad.code;
      // Evaluate any inline scripts
      const scripts = customCodeRef.current.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr: Attr) => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    }
  }, [ad?.id, ad?.code, ad?.format, ad?.isActive, version, mounted, globalEnabled, userVisible]);

  if (!mounted && !adOverride) {
    return null;
  }

  if (!globalEnabled || !userVisible) {
    return null;
  }

  if (!ad || !ad.isActive) return null;

  const handleClick = () => {
    trackAdClick(ad.id);
  };

  // Custom HTML / Script format
  if (ad.format === 'custom_code' && ad.code) {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm ${className}`}>
        <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-100/70 dark:bg-neutral-800/70 border-b border-neutral-200/60 dark:border-neutral-700/60 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Megaphone className="w-3 h-3 text-indigo-500" />
            <span>Sponsored Ad</span>
          </span>
          <span className="font-medium text-neutral-400">{ad.sponsorName || 'Network Sponsor'}</span>
        </div>
        <div ref={customCodeRef} className="p-3 overflow-x-auto min-h-[60px]" />
      </div>
    );
  }

  // Join Button Ad Format (Placed directly beneath community join action)
  if (slot === 'join_button_ad') {
    return (
      <div className={`mt-3 w-full p-3.5 rounded-2xl bg-gradient-to-r from-neutral-900/90 via-indigo-950/80 to-neutral-900/90 border border-indigo-500/30 text-white shadow-md ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              Sponsored
            </span>
            <span className="text-[11px] font-bold text-neutral-300 truncate">
              {ad.sponsorName || 'Featured Partner'}
            </span>
          </div>
          <span className="text-[10px] text-neutral-400">Join button ad</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {ad.imageUrl && (
              <img 
                src={ad.imageUrl} 
                alt={ad.title} 
                className="w-9 h-9 rounded-lg object-cover border border-white/20 shrink-0"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.style.display = 'none';
                }}
              />
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {ad.title}
              </div>
              {ad.bannerText && (
                <div className="text-[11px] text-neutral-300 truncate">
                  {ad.bannerText}
                </div>
              )}
            </div>
          </div>

          <a
            href={ad.targetUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white transition-all flex items-center gap-1.5 shadow-sm shrink-0 whitespace-nowrap"
          >
            <span>{ad.ctaText || 'Explore'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // Header Top & Footer Banner Format
  if (slot === 'header_top' || slot === 'footer_banner' || slot === 'footer') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-neutral-900 text-white p-3 sm:p-4 shadow-lg border border-indigo-500/20 ${className}`}>
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white/90">
            Sponsored
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {ad.imageUrl && (
              <img 
                src={ad.imageUrl} 
                alt={ad.title} 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-white/20 shrink-0"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.style.display = 'none';
                }}
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400">
                  {ad.sponsorName || 'Featured Partner'}
                </span>
                <span className="text-[10px] text-white/60">•</span>
                <h4 className="text-xs sm:text-sm font-extrabold text-white line-clamp-1">
                  {ad.title}
                </h4>
              </div>
              {ad.bannerText && (
                <p className="text-[11px] sm:text-xs text-white/80 line-clamp-1 mt-0.5 max-w-2xl">
                  {ad.bannerText}
                </p>
              )}
            </div>
          </div>

          <a
            href={ad.targetUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{ad.ctaText || 'Learn More'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // Feed Native Card Format
  if (slot === 'feed_native') {
    return (
      <div className={`relative flex flex-col justify-between rounded-2xl bg-white dark:bg-neutral-900 border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 shadow-md hover:shadow-xl transition-all overflow-hidden p-4 ${className}`}>
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
            Sponsored Ad
          </span>
        </div>

        <div>
          {ad.imageUrl && (
            <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 bg-neutral-100 dark:bg-neutral-800">
              <img 
                src={ad.imageUrl} 
                alt={ad.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 text-[11px] font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{ad.sponsorName || 'Official Partner'}</span>
              </div>
            </div>
          )}

          <h3 className="font-bold text-sm text-neutral-900 dark:text-white leading-snug mb-1">
            {ad.title}
          </h3>
          {ad.bannerText && (
            <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-3 leading-relaxed mb-4">
              {ad.bannerText}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-neutral-400">
            Target: {ad.target === 'safe_only' ? 'Safe Placement' : 'Global Placement'}
          </span>
          <a
            href={ad.targetUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>{ad.ctaText || 'Visit Sponsor'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // Detail Page / Modal Banner Format
  if (slot === 'detail_banner' || slot === 'rules_banner' || slot === 'above_join_button') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Sponsored
            </span>
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              {ad.sponsorName || 'Community Partner'}
            </span>
          </div>
          <span className="text-[10px] text-neutral-400">Ad Placement</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {ad.imageUrl && (
            <img 
              src={ad.imageUrl} 
              alt={ad.title} 
              className="w-full sm:w-28 h-20 rounded-xl object-cover shrink-0 border border-neutral-200 dark:border-neutral-700"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.style.display = 'none';
              }}
            />
          )}
          <div className="flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white leading-tight">
              {ad.title}
            </h4>
            {ad.bannerText && (
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 line-clamp-2 leading-relaxed">
                {ad.bannerText}
              </p>
            )}
          </div>
          <a
            href={ad.targetUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
          >
            <span>{ad.ctaText || 'Check Deal'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // Default Sidebar Format
  return (
    <div className={`p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
          Sponsored Link
        </span>
        <span className="text-[9px] text-neutral-400">{ad.sponsorName}</span>
      </div>
      {ad.imageUrl && (
        <img 
          src={ad.imageUrl} 
          alt={ad.title} 
          className="w-full h-24 rounded-xl object-cover mb-2"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.style.display = 'none';
          }}
        />
      )}
      <h4 className="font-bold text-xs text-neutral-900 dark:text-white mb-1">
        {ad.title}
      </h4>
      <p className="text-[11px] text-neutral-500 line-clamp-2 mb-3">
        {ad.bannerText}
      </p>
      <a
        href={ad.targetUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="w-full py-1.5 text-xs font-bold text-center block rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
      >
        {ad.ctaText || 'Visit Now'}
      </a>
    </div>
  );
};
