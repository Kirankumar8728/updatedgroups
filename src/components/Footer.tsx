import React from 'react';
import Link from 'next/link';
import { 
  Globe, 
  ShieldCheck, 
  MessageCircle, 
  Send, 
  Gamepad2, 
  Users, 
  Shield, 
  Camera, 
  MessageSquare,
  Sparkles,
  ExternalLink,
  Lock,
  FileText,
  Mail,
  HelpCircle,
  Award,
  ShieldAlert
} from 'lucide-react';
import { CATEGORIES, categoryToSlug } from '@/src/utils/helpers';
import { CustomScriptsInjector } from '@/src/components/CustomScriptsInjector';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const platforms = [
    { name: 'WhatsApp Groups', href: '/whatsapp-groups', icon: MessageCircle, count: '100% Verified' },
    { name: 'Telegram Channels', href: '/telegram-channels', icon: Send, count: 'Active' },
    { name: 'Discord Servers', href: '/discord-servers', icon: Gamepad2, count: 'Communities' },
    { name: 'Facebook Groups', href: '/facebook-groups', icon: Users, count: 'Niche' },
    { name: 'Signal Groups', href: '/signal-groups', icon: Shield, count: 'Private' },
    { name: 'Reddit Communities', href: '/reddit-communities', icon: MessageSquare, count: 'Forums' },
    { name: 'Instagram Groups', href: '/instagram-groups', icon: Camera, count: 'Reels' },
    { name: 'Snapchat Groups', href: '/snapchat-groups', icon: Camera, count: 'Streaks' },
    { name: '24H Trending Promotions', href: '/active24hours', icon: Award, count: 'Live Rankings' },
  ];

  const popularCategories = CATEGORIES.filter(c => c !== 'Adult / 18+').slice(0, 10);

  const trustAndLegal = [
    { name: 'About Group Links', href: '/about' },
    { name: 'Verification Methodology', href: '/verification' },
    { name: 'Community Safety Guidelines', href: '/safety' },
    { name: 'DMCA Takedown Request', href: '/dmca' },
    { name: 'Report / Remove Listing', href: '/report' },
    { name: 'Submission Guidelines', href: '/guidelines' },
    { name: 'Editorial Standards', href: '/editorial-standards' },
    { name: 'Contact Support', href: '/contact' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms & Conditions', href: '/terms' },
    { name: 'LLMS.txt (AI Index)', href: '/llms.txt' },
  ];

  return (
    <footer className="w-full bg-slate-950 border-t border-slate-800/80 text-slate-400 mt-16 pt-14 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Grid: Brand & Directory Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          
          {/* Col 1 & 2: Brand Information & Trust Statement */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/50">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-slate-100 tracking-tight">
                Group Links
              </span>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              The premier curated directory for discovering verified WhatsApp groups, Telegram channels, Discord servers, Signal chats, Facebook groups, Instagram groups, and Reddit communities.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Link Health Monitoring</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-medium">
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span>Privacy First</span>
              </span>
              <Link
                href="/dmca"
                prefetch={false}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold transition-all hover:scale-105"
                title="DMCA Copyright Takedown Notice & Policy"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>DMCA Removal</span>
              </Link>
            </div>
          </div>

          {/* Col 3: Platform Directories */}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 mb-4">
              Platform Directories
            </h2>
            <ul className="space-y-2.5 text-sm">
              {platforms.map((p) => {
                const IconComponent = p.icon;
                return (
                  <li key={p.name}>
                    <Link
                      href={p.href}
                      prefetch={false}
                      className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <IconComponent className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{p.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Col 4: Top Categories */}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 mb-4">
              Browse Categories
            </h2>
            <ul className="space-y-2.5 text-sm">
              {popularCategories.map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/categories/${categoryToSlug(cat)}`}
                    prefetch={false}
                    className="text-slate-400 hover:text-emerald-400 transition-colors truncate block"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 5: Trust, Safety & Legal */}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 mb-4">
              Trust & Governance
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li key="dmca-prominent" className="pb-1">
                <Link
                  href="/dmca"
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-extrabold text-xs transition-all shadow-sm hover:scale-105"
                  title="DMCA Copyright Takedown Request"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>DMCA Takedown Request</span>
                </Link>
              </li>
              {trustAndLegal.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className={item.href === '/dmca' ? 'text-amber-400 font-bold hover:text-amber-300 transition-colors block' : 'text-slate-400 hover:text-emerald-400 transition-colors block'}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  href="/submit-group"
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Submit Your Group Free</span>
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Global SEO & Verification Scripts */}
        <CustomScriptsInjector />

        {/* Disclaimer & Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-300">
          <p>
            &copy; {currentYear} Group Links. All rights reserved. Group Links is an independent directory and is not affiliated with WhatsApp LLC, Telegram FZ-LLC, Discord Inc., Meta Platforms Inc., Signal Messenger LLC, Snap Inc., or Reddit Inc.
          </p>

          <div className="flex items-center gap-4 text-slate-400 shrink-0">
            <Link href="/privacy" prefetch={false} className="hover:text-slate-200 transition-colors">Privacy</Link>
            <span>&bull;</span>
            <Link href="/terms" prefetch={false} className="hover:text-slate-200 transition-colors">Terms</Link>
            <span>&bull;</span>
            <Link href="/safety" prefetch={false} className="hover:text-slate-200 transition-colors">Safety</Link>
            <span>&bull;</span>
            <Link href="/report" prefetch={false} className="hover:text-slate-200 transition-colors">DMCA / Report</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
