import { permanentRedirect, notFound } from 'next/navigation';
import { resolveCountryFromSlug, countryToSlug } from '@/src/utils/helpers';

interface LegacyCountriesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyCountriesPage({ params }: LegacyCountriesPageProps) {
  const { slug } = await params;
  const country = resolveCountryFromSlug(slug);

  if (!country) {
    notFound();
  }

  const cleanSlug = countryToSlug(country);
  permanentRedirect(`/country/${cleanSlug}`);
}
