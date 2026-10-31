import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Users, Globe, Sparkles, CheckCircle2, Award, Zap, HeartHandshake } from 'lucide-react';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { Breadcrumbs } from '@/src/components/Breadcrumbs';
import { Header } from '@/src/components/Header';
import { Footer } from '@/src/components/Footer';

export const metadata = buildPageMetadata({
  title: 'About Group Links Directory — Curated Social Community Hub',
  description:
    'Learn about Group Links, our mission to index and verify WhatsApp groups, Telegram channels, Discord servers, Signal chats, and Reddit communities safely.',
  pathname: '/about',
  keywords: ['about Group Links', 'social group directory', 'verified community directory'],
});

export default function AboutPage() {
  const breadcrumbs = [{ name: 'About Group Links', url: '/about' }];
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'About Group Links', url: '/about' },
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
              <Sparkles className="w-3.5 h-3.5" />
              <span>Independent Community Index</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              About Group Links Directory
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Group Links is a community discovery platform designed to help people find genuine, active, and verified groups across WhatsApp, Telegram, Discord, Signal, Facebook, Snapchat, and Reddit.
            </p>
          </header>

          <article className="prose prose-invert max-w-none space-y-8 text-slate-300">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                Our Mission
              </h2>
              <p className="leading-relaxed">
                Finding high-quality social communities online has traditionally been fraught with dead links, spam groups, and misleading member counts. Group Links was founded to solve this problem by providing a transparent, categorized, and continuously validated index of online communities.
              </p>
              <p className="leading-relaxed">
                We believe that niche communities foster friendship, learning, career growth, and collaboration. Our goal is to connect individuals with like-minded peers while maintaining rigorous safety standards.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
                How We Operate
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose">
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">1</div>
                  <h3 className="font-bold text-slate-100">Automated Health Checks</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Our indexing engine tests invite link accessibility to remove expired or revoked group links.
                  </p>
                </div>

                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">2</div>
                  <h3 className="font-bold text-slate-100">Editorial Review</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Submissions are screened against safety policies to filter out fraudulent schemes, spam, and malicious behavior.
                  </p>
                </div>

                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">3</div>
                  <h3 className="font-bold text-slate-100">Transparent Scoring</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    We clearly document how safety scores, popularity metrics, and trending rankings are computed.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-amber-400" />
                Editorial Independence
              </h2>
              <p className="leading-relaxed">
                Group Links is an independent directory. Listings cannot pay for artificially inflated review scores, fabricated member counts, or deceptive verification badges. Sponsored or promoted listings are always visibly marked with distinct badges to ensure complete transparency for our users.
              </p>
            </section>

            <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 not-prose">
              <h3 className="font-bold text-slate-100 text-lg">Explore Group Links</h3>
              <p className="text-sm text-slate-400">
                Ready to find your next community or index your own group?
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                >
                  Browse All Communities
                </Link>
                <Link
                  href="/verification"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Read Verification Methodology
                </Link>
                <Link
                  href="/submit-group"
                  prefetch={false}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Submit a Group
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
