import { notFound, redirect } from 'next/navigation';
import { getGroupBySlug, getGroupById } from '@/src/lib/groups-dal';
import { getGroupRulesPath } from '@/src/utils/helpers';

export default async function BotRulesRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = (await getGroupBySlug(slug)) || (await getGroupById(slug));
  if (!group) {
    notFound();
  }
  redirect(getGroupRulesPath(group));
}
