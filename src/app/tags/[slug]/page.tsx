import { permanentRedirect, notFound } from 'next/navigation';
import { resolveTagFromSlug, tagToSlug } from '@/src/utils/helpers';

interface LegacyTagsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyTagsPage({ params }: LegacyTagsPageProps) {
  const { slug } = await params;
  const tagName = resolveTagFromSlug(slug);

  if (!tagName) {
    notFound();
  }

  const cleanSlug = tagToSlug(tagName);
  permanentRedirect(`/tag/${cleanSlug}`);
}
