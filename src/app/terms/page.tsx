import React from 'react';
import Link from 'next/link';
import { FileText, Shield, AlertTriangle } from 'lucide-react';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { Breadcrumbs } from '@/src/components/Breadcrumbs';
import { Footer } from '@/src/components/Footer';

export const metadata = buildPageMetadata({
  title: 'Terms of Service — Group Links Directory',
  description:
    'Terms of Service and user agreement governing access to and use of the Group Links community directory platform.',
  pathname: '/terms',
  keywords: ['terms of service', 'user agreement', 'community directory terms'],
});

export default function TermsPage() {
  const breadcrumbs = [{ name: 'Terms of Service', url: '/terms' }];
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Terms of Service', url: '/terms' },
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-3.5 h-3.5" />
              <span>User Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Terms of Service
            </h1>
            <p className="text-sm text-slate-400">
              Effective Date: August 2026
            </p>
          </header>

          <article className="prose prose-invert max-w-none space-y-6 text-slate-300 text-sm leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Group Links ("the Service"), you agree to comply with and be bound by these Terms of Service. If you do not agree with these terms, please discontinue using the platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100">2. Directory Nature & Disclaimer</h2>
              <p>
                Group Links is an independent indexing search engine and directory for publicly accessible community invite links. Group Links does not own, moderate, operate, or control any external WhatsApp, Telegram, Signal, Facebook groups, Discord servers, or Reddit communities listed on the platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100">3. Prohibited Conduct</h2>
              <p>
                Users agree not to submit fraudulent invite links, engage in automated scraping without authorization, flood vote mechanisms, or submit content promoting illegal activities, hate speech, or malicious software.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-100">4. Listing Modifications & Removal</h2>
              <p>
                Group Links reserves the right to unlist, reject, or modify any community listing that violates safety standards or community guidelines at its sole discretion without prior notice.
              </p>
            </section>
          </article>
        </div>
      </div>
      <Footer />
    </div>
  );
}
