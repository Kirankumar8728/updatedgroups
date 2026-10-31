import { fetchWithBackoff, fetchMicrolinkFallback } from '../metadata-scraper';
import { getCommunityFallbackAvatar } from '../../utils/helpers';
import { isGenericGroupImage } from '../metadata-scraper';

export async function scrapeDiscordDirect(targetUrl: string): Promise<{
  title?: string;
  description?: string;
  imageUrl?: string;
  bannerUrl?: string;
  memberCount?: number;
  onlineCount?: number;
  isVerified?: boolean;
  rulesSummary?: string;
  isExpired?: boolean;
} | null> {
  const match = targetUrl.match(/(?:discord\.(?:gg|io|me|li|st)\/|discord\.com\/(?:invite|servers)\/|discordapp\.com\/invite\/|disboard\.org\/server\/(?:join\/)?)([a-zA-Z0-9_-]+)/i);
  if (!match || !match[1]) return null;

  let inviteCode = match[1].split('?')[0].split('#')[0].replace(/\/$/, '');
  if (!inviteCode) return null;

  try {
    const fetchRes = await fetchWithBackoff(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true&with_expiration=true`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
        Accept: 'application/json',
      },
      timeoutMs: 4500,
      maxRetries: 2,
      baseDelayMs: 450,
    });

    if (!fetchRes.ok || (fetchRes.json && (fetchRes.json.code === 10006 || fetchRes.json.message === 'Unknown Invite')) || (fetchRes.text && fetchRes.text.toLowerCase().includes('invite invalid'))) {
      return {
        title: 'Expired Discord Server',
        description: 'This invite link got expired add other active link',
        imageUrl: '',
        isExpired: true,
      };
    }

    if (fetchRes.ok && fetchRes.json && fetchRes.json.guild) {
      const data = fetchRes.json;
      const guild = data.guild;
      let rawTitle = (guild.name || '').trim();

      if (rawTitle.startsWith('/')) {
        const sub = rawTitle.substring(1).trim();
        rawTitle = sub ? sub.charAt(0).toUpperCase() + sub.slice(1) : inviteCode;
      }

      const title = rawTitle || `Discord Server (${inviteCode})`;
      const description = guild.description || (data.channel?.name ? `Official Discord community for #${data.channel.name}` : `Active Discord server community for ${title}.`);
      const memberCount = data.approximate_member_count || data.approximate_presence_count || 500;

      let imageUrl = '';
      if (guild.id && guild.icon) {
        imageUrl = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=256`;
      }

      let bannerUrl = '';
      if (guild.id && guild.banner) {
        bannerUrl = `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.webp?size=1024`;
      } else if (guild.id && guild.splash) {
        bannerUrl = `https://cdn.discordapp.com/splashes/${guild.id}/${guild.splash}.png?size=1024`;
      }

      const isVerified = Boolean(
        guild.features?.includes('VERIFIED') ||
        guild.features?.includes('PARTNERED') ||
        guild.verification_level > 2
      );

      let rulesSummary = '';
      if (isVerified) rulesSummary = '1. Verified Partnered Discord Community Server.';

      return {
        title,
        description,
        imageUrl,
        bannerUrl,
        memberCount,
        onlineCount: data.approximate_presence_count,
        isVerified,
        rulesSummary,
      };
    }
  } catch {
    // Discord API fallback
  }

  // Fallback 1: Try Microlink microservice
  try {
    const ml = await fetchMicrolinkFallback(targetUrl);
    if (ml && ml.title) {
      const defaultAvatar = getCommunityFallbackAvatar(ml.title, 'discord', inviteCode);
      return {
        title: ml.title,
        description: ml.description || `Official Discord community for ${ml.title}. Connect with members online.`,
        imageUrl: ml.imageUrl || defaultAvatar,
        bannerUrl: ml.imageUrl || defaultAvatar,
        memberCount: ml.memberCount || 350,
        isVerified: false,
      };
    }
  } catch {}

  // Fallback 2: Guaranteed safe Discord metadata fallback
  const defaultTitle = `Discord Server (${inviteCode})`;
  const defaultAvatar = getCommunityFallbackAvatar(defaultTitle, 'discord', inviteCode);
  return {
    title: defaultTitle,
    description: `Official Discord community server for ${defaultTitle}. Connect, chat, and participate with active members.`,
    imageUrl: defaultAvatar,
    bannerUrl: defaultAvatar,
    memberCount: 350,
    isVerified: false,
    rulesSummary: '1. Follow community server rules and Discord TOS.',
  };
}
