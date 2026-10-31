import React from 'react';
import Link from 'next/link';
import { AlertCircle, ShieldAlert, CheckCircle2, Send, Mail, HelpCircle } from 'lucide-react';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { Breadcrumbs } from '@/src/components/Breadcrumbs';
import { Footer } from '@/src/components/Footer';

export const metadata = buildPageMetadata({
  title: 'Report Community Listing or Request Removal — Group Links',
  description:
    'Submit an abuse report, dead link notification, copyright claim (DMCA), or request removal of a community listing from Group Links directory.',
  pathname: '/report',
  keywords: ['report group', 'remove community listing', 'DMCA takedown notice', 'dead link report', 'safety violation'],
});

export default function ReportPage() {
  const breadcrumbs = [{ name: 'Report or Remove Listing', url: '/report' }];
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Report or Remove Listing', url: '/report' },
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Trust & Safety Takedown Gateway</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Report Community Listing or Request Removal
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              We take community integrity, safety, and copyright seriously. If a listing on Group Links violates our policies, contains an expired link, or infringes on intellectual property, submit a request below.
            </p>
          </header>

          <article className="prose prose-invert max-w-none space-y-8 text-slate-300">
            
            {/* Reasons for report */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                Valid Grounds for Listing Removal
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-rose-400 text-sm">Expired or Inactive Link</div>
                  <p>The invite URL has been revoked, expired, or leads to a deleted group.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-rose-400 text-sm">Spam, Phishing, or Fraud</div>
                  <p>The destination promotes financial scams, malware, or deceptive schemes.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-rose-400 text-sm">Owner Opt-Out Request</div>
                  <p>You are the verified group creator/admin and wish to unlist your community.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-rose-400 text-sm">Copyright / DMCA Notice</div>
                  <p>The listing uses copyrighted trademarks, imagery, or proprietary assets without authorization.</p>
                </div>
              </div>
            </section>

            {/* How to submit */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-400" />
                How to Submit a Removal or DMCA Request
              </h2>
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-3 text-sm">
                <p>
                  To request prompt investigation and removal, please email our Trust & Safety team directly:
                </p>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-emerald-400 text-xs sm:text-sm select-all">
                  support@grouplinks.app
                </div>
                <p className="text-xs text-slate-400">
                  Please include the listing URL (e.g., <code className="text-slate-300">https://grouplinks.app/group/[slug]</code>), reason for removal, and any supporting documentation.
                </p>
              </div>
            </section>

            {/* Turnaround Time */}
            <section className="space-y-2 text-sm text-slate-300">
              <h3 className="font-bold text-slate-100 text-base">Resolution Timeline</h3>
              <p>
                Urgent security and scam reports are prioritized with review completed within <strong>24 to 72 hours</strong>. Upon verification, the listing is permanently purged from search indexes and cache.
              </p>
            </section>

          </article>
        </div>
      </div>
      <Footer />
    </div>
  );
}
