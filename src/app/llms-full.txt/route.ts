import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/src/lib/rank';
import { CATEGORIES, categoryToSlug, getGroupUrlPath } from '@/src/utils/helpers';
import { getGroups } from '@/src/lib/groups-dal';

export const revalidate = 3600;

export async function GET() {
  const baseUrl = getSiteUrl();
  const { groups } = await getGroups({ limit: 100 });

  const groupsList = groups.map((g) => {
    const canonical = `${baseUrl}${getGroupUrlPath(g)}`;
    return `### ${g.title}
- Platform: ${g.platform}
- Category: ${g.category}
- Language: ${g.language}
- Region: ${g.region}
- Published Date: ${g.publishedAt || g.createdAt}
- Submitted By: ${g.authorName || 'Anonymous Visitor'}
- Verified: ${g.verified ? 'Yes' : 'No'}
- Description: ${g.description}
- Directory Link: ${canonical}
`;
  }).join('\n');

  const content = `# Group Links Directory — Full Knowledge Base (llms-full.txt)
> Comprehensive directory index and community database for AI agents and search engines.

## Overview
Group Links is an open social directory indexing verified group chats, community servers, broadcast channels, and forums across WhatsApp, Telegram, Discord, Signal, Facebook, Snapchat, and Reddit.

## Editorial & Safety Policy
1. No unauthorized financial scams, phishing schemes, or unsolicited spam groups.
2. Verified checkmarks are assigned exclusively to groups passing automated uptime tests and link validation.
3. Groups can be reported at ${baseUrl}/report for immediate review by human moderators.

## Platform Directories
- WhatsApp: ${baseUrl}/whatsapp-groups
- Telegram: ${baseUrl}/telegram-groups
- Discord: ${baseUrl}/discord-servers
- Signal: ${baseUrl}/signal-groups
- Facebook: ${baseUrl}/facebook-groups
- Reddit: ${baseUrl}/reddit-communities
- Snapchat: ${baseUrl}/snapchat-groups

## Top Categories
${CATEGORIES.map(c => `- ${c}: ${baseUrl}/category/${categoryToSlug(c)}`).join('\n')}

## Curated Community Listings
${groupsList}
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
