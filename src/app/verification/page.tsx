import React from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Lock, Eye, HelpCircle } from 'lucide-react';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { Breadcrumbs } from '@/src/components/Breadcrumbs';
import { Footer } from '@/src/components/Footer';

export const metadata = buildPageMetadata({
  title: 'Verification Methodology & Safety Scoring — Group Links',
  description:
    'Detailed explanation of how Group Links verifies community invite links, evaluates group health, calculates safety scores, and detects inactive or fraudulent groups.',
  pathname: '/verification',
  keywords: ['group verification methodology', 'community safety score', 'link health check', 'verified group criteria'],
});

export default function VerificationPage() {
  const breadcrumbs = [{ name: 'Verification Methodology', url: '/verification' }];
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Verification Methodology', url: '/verification' },
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
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Transparency & Standards</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Community Verification & Safety Scoring Methodology
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Every community indexed on Group Links undergoes structured validation. Here is an open, transparent overview of our verification criteria, link health audits, and safety scoring calculation.
            </p>
          </header>

          <article className="prose prose-invert max-w-none space-y-8 text-slate-300">
            
            {/* Section 1: What Verified Means */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                What Does the "Verified" Badge Mean?
              </h2>
              <p className="leading-relaxed">
                A community listing that displays the green <strong className="text-emerald-400 font-semibold">Verified Badge</strong> has satisfied the following objective checks:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>
                  <strong>Valid Platform Domain:</strong> The invite URL matches the official domain format for its platform (e.g., <code className="text-slate-200">chat.whatsapp.com</code>, <code className="text-slate-200">t.me</code>, <code className="text-slate-200">discord.gg</code>, <code className="text-slate-200">signal.group</code>).
                </li>
                <li>
                  <strong>Active Invite Status:</strong> The invite link responds with HTTP 200/302 from the platform host without returning an "Invite Expired" or "Group Full" error.
                </li>
                <li>
                  <strong>Factual Metadata Match:</strong> The community title, avatar, and description accurately reflect the destination group rather than deceptive redirection.
                </li>
                <li>
                  <strong>Spam & Malware Filter:</strong> The destination has been checked against public threat databases and community blocklists.
                </li>
              </ul>
            </section>

            {/* Section 2: Safety Score Calculation */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
                How the Safety Score (0–100%) Is Calculated
              </h2>
              <p className="leading-relaxed">
                The Safety Score provides an objective composite evaluation of group credibility based on four verifiable pillars:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-emerald-400 font-bold text-sm">1. Link Authenticity (35%)</div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Evaluates HTTPS security, canonical domain origin, and lack of intermediate URL shorteners or obfuscated redirect chains.
                  </p>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-emerald-400 font-bold text-sm">2. Content & Keyword Safety (25%)</div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automated content scanning flags high-risk phishing keywords, fraudulent investment schemes, or prohibited goods.
                  </p>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-emerald-400 font-bold text-sm">3. Moderator Rules & Guidelines (20%)</div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Presence of explicit community guidelines, code of conduct, and visible moderation structures.
                  </p>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-emerald-400 font-bold text-sm">4. Community Health & Feedback (20%)</div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ratio of positive user upvotes vs abuse reports and dispute flags logged through our removal gateway.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: Periodic Re-checks & Revocation */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                Periodic Re-Verification & Revocation
              </h2>
              <p className="leading-relaxed">
                Verification is not a permanent status. If an invite link is reset by group administrators, deleted, reported for malicious behavior, or violates our directory guidelines, the verification status is automatically revoked and the listing is flagged or removed.
              </p>
            </section>

            {/* Reporting & Feedback Section */}
            <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 not-prose">
              <h3 className="font-bold text-slate-100 text-lg">Found an Inaccurate or Unsafe Listing?</h3>
              <p className="text-sm text-slate-400">
                Help us keep the directory safe. If you encounter an expired link, spam group, or misleading listing, submit a report immediately.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/report"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  Submit a Community Report
                </Link>
                <Link
                  href="/safety"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Read Safety Advice
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
