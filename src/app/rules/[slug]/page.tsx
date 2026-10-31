import { notFound, redirect } from 'next/navigation';
import { getGroupBySlug } from '@/src/lib/groups-dal';
import { getGroupRulesPath } from '@/src/utils/helpers';
import { Group } from '@/src/types';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

const DB_TIMEOUT_MS = 2500; // Strict 2.5s DB timeout to prevent 504 Gateway Timeouts

/**
 * Handles backwards-compatible slug-based URLs like /rules/tg-anilsiriti
 * and redirects immediately to the canonical /rules?join-id={group.id}.
 * 
 * Safely guards against database stalls: if the lookup takes longer than 2.5s,
 * it immediately aborts and triggers notFound() rather than causing a 504.
 */
export default async function RulesSlugRedirect({ params }: RouteParams) {
  let group: Group | null = null;

  try {
    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug).trim();

    // Race database query against a strict 2.5s timeout promise
    const queryPromise = getGroupBySlug(cleanSlug);
    const timeoutPromise = new Promise<null>((resolve) => 
      setTimeout(() => resolve(null), DB_TIMEOUT_MS)
    );

    group = await Promise.race([queryPromise, timeoutPromise]);
  } catch {
    group = null;
  }
  
  if (!group) {
    notFound();
  }

  redirect(getGroupRulesPath(group));
}
