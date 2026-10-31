import React from 'react';
import Link from 'next/link';
import { LANGUAGES, languageToSlug } from '@/src/utils/helpers';
import { getGroups } from '@/src/lib/groups-dal';
import { buildPageMetadata, generateCollectionPageJsonLd, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { ArrowRight, Languages as LanguagesIcon, Users, Compass, Globe } from 'lucide-react';

export const metadata = buildPageMetadata({
  title: 'Explore Communities by Language | WhatsApp, Telegram & Discord Groups',
  description:
    'Browse social communities and chat groups by spoken language. Discover active WhatsApp groups, Telegram channels, and Discord servers in English, Hindi, Spanish, Arabic, French, and more.',
  pathname: '/languages',
  keywords: [
    'language group directory',
    'Hindi WhatsApp groups',
    'Spanish Telegram channels',
    'English Discord servers',
    'multilingual chat communities',
  ],
});

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const LANGUAGE_NATIVE_NAMES: Record<string, string> = {
  'All / Multilingual': 'Multilingual (Global)',
  'English': 'English',
  'Hindi': 'हिन्दी (Hindi)',
  'Spanish': 'Español (Spanish)',
  'French': 'Français (French)',
  'German': 'Deutsch (German)',
  'Portuguese': 'Português (Portuguese)',
  'Russian': 'Русский (Russian)',
  'Arabic': 'العربية (Arabic)',
  'Indonesian': 'Bahasa Indonesia',
  'Japanese': '日本語 (Japanese)',
  'Korean': '한국어 (Korean)',
  'Italian': 'Italiano (Italian)',
  'Turkish': 'Türkçe (Turkish)',
  'Chinese': '中文 (Chinese)',
  'Vietnamese': 'Tiếng Việt (Vietnamese)',
  'Polish': 'Polski (Polish)',
  'Dutch': 'Nederlands (Dutch)',
  'Telugu': 'తెలుగు (Telugu)',
  'Tamil': 'தமிழ் (Tamil)',
  'Marathi': 'मराठी (Marathi)',
  'Bengali': 'বাংলা (Bengali)',
  'Gujarati': 'ગુજરાતી (Gujarati)',
  'Kannada': 'ಕನ್ನಡ (Kannada)',
  'Malayalam': 'മലയാളം (Malayalam)',
  'Punjabi': 'ਪੰਜਾਬੀ (Punjabi)',
  'Urdu': 'اردو (Urdu)',
  'Odia': 'ଓଡ଼ିଆ (Odia)',
  'Assamese': 'অসমীয়া (Assamese)',
};

export default async function LanguagesIndexPage() {
  const groupsResult = await getGroups({ limit: 1000 });
  const allGroups = groupsResult.groups;

  // Calculate group counts per language
  const languageCounts: Record<string, number> = {};
  for (const group of allGroups) {
    const lang = group.language || 'English';
    languageCounts[lang] = (languageCounts[lang] || 0) + 1;
  }

  const collectionJsonLd = generateCollectionPageJsonLd(
    'Community Languages Directory',
    'Browse all verified social group directories by spoken language.',
    '/languages',
    allGroups.slice(0, 30)
  );

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Languages', url: '/languages' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Languages</span>
          </nav>

          {/* Header Section */}
          <header className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <LanguagesIcon className="w-3.5 h-3.5" />
              <span>Language Directory</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Explore Communities by Language
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Connect with fellow native speakers or practice new languages in verified WhatsApp, Telegram, Discord, and Signal chat groups.
            </p>
          </header>

          {/* Languages Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Languages List">
            {LANGUAGES.map((lang) => {
              const slug = languageToSlug(lang);
              const count = languageCounts[lang] || 0;
              const nativeName = LANGUAGE_NATIVE_NAMES[lang] || lang;

              return (
                <Link
                  key={lang}
                  href={`/language/${slug}`}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-indigo-950/20"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {lang}
                        </h2>
                        <span className="text-xs text-slate-400 font-medium block mt-0.5">
                          {nativeName}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                        <Users className="w-3 h-3 text-indigo-400" />
                        <span>{count} {count === 1 ? 'group' : 'groups'}</span>
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                      Discover verified {lang}-speaking communities, study circles, and discussion groups.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-indigo-400 font-medium">
                    <span>Browse {lang} groups</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </section>

          {/* Platform Discovery Quick Links */}
          <section className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-6">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xl font-bold text-white">Browse by Platform</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { name: 'WhatsApp Groups', href: '/whatsapp-groups' },
                { name: 'Telegram Channels', href: '/telegram-channels' },
                { name: 'Discord Servers', href: '/discord-servers' },
                { name: 'Reddit Communities', href: '/reddit-communities' },
                { name: 'Signal Groups', href: '/signal-groups' },
                { name: 'Facebook Groups', href: '/facebook-groups' },
              ].map((hub) => (
                <Link
                  key={hub.href}
                  href={hub.href}
                  className="p-3 text-center rounded-xl bg-slate-800/60 hover:bg-indigo-600 hover:text-white border border-slate-700/50 text-slate-200 text-sm font-medium transition-all"
                >
                  {hub.name}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
