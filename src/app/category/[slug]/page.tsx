import { permanentRedirect, notFound } from 'next/navigation';
import { resolveCategoryFromSlug } from '@/src/lib/taxonomy';

interface LegacyCategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyCategoryPage({ params }: LegacyCategoryPageProps) {
  const { slug } = await params;
  const resolution = resolveCategoryFromSlug(slug);

  if (!resolution) {
    notFound();
  }

  permanentRedirect(`/categories/${resolution.category.slug}`);
}
