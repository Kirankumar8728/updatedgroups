import { Group } from '@/src/types';
import { getGroupsDatabase, persistCurrentGroups } from '@/src/lib/groups-store';

export interface LinkHealthResult {
  groupId: string;
  url: string;
  isActive: boolean;
  status: 'active' | 'revoked' | 'expired' | 'dead' | 'unverified';
  statusCode?: number;
  reason?: string;
  checkedAt: string;
}

/**
 * Pings a single group's invite URL to determine if it is active, expired, or revoked.
 */
export async function checkGroupLinkHealth(group: Group): Promise<LinkHealthResult> {
  const now = new Date().toISOString();
  const url = (group.url || '').trim();

  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return {
      groupId: group.id,
      url,
      isActive: false,
      status: 'dead',
      reason: 'Invalid or missing HTTP/HTTPS protocol',
      checkedAt: now,
    };
  }

  try {
    // Specialized mobile deep links & client-side apps that return 404/redirect to headless bots:
    if (
      url.includes('signal.group') ||
      url.includes('snapchat.com/t/') ||
      url.includes('matrix.to') ||
      url.includes('facebook.com/groups/')
    ) {
      return {
        groupId: group.id,
        url,
        isActive: true,
        status: 'active',
        statusCode: 200,
        checkedAt: now,
      };
    }

    // Specialized Discord invite validation
    if (url.includes('discord.gg/') || url.includes('discord.com/invite/')) {
      const match = url.match(/(?:discord\.(?:gg|io|me|li)\/|discord\.com\/invite\/|discordapp\.com\/invite\/)([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        try {
          const dController = new AbortController();
          const dTimeout = setTimeout(() => dController.abort(), 4000);
          const dRes = await fetch(`https://discord.com/api/v10/invites/${match[1]}?with_counts=true`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
              Accept: 'application/json',
            },
            signal: dController.signal,
          });
          clearTimeout(dTimeout);

          if (dRes.status === 404 || dRes.status === 410) {
            return {
              groupId: group.id,
              url,
              isActive: false,
              status: 'expired',
              statusCode: dRes.status,
              reason: 'Discord invite code has expired or is invalid',
              checkedAt: now,
            };
          }
          if (dRes.ok) {
            return {
              groupId: group.id,
              url,
              isActive: true,
              status: 'active',
              statusCode: 200,
              checkedAt: now,
            };
          }
        } catch {
          // Fallback to standard check
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const stealthUserAgents = [
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Twitterbot/1.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    ];

    const headers: Record<string, string> = {
      'User-Agent': stealthUserAgents[Math.floor(Math.random() * stealthUserAgents.length)],
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    };

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    // HTTP 429 Rate Limited: indicates upstream host/CDN is live and active
    if (res.status === 429) {
      return {
        groupId: group.id,
        url,
        isActive: true,
        status: 'active',
        statusCode: 429,
        reason: 'Rate limited by upstream host (link assumed active)',
        checkedAt: now,
      };
    }

    // 404, 410, 500+ usually indicate dead/removed links
    if (res.status === 404 || res.status === 410) {
      return {
        groupId: group.id,
        url,
        isActive: false,
        status: 'expired',
        statusCode: res.status,
        reason: `HTTP ${res.status} Not Found / Gone`,
        checkedAt: now,
      };
    }

    if (!res.ok && res.status >= 500) {
      // Server error might be temporary, but if persistent mark unverified
      return {
        groupId: group.id,
        url,
        isActive: true, // Grace period for server errors
        status: 'active',
        statusCode: res.status,
        reason: `Server returned status ${res.status}`,
        checkedAt: now,
      };
    }

    const html = await res.text().catch(() => '');
    const lowerHtml = html.toLowerCase();

    // Check Telegram revoked/expired indicators
    if (url.includes('t.me/') || url.includes('telegram.me/')) {
      if (
        lowerHtml.includes('the invite link has expired') ||
        lowerHtml.includes('this link has expired') ||
        lowerHtml.includes('channel does not exist') ||
        lowerHtml.includes('no channel with this link') ||
        lowerHtml.includes('this user does not exist')
      ) {
        return {
          groupId: group.id,
          url,
          isActive: false,
          status: 'expired',
          statusCode: res.status,
          reason: 'Telegram invite has expired or channel does not exist',
          checkedAt: now,
        };
      }
    }

    // Check WhatsApp revoked/invalid indicators
    if (url.includes('chat.whatsapp.com/')) {
      if (
        lowerHtml.includes("this invite link was revoked") ||
        lowerHtml.includes("link has been revoked") ||
        lowerHtml.includes("couldn't find this group") ||
        lowerHtml.includes("this link was reset") ||
        lowerHtml.includes("reset invite link") ||
        lowerHtml.includes("this invite link is no longer valid") ||
        lowerHtml.includes("you can't join this group because this invite link was reset")
      ) {
        return {
          groupId: group.id,
          url,
          isActive: false,
          status: 'revoked',
          statusCode: res.status,
          reason: 'WhatsApp invite link was revoked, reset, or is invalid generic page',
          checkedAt: now,
        };
      }
    }

    // Check Discord invalid invite indicators
    if (url.includes('discord.gg/') || url.includes('discord.com/invite/')) {
      if (
        lowerHtml.includes('invite invalid') ||
        lowerHtml.includes('unknown invite') ||
        lowerHtml.includes('this invite may be expired') ||
        lowerHtml.includes('the invite link is invalid or has expired')
      ) {
        return {
          groupId: group.id,
          url,
          isActive: false,
          status: 'expired',
          statusCode: res.status,
          reason: 'Discord invite code is invalid or has expired',
          checkedAt: now,
        };
      }
    }

    // Check Reddit banned/private subreddit indicators
    if (url.includes('reddit.com/r/')) {
      if (
        lowerHtml.includes("we couldn't find that community") ||
        lowerHtml.includes('community not found') ||
        lowerHtml.includes('community has been banned') ||
        lowerHtml.includes('this community is private')
      ) {
        return {
          groupId: group.id,
          url,
          isActive: false,
          status: 'revoked',
          statusCode: res.status,
          reason: 'Reddit community was not found, banned, or set to private',
          checkedAt: now,
        };
      }
    }

    return {
      groupId: group.id,
      url,
      isActive: true,
      status: 'active',
      statusCode: res.status,
      checkedAt: now,
    };
  } catch (err: any) {
    // Network timeouts / bot protection can happen
    return {
      groupId: group.id,
      url,
      isActive: true, // Do not prematurely deactivate on simple network timeouts
      status: 'active',
      reason: err.message || 'Network check timeout',
      checkedAt: now,
    };
  }
}

/**
 * Runs the link health checker across all groups (or batch) and updates database state.
 */
export async function runBatchLinkHealthCheck(limit: number = 50): Promise<{
  totalChecked: number;
  activeCount: number;
  inactiveCount: number;
  results: LinkHealthResult[];
}> {
  const db = getGroupsDatabase();
  const targetGroups = db.slice(0, limit);
  const results: LinkHealthResult[] = [];

  let activeCount = 0;
  let inactiveCount = 0;

  for (const group of targetGroups) {
    const result = await checkGroupLinkHealth(group);
    results.push(result);

    // Update group health state in database
    group.isActive = result.isActive;
    group.is_active = result.isActive;
    group.healthStatus = result.status;
    group.lastHealthCheckedAt = result.checkedAt;
    if (!result.isActive) {
      group.isExpired = true;
      group.expiredReason = result.reason || 'Invite link is expired or invalid.';
    } else {
      group.isExpired = false;
      group.expiredReason = undefined;
    }

    if (result.isActive) {
      activeCount++;
    } else {
      inactiveCount++;
    }
  }

  persistCurrentGroups();

  return {
    totalChecked: targetGroups.length,
    activeCount,
    inactiveCount,
    results,
  };
}
