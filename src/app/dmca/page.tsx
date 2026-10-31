import React from 'react';
import Link from 'next/link';
import { ShieldAlert, FileText, CheckCircle2, Mail, Send, HelpCircle, ArrowLeft, Shield } from 'lucide-react';
import { buildPageMetadata, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { Breadcrumbs } from '@/src/components/Breadcrumbs';
import { Footer } from '@/src/components/Footer';
import { DmcaForm } from '@/src/components/DmcaForm';

export const metadata = buildPageMetadata({
  title: 'DMCA Copyright Removal Request & Takedown Policy — Group Links',
  description:
    'Submit a DMCA copyright removal notice or request immediate takedown of copyrighted images or listings from the Group Links directory.',
  pathname: '/dmca',
  keywords: ['DMCA removal', 'copyright takedown', 'remove image', 'DMCA policy', 'report infringement'],
});

export default function DmcaPage() {
  const breadcrumbs = [{ name: 'DMCA Takedown & Copyright Removal', url: '/dmca' }];
  const breadcrumbJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'DMCA Takedown & Copyright Removal', url: '/dmca' },
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
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>DMCA Copyright Notice & Removal Protocol</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              DMCA Copyright Removal Request
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Group Links respects the intellectual property rights of content creators and copyright owners. All group icons and preview thumbnails are processed as 150x150 compressed transformational thumbnails under Fair Use (17 U.S.C. § 107). If you believe your copyrighted image or brand asset is displayed without authorization, submit a notice below or email us directly at <a href="mailto:dmca@grouplinks.app" className="text-amber-400 font-bold underline hover:text-amber-300">dmca@grouplinks.app</a> for immediate removal within 24 hours.
            </p>
          </header>

          {/* Direct DMCA Email Notice */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/80 text-indigo-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/80 text-indigo-400 flex items-center justify-center border border-indigo-700 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Direct DMCA & Copyright Contact</div>
              <div className="text-xs text-indigo-300">
                For any DMCA compliance or copyright issues, please send a message directly to our Copyright Agent at <a href="mailto:dmca@grouplinks.app" className="underline font-bold text-indigo-200 hover:text-white">dmca@grouplinks.app</a>.
              </div>
            </div>
          </div>

          <article className="prose prose-invert max-w-none space-y-8 text-slate-300">
            
            {/* Fair Use & Thumbnail Safeguard Statement */}
            <section className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2 m-0">
                <Shield className="w-5 h-5 text-amber-400 shrink-0" />
                Fair Use & Thumbnail Processing Safeguards
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                As a web catalog directory, Group Links automatically resizes and compresses public group preview thumbnails to a non-commercial, heavily compressed <strong>150x150 WebP format</strong>. This transformational preview serves purely as a visual indicator to help users identify public communities on WhatsApp, Telegram, Discord, and Signal.
              </p>
            </section>

            {/* DMCA Requirements */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Required DMCA Takedown Notice Elements
              </h2>
              <p className="text-sm text-slate-300">
                In accordance with the Digital Millennium Copyright Act (17 U.S.C. § 512(c)), your removal notice must include the following information:
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc pl-5">
                <li>Identification of the copyrighted work claimed to have been infringed (or link to original asset).</li>
                <li>Exact Group Links URL (`https://.../group/...`) or Group ID where the infringing image or listing is located.</li>
                <li>Your full legal name, company name (if applicable), and contact email address.</li>
                <li>A statement that you have a good faith belief that the use of the material is not authorized by the copyright owner, its agent, or the law.</li>
                <li>A statement made under penalty of perjury that the information in the notification is accurate and that you are authorized to act on behalf of the owner.</li>
              </ul>
            </section>

            {/* Interactive DMCA Form */}
            <section className="pt-2">
              <DmcaForm />
            </section>

          </article>
        </div>
      </div>
      <Footer />
    </div>
  );
}
