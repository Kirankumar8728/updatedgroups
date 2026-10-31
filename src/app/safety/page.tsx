import React from 'react';
import Link from 'next/link';
import { Shield, Lock, AlertTriangle, EyeOff, UserCheck, Smartphone, HelpCircle } from 'lucide-react';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { Breadcrumbs } from '@/src/components/Breadcrumbs';
import { Footer } from '@/src/components/Footer';

export const metadata = buildPageMetadata({
  title: 'Community Safety Guidelines & Privacy Tips — Group Links',
  description:
    'Essential privacy and safety guidelines for joining public WhatsApp, Telegram, Signal groups, Discord servers, and Reddit communities safely. Learn how to protect your personal information.',
  pathname: '/safety',
  keywords: ['online group safety', 'WhatsApp privacy settings', 'Telegram safety tips', 'Discord privacy', 'safe community participation'],
});

export default function SafetyPage() {
  const breadcrumbs = [{ name: 'Safety Guidelines', url: '/safety' }];
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Safety Guidelines', url: '/safety' },
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <Breadcrumbs items={breadcrumbs} />

          <header className="space-y-4 border-b border-slate-800 pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Shield className="w-3.5 h-3.5" />
              <span>User Protection & Privacy</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Community Safety & Privacy Guidelines
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              When joining public groups on messaging apps and social platforms, protecting your identity, phone number, and personal boundaries is critical. Follow these best practices.
            </p>
          </header>

          <article className="prose prose-invert max-w-none space-y-8 text-slate-300">
            
            {/* WhatsApp Privacy */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                WhatsApp Group Safety
              </h2>
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-3 text-sm">
                <p>
                  Because WhatsApp groups reveal phone numbers to all participants in traditional groups (unlike WhatsApp Communities where member lists can be hidden), take these precautions:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li><strong>Profile Privacy:</strong> Navigate to WhatsApp Settings &gt; Privacy and set Profile Photo, About, and Last Seen to "My Contacts" or "Nobody".</li>
                  <li><strong>Two-Step Verification:</strong> Enable 2FA PIN in WhatsApp Settings &gt; Account &gt; Two-Step Verification to prevent SIM-swap attacks.</li>
                  <li><strong>Group Add Permissions:</strong> Set "Who can add me to groups" to "My Contacts" to prevent random unsolicited group invitations.</li>
                </ul>
              </div>
            </section>

            {/* Telegram Safety */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Lock className="w-5 h-5 text-sky-400" />
                Telegram Channels & Groups Safety
              </h2>
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-3 text-sm">
                <p>
                  Telegram offers strong privacy controls that allow you to participate without exposing your mobile number:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li><strong>Hide Phone Number:</strong> Go to Settings &gt; Privacy and Security &gt; Phone Number and set it to <strong>"Nobody"</strong>.</li>
                  <li><strong>Username Usage:</strong> Create a public username so users can message you without needing your actual contact details.</li>
                  <li><strong>Beware of Impersonators:</strong> Administrators will never DM you first asking for crypto wallet phrases, passwords, or payments.</li>
                </ul>
              </div>
            </section>

            {/* Discord Server Safety */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                Discord Server Safety
              </h2>
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-3 text-sm">
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li><strong>Direct Messages:</strong> In User Settings &gt; Privacy & Safety, choose whether server members can send you Direct Messages. Turn this off in large public gaming/crypto servers.</li>
                  <li><strong>Suspicious Links & QR Codes:</strong> Never scan QR codes from Discord DMs claiming "Free Discord Nitro" or "Steam gift cards."</li>
                </ul>
              </div>
            </section>

            {/* General Golden Rules */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Universal Rules to Prevent Scams
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-400 text-sm">🚫 Never Share Credentials</div>
                  <p>Never share SMS OTPs, bank details, passwords, or recovery seeds under any circumstance.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-400 text-sm">⚠️ Question "Guaranteed Returns"</div>
                  <p>Investment groups promising 100% risk-free profits or doubled deposits are fraudulent schemes.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-400 text-sm">🔍 Verify Official Links</div>
                  <p>Always verify that community links use legitimate, verified HTTPS platform addresses.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-400 text-sm">🚩 Report Bad Actors</div>
                  <p>If you discover an abusive group, submit a report so our team can remove it from Group Links.</p>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 not-prose">
              <h3 className="font-bold text-slate-100 text-lg">Need to Report a Dangerous Listing?</h3>
              <p className="text-sm text-slate-400">
                Our safety response team reviews all incoming reports within 24 hours.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/report"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  Report Community
                </Link>
                <Link
                  href="/contact"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Contact Trust & Safety
                </Link>
              </div>
            </section>

          </article>
        </div>
      </div>
      <Footer />
    </div>
  );
}
