import { permanentRedirect, notFound } from 'next/navigation';
import { resolveLanguageFromSlug, languageToSlug } from '@/src/utils/helpers';

interface LegacyLanguagesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyLanguagesPage({ params }: LegacyLanguagesPageProps) {
  const { slug } = await params;
  const language = resolveLanguageFromSlug(slug);

  if (!language) {
    notFound();
  }

  const cleanSlug = languageToSlug(language);
  permanentRedirect(`/language/${cleanSlug}`);
}
