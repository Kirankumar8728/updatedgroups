import React from 'react';
import Link from 'next/link';
import { REGIONS, countryToSlug } from '@/src/utils/helpers';
import { getGroups } from '@/src/lib/groups-dal';
import { buildPageMetadata, generateCollectionPageJsonLd, generateBreadcrumbsJsonLd } from '@/src/lib/rank';
import { ArrowRight, Globe, Users, MapPin, Compass } from 'lucide-react';

export const metadata = buildPageMetadata({
  title: 'Explore Communities by Country & Region | WhatsApp, Telegram & Discord Groups',
  description:
    'Browse verified social communities by country and location. Discover local WhatsApp groups, Telegram channels, and Discord servers in India, United States, UK, Brazil, Germany, and globally.',
  pathname: '/countries',
  keywords: [
    'country group directory',
    'local WhatsApp groups',
    'regional Telegram channels',
    'country Discord servers',
    'communities by location',
  ],
});

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const COUNTRY_META: Record<string, { flag: string; description: string }> = {
  'Global': { flag: '🌐', description: 'Worldwide communities connecting members across borders and timezones.' },
  'India': { flag: '🇮🇳', description: 'Active Indian communities across tech, jobs, study, entertainment, and state groups.' },
  'United States': { flag: '🇺🇸', description: 'US-based gaming, software, college, business, and hobbyist communities.' },
  'United Kingdom': { flag: '🇬🇧', description: 'British community servers, London hubs, university groups, and sports chats.' },
  'Canada': { flag: '🇨🇦', description: 'Canadian student groups, regional city communities, and tech collectives.' },
  'Australia': { flag: '🇦🇺', description: 'Australian and Kiwi communities for gaming, city hangouts, and study.' },
  'Germany': { flag: '🇩🇪', description: 'German-speaking tech, gaming, career, and regional interest servers.' },
  'France': { flag: '🇫🇷', description: 'French communities across culture, cinema, programming, and gaming.' },
  'Brazil': { flag: '🇧🇷', description: 'Vibrant Brazilian WhatsApp and Discord communities, memes, and gaming.' },
  'Indonesia': { flag: '🇮🇩', description: 'Indonesian study groups, anime chats, gaming squads, and regional networks.' },
  'Italy': { flag: '🇮🇹', description: 'Italian cultural discussions, university chats, and hobby circles.' },
  'Spain': { flag: '🇪🇸', description: 'Spanish-speaking gaming clans, tech groups, and community forums.' },
  'Japan': { flag: '🇯🇵', description: 'Japanese language exchange, anime, tech, and creative hubs.' },
  'South Korea': { flag: '🇰🇷', description: 'Korean gaming, K-pop, language study, and tech interest servers.' },
  'Mexico': { flag: '🇲🇽', description: 'Mexican university groups, tech hubs, and local interest chats.' },
  'Africa': { flag: '🌍', description: 'Pan-African tech, entrepreneurship, university, and crypto communities.' },
  'Europe': { flag: '🇪🇺', description: 'Cross-European communities sharing languages, gaming, and lifestyle.' },
  'Asia Pacific': { flag: '🌏', description: 'Dynamic APAC regional groups connecting developers, gamers, and creators.' },
  'Middle East': { flag: '🌍', description: 'Middle Eastern cultural, business, and regional networking groups.' },
  'Latin America': { flag: '🌎', description: 'LATAM gaming, developer collectives, and vibrant social chats.' },
  'North America': { flag: '🌎', description: 'Continental North American professional, gaming, and creative networks.' },
  'South Asia': { flag: '🌏', description: 'South Asian study networks, developer groups, and community chats.' },
};

export default async function CountriesIndexPage() {
  const groupsResult = await getGroups({ limit: 1000 });
  const allGroups = groupsResult.groups;

  // Calculate group counts per country/region
  const regionCounts: Record<string, number> = {};
  for (const group of allGroups) {
    const reg = group.region || 'Global';
    regionCounts[reg] = (regionCounts[reg] || 0) + 1;
  }

  const collectionJsonLd = generateCollectionPageJsonLd(
    'Community Countries & Regional Directory',
    'Browse all verified social group directories by country and geographical region.',
    '/countries',
    allGroups.slice(0, 30)
  );

  const breadcrumbsJsonLd = generateBreadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Countries', url: '/countries' },
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
            <span className="text-slate-200 font-medium">Countries & Regions</span>
          </nav>

          {/* Header Section */}
          <header className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" />
              <span>Geographic Directory</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Explore Communities by Country & Region
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Find verified local WhatsApp groups, Telegram channels, Discord servers, and Signal groups active in your area or around the globe.
            </p>
          </header>

          {/* Countries Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Countries List">
            {REGIONS.map((region) => {
              const slug = countryToSlug(region);
              const count = regionCounts[region] || 0;
              const meta = COUNTRY_META[region] || { flag: '📍', description: `Explore active local communities and group chats in ${region}.` };

              return (
                <Link
                  key={region}
                  href={`/country/${slug}`}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-900 transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-emerald-950/20"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl leading-none select-none">{meta.flag}</span>
                        <h2 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {region}
                        </h2>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                        <Users className="w-3 h-3 text-emerald-400" />
                        <span>{count} {count === 1 ? 'group' : 'groups'}</span>
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                      {meta.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-emerald-400 font-medium">
                    <span>Browse {region} communities</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </section>

          {/* Platform Quick Links */}
          <section className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-6">
            <div className="flex items-center gap-3">
              <Compass className="w-5 h-5 text-emerald-400" />
              <h3 className="text-xl font-bold text-white">Explore by Platform</h3>
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
                  className="p-3 text-center rounded-xl bg-slate-800/60 hover:bg-emerald-600 hover:text-white border border-slate-700/50 text-slate-200 text-sm font-medium transition-all"
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
