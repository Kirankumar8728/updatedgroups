import React from 'react';
import Link from 'next/link';
import { Award, ShieldCheck, CheckCircle2, Flame, Eye, Scale } from 'lucide-react';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { Breadcrumbs } from '@/src/components/Breadcrumbs';
import { Footer } from '@/src/components/Footer';

export const metadata = buildPageMetadata({
  title: 'Editorial Standards & Community Ranking Criteria — Group Links',
  description:
    'Our editorial principles, anti-manipulation policy, ranking criteria, and standards for indexing social communities.',
  pathname: '/editorial-standards',
  keywords: ['editorial standards', 'directory ranking criteria', 'anti-manipulation policy', 'group curation standards'],
});

export default function EditorialStandardsPage() {
  const breadcrumbs = [{ name: 'Editorial Standards', url: '/editorial-standards' }];
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Editorial Standards', url: '/editorial-standards' },
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-3.5 h-3.5" />
              <span>Integrity & Quality</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Editorial Standards & Ranking Criteria
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Group Links is committed to editorial independence, objective curation, and transparent ranking. Learn how our editorial team maintains directory quality.
            </p>
          </header>

          <article className="prose prose-invert max-w-none space-y-8 text-slate-300">
            
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                Core Editorial Principles
              </h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  <strong>1. Accuracy Over Volume:</strong> We prioritize indexing active, functional communities with verified links over sheer volume of dead or spam links.
                </p>
                <p>
                  <strong>2. Zero Toleration for Astroturfing:</strong> Automated upvote bots, fake engagement spikes, or deceptive member count inflation result in immediate disqualification and permanent domain blacklisting.
                </p>
                <p>
                  <strong>3. Transparent Sponsorships:</strong> Sponsored or promoted listings are clearly labeled with distinct visual badges ("Sticky Promoted" or "Featured") and never disguised as organic editorial endorsements.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Flame className="w-5 h-5 text-emerald-400" />
                How Organic Rankings Are Computed
              </h2>
              <p className="text-sm leading-relaxed">
                Organic rankings (Trending, Popularity, Member Growth) are calculated through automated mathematical formulas based on authentic signals:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm">
                <li><strong>Verified Direct Joins:</strong> Distinct outbound clicks originating from real site visitors.</li>
                <li><strong>Unique User Upvotes:</strong> Capped at one vote per authenticated/fingerprinted visitor to prevent ballot stuffing.</li>
                <li><strong>Real-time Health:</strong> Link responsiveness during hourly background polling.</li>
                <li><strong>Verified Growth Rate:</strong> Percentage increase in community interest over trailing 7-day windows.</li>
              </ul>
            </section>

            <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 not-prose">
              <h3 className="font-bold text-slate-100 text-lg">Questions or Inquiries?</h3>
              <p className="text-sm text-slate-400">
                Contact our editorial board regarding ranking corrections or policy questions.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/contact"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                >
                  Contact Editorial Team
                </Link>
                <Link
                  href="/about"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  About Group Links
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
