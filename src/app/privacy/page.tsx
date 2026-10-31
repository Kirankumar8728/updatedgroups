import React from 'react';
import Link from 'next/link';
import { Lock, Shield, Eye, Database, Cookie } from 'lucide-react';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { Breadcrumbs } from '@/src/components/Breadcrumbs';
import { Footer } from '@/src/components/Footer';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy — Group Links Directory',
  description:
    'Read our Privacy Policy to understand how Group Links handles user data, cookies, analytics, and respects visitor privacy.',
  pathname: '/privacy',
  keywords: ['privacy policy', 'data collection policy', 'cookie statement', 'Group Links privacy'],
});

export default function PrivacyPage() {
  const breadcrumbs = [{ name: 'Privacy Policy', url: '/privacy' }];
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Privacy Policy', url: '/privacy' },
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
              <Lock className="w-3.5 h-3.5" />
              <span>Legal Document</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-sm text-slate-400">
              Last Revised: August 2026
            </p>
          </header>

          <article className="prose prose-invert max-w-none space-y-6 text-slate-300 text-sm leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100">1. Information We Collect</h2>
              <p>
                Group Links is designed as a public discovery platform. We do not require visitors to register an account or provide personal credentials to browse, search, or join indexed communities.
              </p>
              <p>
                When you submit a new group listing, we collect publicly accessible community metadata (e.g., group title, description, category, platform, and public invite link).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100">2. Cookies & Local Storage</h2>
              <p>
                We use browser <code className="text-slate-200">localStorage</code> to save your personal preferences locally (such as saved group bookmarks and search settings). These settings never leave your device and are not shared with third parties.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100">3. Third-Party Links & Advertising</h2>
              <p>
                Group Links contains links to third-party social messaging platforms (including WhatsApp, Telegram, Discord, Facebook, Signal, Snapchat, and Reddit). When clicking an invite link, you are redirected to the respective platform. We are not responsible for the privacy practices, content, or data collection policies of external services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100">4. Contacting Us Regarding Privacy</h2>
              <p>
                If you have questions regarding this policy, please reach out to <strong className="text-slate-100">support@grouplinks.app</strong>.
              </p>
            </section>
          </article>
        </div>
      </div>
      <Footer />
    </div>
  );
}
