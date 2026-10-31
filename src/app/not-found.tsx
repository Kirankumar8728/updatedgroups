import Link from 'next/link';
import { 
  Compass, 
  Home, 
  Search, 
  Flame, 
  PlusCircle, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Globe,
  Layers,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { PlatformIcon } from '@/src/components/PlatformIcon';

export const metadata = {
  title: '404 — Community or Page Not Found | Group Links Directory',
  description: 'The requested community link or directory page could not be located. Explore thousands of active, verified WhatsApp, Telegram, and Discord communities.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  const platforms = [
    { name: 'WhatsApp Groups', href: '/whatsapp-groups', platform: 'whatsapp' as const, badge: '5,000+ active links', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30' },
    { name: 'Telegram Channels', href: '/telegram-channels', platform: 'telegram' as const, badge: 'Top verified channels', color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30' },
    { name: 'Discord Servers', href: '/discord-servers', platform: 'discord' as const, badge: 'Gaming & coding hubs', color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30' },
    { name: '24H Leaderboard', href: '/active24hours', icon: Flame, badge: 'Most joined today', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30' },
  ];

  const popularCategories = [
    { name: 'Tech & Programming', href: '/categories/tech-programming', emoji: '💻' },
    { name: 'Gaming & Esports', href: '/categories/gaming-esports', emoji: '🎮' },
    { name: 'Crypto & Web3', href: '/categories/crypto-web3', emoji: '⚡' },
    { name: 'Education & Study', href: '/categories/education-study', emoji: '📚' },
    { name: 'Entertainment & Movies', href: '/categories/entertainment-movies', emoji: '🎬' },
    { name: 'Business & Startups', href: '/categories/business-startups', emoji: '🚀' },
    { name: 'Finance & Investing', href: '/categories/finance-investing', emoji: '📈' },
    { name: 'Fitness & Wellness', href: '/categories/fitness-wellness', emoji: '💪' },
  ];

  const suggestedTags = [
    '#telegram', '#whatsapp', '#coding', '#gaming', '#movies', '#study', '#crypto', '#jobs'
  ];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Gradients & Ambient Lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-gradient-to-b from-indigo-600/15 via-emerald-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-0 w-80 h-80 bg-blue-600/10 blur-3xl pointer-events-none -z-10" />

      {/* Header Minimal Branding */}
      <header className="w-full border-b border-white/5 bg-neutral-950/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-indigo-950/40 group-hover:scale-105 transition-transform">
              G
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
              Group<span className="text-indigo-400">Links</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-semibold text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link
              href="/submit-group"
              prefetch={false}
              className="text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit Group</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Animated Radar Visual for Missing Community */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
            <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-rose-500/90 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
            404
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-4 shadow-xs">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Community or Page Not Found</span>
        </div>

        {/* 404 Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight mb-3">
          Lost in the Directory?
        </h1>

        <p className="text-neutral-400 text-sm sm:text-base max-w-xl leading-relaxed mb-8">
          The link you followed may be outdated, the group invite might have been updated by its owner, or the URL slug was entered incorrectly. Don&apos;t worry—we index thousands of active verified groups daily.
        </p>

        {/* Search Bar with Autocomplete suggestions */}
        <div className="w-full max-w-lg mb-8">
          <form 
            action="/" 
            method="GET"
            className="relative flex items-center"
          >
            <Search className="w-5 h-5 text-neutral-500 absolute left-4 pointer-events-none" />
            <input
              type="text"
              name="search"
              placeholder="Search groups by title, topic, or keyword..."
              className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-inner transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer shadow-md"
            >
              Search
            </button>
          </form>

          {/* Quick Tag Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
            <span className="text-[11px] text-neutral-500 font-medium">Popular:</span>
            {suggestedTags.map((tag) => (
              <Link
                key={tag}
                href={`/?tag=${encodeURIComponent(tag.replace('#', ''))}`}
                className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-indigo-400 border border-neutral-800 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <Link
            href="/"
            className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 shadow-lg shadow-indigo-950/40 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Explore Directory</span>
          </Link>

          <Link
            href="/active24hours"
            className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>24H Trending</span>
          </Link>

          <Link
            href="/submit-group"
            prefetch={false}
            className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Submit a Community</span>
          </Link>
        </div>

        {/* Explore by Platform Section */}
        <div className="w-full max-w-3xl pt-8 border-t border-neutral-900">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Browse by Platform</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left mb-8">
            {platforms.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`p-3.5 rounded-2xl bg-gradient-to-b ${item.color} border hover:border-white/20 transition-all flex flex-col justify-between group cursor-pointer shadow-sm hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0 border border-white/10">
                    {item.platform ? (
                      <PlatformIcon platform={item.platform} className="w-4 h-4" />
                    ) : item.icon ? (
                      <item.icon className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Compass className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm text-white group-hover:text-indigo-300 transition-colors">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {item.badge}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Popular Categories Grid */}
          <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800/80 p-5 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Featured Categories</span>
              </span>
              <Link href="/categories" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                View all 25 →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {popularCategories.map((cat) => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700 transition-all flex items-center gap-2 group truncate"
                >
                  <span className="text-sm shrink-0">{cat.emoji}</span>
                  <span className="truncate group-hover:text-indigo-300 transition-colors">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Footer Minimal Bar */}
      <footer className="w-full py-5 text-center text-xs text-neutral-500 border-t border-neutral-900 bg-neutral-950">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Group Links Directory. Verified Global Communities.</p>
          <div className="flex items-center gap-4 text-neutral-400">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/categories" className="hover:text-white transition-colors">Categories</Link>
            <Link href="/countries" className="hover:text-white transition-colors">Countries</Link>
            <Link href="/submit-group" prefetch={false} className="hover:text-white transition-colors">Submit</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
