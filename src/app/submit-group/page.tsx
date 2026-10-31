import React from 'react';
import { SubmitGroupView } from '@/src/components/SubmitGroupView';
import { buildPageMetadata } from '@/src/lib/rank';

export const metadata = buildPageMetadata({
  title: 'Submit Your Community Group — Get Discovered by Thousands',
  description:
    'Promote your WhatsApp, Telegram, Discord, or Signal group. Submit your invite link to get indexed, verified, and reach active members worldwide.',
  pathname: '/submit-group',
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SubmitGroupPage() {
  return <SubmitGroupView />;
}
