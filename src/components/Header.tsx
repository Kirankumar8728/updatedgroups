'use client';
import React, { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import { 
  Compass, 
  Trophy, 
  Bookmark, 
  PlusCircle, 
  Search, 
  Sparkles,
  Menu,
  X,
  Zap,
  Coins
} from 'lucide-react';
import { UserProfile } from '../types/user';
import { Platform } from '../types';
import { getPlatformListingUrl } from '../utils/helpers';
import { useAuth } from './AuthProvider';
import { PWAInstallButton } from './PWAInstallButton';


interface HeaderProps {
  activeTab: 'explore' | 'leaderboard';
  setActiveTab: (tab: 'explore' | 'leaderboard') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenBookmarks: () => void;
  onOpenAdmin?: () => void;
  isAdminLoggedIn?: boolean;
  bookmarkCount: number;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  onNavigateHome?: () => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: () => void;
  onOpenDashboard?: () => void;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenBookmarks,
  onOpenAdmin,
  isAdminLoggedIn,
  bookmarkCount,
  isDarkMode,
  setIsDarkMode,
  onNavigateHome,
  currentUser,
  onOpenAuthModal,
  onOpenDashboard,
}) => {
  const { user: contextUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu when switching tabs or resizing
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogoClick = () => {
    setActiveTab('explore');
    setSearchQuery('');
    setIsMobileMenuOpen(false);
    if (onNavigateHome) onNavigateHome();
  };

  const effectiveUser = currentUser !== undefined ? currentUser : contextUser;
  const displayUser = mounted ? effectiveUser : null;
  const displayBookmarks = mounted ? bookmarkCount : 0;
  const isDark = mounted ? isDarkMode : true;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 select-none">
            <Link 
              href="/"
              prefetch={true}
              onClick={handleLogoClick}
              className="flex items-center gap-2 text-left group focus:outline-none cursor-pointer"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                <div className="w-full h-full bg-white dark:bg-neutral-900 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </Link>
            <div>
              <Link
                href="/"
                prefetch={true}
                onClick={handleLogoClick}
                className="flex items-center gap-1.5 focus:outline-none cursor-pointer group"
              >
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Group<span className="text-indigo-600 dark:text-indigo-400">Links</span>
                </span>
              </Link>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-none hidden sm:flex items-center gap-1 mt-0.5">
                <Link href="/whatsapp-groups" prefetch={false} className="hover:text-emerald-500 transition-colors cursor-pointer" title="Browse WhatsApp Groups">WhatsApp</Link>
                <span>•</span>
                <Link href="/telegram-channels" prefetch={false} className="hover:text-sky-500 transition-colors cursor-pointer" title="Browse Telegram Channels">Telegram</Link>
                <span>•</span>
                <Link href="/discord-servers" prefetch={false} className="hover:text-indigo-500 transition-colors cursor-pointer" title="Browse Discord Servers">Discord</Link>
                <span>•</span>
                <Link href="/facebook-groups" prefetch={false} className="hover:text-blue-500 transition-colors cursor-pointer" title="Browse Facebook Groups">Facebook</Link>
                <span>•</span>
                <Link href="/signal-groups" prefetch={false} className="hover:text-cyan-500 transition-colors cursor-pointer" title="Browse Signal Groups">Signal</Link>
                <span>•</span>
                <Link href="/reddit-communities" prefetch={false} className="hover:text-orange-500 transition-colors cursor-pointer" title="Browse Reddit Communities">Reddit</Link>
                <span>•</span>
                <Link href="/instagram-groups" prefetch={false} className="hover:text-pink-500 transition-colors cursor-pointer" title="Browse Instagram Groups">Instagram</Link>
                <span>•</span>
                <Link href="/snapchat-groups" prefetch={false} className="hover:text-yellow-500 transition-colors cursor-pointer" title="Browse Snapchat Groups">Snapchat</Link>
              </div>
            </div>
          </div>

          {/* Desktop Actions Bar */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            <nav className="flex items-center bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
              <button
                onClick={() => setActiveTab('explore')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'explore'
                    ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Explore</span>
              </button>

              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'leaderboard'
                    ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Rankings</span>
              </button>

              <Link
                href="/active24hours"
                prefetch={false}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>24H Trending</span>
              </Link>
            </nav>


            {/* User Account / Credits / Sign In Button */}
            {displayUser ? (
              <button
                onClick={onOpenDashboard}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-900 dark:text-amber-200 transition-all cursor-pointer group"
                title="Open User Dashboard & Credits"
              >
                <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-mono font-bold text-xs">
                  {displayUser.creditsBalance} <span className="hidden lg:inline text-[10px] text-amber-700 dark:text-amber-400 font-sans uppercase">Credits</span>
                </span>
                <img
                  src={displayUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayUser.id)}`}
                  alt={displayUser.displayName}
                  className="w-5 h-5 rounded-full object-cover border border-amber-500/40 ml-0.5"
                />
              </button>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800/80 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Saved Bookmarks Button */}
            <button
              onClick={onOpenBookmarks}
              aria-label="View Saved Groups"
              className="relative p-2 text-neutral-300 hover:bg-neutral-900 rounded-xl transition-colors border border-transparent hover:border-neutral-800 cursor-pointer"
            >
              <Bookmark className="w-5 h-5" />
              {displayBookmarks > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {displayBookmarks}
                </span>
              )}
            </button>

            {/* Submit Group Button */}
            <Link
              href="/submit-group"
              prefetch={false}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Group</span>
            </Link>
          </div>

          {/* Mobile Right Controls: Promote + Submit Button + Menu Toggle */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* User Account / Sign In Pill on Mobile */}
            {displayUser ? (
              <button
                onClick={onOpenDashboard}
                className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 cursor-pointer"
                title="Open Dashboard"
              >
                <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="font-mono font-bold text-xs">{displayUser.creditsBalance}</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Login</span>
              </button>
            )}

            {/* Quick Add Button on Mobile */}
            <Link
              href="/submit-group"
              prefetch={false}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs cursor-pointer active:scale-95 transition-transform"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit</span>
            </Link>

            {/* Mobile Hamburger Menu Toggle with Bookmark indicator */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Open Navigation Menu"
              className="relative p-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <Menu className="w-5 h-5" />}
              {displayBookmarks > 0 && !isMobileMenuOpen && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {displayBookmarks}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Mobile Search Bar Row */}
        <div className="pb-3 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups, #tags, topics..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-xl">
          
          {/* Main Navigation Links */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setActiveTab('explore');
                setIsMobileMenuOpen(false);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'explore'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('leaderboard');
                setIsMobileMenuOpen(false);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Rankings</span>
            </button>

            <Link
              href="/active24hours"
              prefetch={false}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold transition-all bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
            >
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>24H Trend</span>
            </Link>
          </div>

          {/* Quick Menu Items */}
          <div className="space-y-1 bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60">
            <button
              onClick={() => {
                onOpenBookmarks();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Bookmark className="w-4 h-4 text-indigo-500" />
                <span>Saved Bookmarks</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {displayBookmarks}
              </span>
            </button>

            <Link
              href="/submit-group"
              prefetch={false}
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <span className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4 text-emerald-500" />
                <span>Submit / Index New Group</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                Free
              </span>
            </Link>

            {/* Install App inside Menu */}
            <div className="pt-1 px-1">
              <PWAInstallButton />
            </div>
          </div>

          {/* Quick Platform Shortcuts in Mobile Menu */}
          <div className="pt-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1 mb-2">
              Supported Platforms
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(['whatsapp', 'telegram', 'discord', 'facebook', 'signal', 'reddit', 'snapchat'] as Platform[]).map((plat) => {
                const label = plat === 'whatsapp' 
                  ? 'WhatsApp' 
                  : plat === 'reddit' 
                  ? 'Reddit' 
                  : plat.charAt(0).toUpperCase() + plat.slice(1);
                return (
                  <Link 
                    key={plat}
                    href={getPlatformListingUrl(plat)}
                    prefetch={false}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </header>
  );
};

export const Header = memo(HeaderComponent);

