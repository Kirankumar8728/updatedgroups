import React from 'react';
import Link from 'next/link';
import { FileText, CheckCircle2, XCircle, Sparkles, PlusCircle } from 'lucide-react';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { Breadcrumbs } from '@/src/components/Breadcrumbs';
import { Footer } from '@/src/components/Footer';

export const metadata = buildPageMetadata({
  title: 'Community Submission Guidelines — Group Links',
  description:
    'Rules and criteria for indexing your WhatsApp group, Telegram channel, Discord server, or Signal group on the Group Links directory.',
  pathname: '/guidelines',
  keywords: ['group submission guidelines', 'index WhatsApp group', 'submit Discord server', 'community directory listing criteria'],
});

export default function GuidelinesPage() {
  const breadcrumbs = [{ name: 'Submission Guidelines', url: '/guidelines' }];
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Submission Guidelines', url: '/guidelines' },
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileText className="w-3.5 h-3.5" />
              <span>Community Submission Standard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Community Submission & Indexing Guidelines
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              We welcome submissions from group owners, moderators, and active participants. To keep Group Links high-quality and safe, all submissions must meet these guidelines.
            </p>
          </header>

          <article className="prose prose-invert max-w-none space-y-8 text-slate-300">
            
            {/* Accepted criteria */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                What We Accept
              </h2>
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2 text-sm">
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li><strong>Active Invite Links:</strong> Links that allow new users to join without infinite redirects or paywalls.</li>
                  <li><strong>Accurate Categorization:</strong> Appropriate selection of category, language, and primary region.</li>
                  <li><strong>Clear Descriptions:</strong> Factual descriptions detailing group purpose, rules, and discussion focus.</li>
                  <li><strong>Supported Platforms:</strong> WhatsApp, Telegram, Discord, Facebook, Signal, Snapchat, and Reddit.</li>
                </ul>
              </div>
            </section>

            {/* Prohibited criteria */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                Strictly Prohibited Content
              </h2>
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-rose-900/30 space-y-2 text-sm text-slate-300">
                <p>Submissions containing any of the following will be rejected and blacklisted immediately:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-rose-200">
                  <li>Financial fraud, ponzi schemes, guaranteed crypto doubling, or unauthorized gambling.</li>
                  <li>Phishing pages, credential harvesting, malware downloads, or hacked account sales.</li>
                  <li>Harassment, hate speech, violent extremism, or non-consensual content.</li>
                  <li>Deceptive redirection through ad-shorteners or interstitial landing screens.</li>
                </ul>
              </div>
            </section>

            {/* Adult Policy */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100">
                Adult & 18+ Communities
              </h2>
              <p className="leading-relaxed text-sm">
                Adult (18+) communities must be explicitly categorized as <code className="text-slate-200">Adult / 18+</code> and flagged as NSFW upon submission. Adult groups are strictly gated behind age confirmations and excluded from child-safe ad feeds.
              </p>
            </section>

            {/* Ready to Submit */}
            <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 not-prose">
              <h3 className="font-bold text-slate-100 text-lg">Ready to Index Your Community?</h3>
              <p className="text-sm text-slate-400">
                Standard indexing is 100% free and takes less than two minutes.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/submit-group"
                  prefetch={false}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Submit Community Now</span>
                </Link>
                <Link
                  href="/verification"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Review Verification Steps
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
