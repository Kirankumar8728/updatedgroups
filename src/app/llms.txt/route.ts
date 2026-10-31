import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/src/lib/rank';
import { CATEGORIES, categoryToSlug } from '@/src/utils/helpers';
import { getGroups } from '@/src/lib/groups-dal';

export const revalidate = 3600;

export async function GET() {
  const baseUrl = getSiteUrl();
  const { groups } = await getGroups({ limit: 1000 });
  const totalCount = groups.length;

  const content = `# Group Links Directory (llms.txt)
> Authoritative public directory and search index for active, verified WhatsApp groups, Telegram channels, Discord servers, Signal groups, Facebook groups, Snapchat networks, and Reddit communities.

## Platform Overview
Group Links is a curated, high-performance global directory indexing ${totalCount}+ online communities across 18+ categories and 10+ languages. All invite links undergo automated validation checking for link availability, member capacity, anti-spam adherence, and safety standards.

### Supported Platforms & URL Formats
- **WhatsApp Groups**: \`https://chat.whatsapp.com/...\`
- **Telegram Channels & Supergroups**: \`https://t.me/...\`
- **Discord Servers**: \`https://discord.gg/...\` or \`https://discord.com/invite/...\`
- **Signal Groups**: \`https://signal.group/#...\`
- **Facebook Groups**: \`https://facebook.com/groups/...\`
- **Reddit Communities**: \`https://reddit.com/r/...\`
- **Snapchat Groups**: \`https://snapchat.com/t/...\` or \`https://invite.snapchat.com/...\`

## Platform Hubs & Dedicated Directory Links
- [WhatsApp Groups](${baseUrl}/whatsapp-groups): Verified WhatsApp group invite links covering technology, education, jobs, business, and regional hobbies.
- [Telegram Channels & Discussion Groups](${baseUrl}/telegram-channels): Active Telegram broadcast channels, discussion supergroups, and utility bots.
- [Discord Servers](${baseUrl}/discord-servers): Gaming guilds, developer hubs, anime forums, and student study lounges.
- [Signal Groups](${baseUrl}/signal-groups): Privacy-first end-to-end encrypted group chats and secure community rooms.
- [Facebook Groups](${baseUrl}/facebook-groups): Public community discussion groups and local interest circles.
- [Reddit Communities](${baseUrl}/reddit-communities): Subreddits and focused community forums.
- [Snapchat Groups](${baseUrl}/snapchat-groups): Social snap chat networks and streak groups.
- [24-Hour Trending Communities](${baseUrl}/active24hours): Live real-time community rankings and viral upvoted groups.

## Directory Categories
${CATEGORIES.filter(c => c !== 'Adult / 18+').map(c => `- [${c} Groups](${baseUrl}/category/${categoryToSlug(c)}): Curated ${c.toLowerCase()} group invite links, verified communities, and active discussions.`).join('\n')}

## Community Submission Guidelines
Group creators and community administrators can submit their group invite links for free public indexing via [Submit Group](${baseUrl}/submit-group).

### Submission Criteria & Rules:
1. **Valid Invite URL**: Must be a functional, non-expired direct HTTP/HTTPS invite link matching a supported platform.
2. **Accurate Metadata**: Group title, description, category, and regional tags must accurately describe the community content.
3. **Safety & Compliance**: Groups promoting malware, scams, hate speech, non-consensual content, or illegal activities are immediately rejected and blacklisted.
4. **Active Moderation**: Groups must maintain active community moderation against unsolicited spam and automated bot attacks.
5. **Fast Indexing**: Submissions that pass automated health checks are indexed immediately into the public directory.

## Trust, Safety & Editorial Standards
- [Verification Standards](${baseUrl}/verification): Multi-step automated and manual link validation process.
- [Safety & Privacy Guidelines](${baseUrl}/safety): Account protection, fraud avoidance, and safety tips when joining online groups.
- [Editorial Standards](${baseUrl}/editorial-standards): Content moderation criteria and spam prevention policies.
- [Community Rules & Terms](${baseUrl}/guidelines): Directory participation requirements and admin code of conduct.
- [Report & Takedown Request](${baseUrl}/report): Abuse and broken link reporting mechanism for instant listing removals.

## Search, Discovery & Machine-Readable Feeds
- **Web Search Interface**: \`${baseUrl}/?q={query}\`
- **Sitemap Index**: \`${baseUrl}/sitemap.xml\`
- **Full LLM Context & Dataset**: \`${baseUrl}/llms-full.txt\`
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
