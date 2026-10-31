import React from 'react';
import Link from 'next/link';
import { Mail, MessageSquare, Clock, Globe, ShieldCheck, Send } from 'lucide-react';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { Breadcrumbs } from '@/src/components/Breadcrumbs';
import { Footer } from '@/src/components/Footer';

export const metadata = buildPageMetadata({
  title: 'Contact Support & Inquiries — Group Links',
  description:
    'Get in touch with the Group Links team for community verification inquiries, listing assistance, advertising partnerships, or technical support.',
  pathname: '/contact',
  keywords: ['contact Group Links', 'community directory support', 'advertising inquiry', 'group listing help'],
});

export default function ContactPage() {
  const breadcrumbs = [{ name: 'Contact Support', url: '/contact' }];
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Contact Support', url: '/contact' },
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
              <Mail className="w-3.5 h-3.5" />
              <span>Get in Touch</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Contact Group Links Team
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Have questions about community verification, sponsored promotions, editorial standards, or need assistance? We are here to help.
            </p>
          </header>

          <article className="prose prose-invert max-w-none space-y-8 text-slate-300">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose">
              
              {/* General Inquiries */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">General & User Support</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  For general questions, account help, and feedback regarding the directory.
                </p>
                <div className="pt-2 font-mono text-xs text-emerald-400">
                  support@grouplinks.app
                </div>
              </div>

              {/* Advertising & Partnerships */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">Advertising & Promotion</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  For sponsored placements, sticky promotions, and custom ad campaigns.
                </p>
                <div className="pt-2 font-mono text-xs text-indigo-400">
                  support@grouplinks.app
                </div>
              </div>

              {/* Trust & Safety */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">Trust, Safety & DMCA</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  For urgent security reports, copyright claims, and community removals.
                </p>
                <div className="pt-2 font-mono text-xs text-rose-400">
                  support@grouplinks.app
                </div>
              </div>

              {/* Response Time */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">Response SLA</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Our operational hours are Monday through Friday, 09:00 - 18:00 UTC. Typical email response time is within 24 business hours.
                </p>
                <div className="pt-2 text-xs font-semibold text-amber-400">
                  Average Response: &lt; 24h
                </div>
              </div>

            </div>

          </article>
        </div>
      </div>
      <Footer />
    </div>
  );
}
