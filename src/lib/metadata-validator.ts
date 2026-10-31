import { Group } from '@/src/types';

/**
 * Validates whether a title string is an error page, login page, robot/security challenge,
 * blocked page, or generic platform placeholder.
 */
export function isInvalidOrBlockedTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  if (t.length < 2) return true;

  const blockedPatterns: RegExp[] = [
    // Auth & login
    /\b(log\s*in|sign\s*in|sign\s*up|create\s*an\s*account)\b/i,
    /log\s*in\s*to\s*facebook/i,
    /log\s*into\s*facebook/i,
    /facebook\s*-\s*log\s*in/i,
    /facebook\s*–\s*log\s*in/i,
    /iniciar\s*sesi[oó]n/i,
    /se\s*connecter/i,
    /anmelden/i,
    /meld\s*deg\s*p[åa]/i,

    // Bot, WAF & Security challenges
    /are\s*you\s*(a\s*)?robot/i,
    /are\s*you\s*(a\s*)?human/i,
    /just\s*a\s*moment/i,
    /attention\s*required/i,
    /security\s*check/i,
    /security\s*verification/i,
    /robot\s*verification/i,
    /human\s*verification/i,
    /access\s*denied/i,
    /cloudflare/i,
    /datadome/i,
    /captcha/i,
    /challenge-platform/i,
    /^blocked$/i,

    // Errors & Not found
    /404\s*not\s*found/i,
    /page\s*not\s*found/i,
    /content\s*not\s*found/i,
    /403\s*forbidden/i,
    /500\s*internal\s*server/i,
    /something\s*went\s*wrong/i,
    /site\s*maintenance/i,
    /bad\s*gateway/i,
    /service\s*unavailable/i,
    /error\s*404/i,

    // Platform generic root titles
    /^facebook$/i,
    /^facebook\s*groups$/i,
    /^reddit$/i,
    /^reddit\s*-\s*dive\s*into\s*anything$/i,
    /^discord$/i,
    /^telegram$/i,
    /^whatsapp$/i,
    /^redirecting/i,
  ];

  return blockedPatterns.some(pattern => pattern.test(t));
}

/**
 * Validates whether a description string is a login disclaimer, crawler error,
 * bot challenge notice, or generic platform slogan.
 */
export function isInvalidOrBlockedDescription(description: string | null | undefined): boolean {
  if (!description) return true;
  const d = description.trim().toLowerCase();
  if (d.length < 1) return true;

  const blockedPatterns: RegExp[] = [
    /log\s*in\s*or\s*sign\s*up\s*to\s*view/i,
    /log\s*in\s*to\s*facebook/i,
    /log\s*into\s*facebook/i,
    /facebook\s*helps\s*you\s*connect/i,
    /create\s*an\s*account\s*or\s*log\s*in/i,
    /are\s*you\s*(a\s*)?robot/i,
    /please\s*verify\s*that\s*you\s*are\s*not\s*a\s*robot/i,
    /security\s*check/i,
    /enable\s*cookies/i,
    /cloudflare/i,
    /datadome/i,
    /access\s*denied/i,
    /404\s*not\s*found/i,
    /page\s*not\s*found/i,
    /something\s*went\s*wrong/i,
  ];

  return blockedPatterns.some(pattern => pattern.test(d));
}

/**
 * Validates whether an image URL is a generic social icon, sprite, or site asset
 * rather than an authentic community banner or icon.
 */
export function isGenericOrInvalidImage(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return true;
  const u = imageUrl.trim().toLowerCase();
  return (
    u.includes('rsrc.php') ||
    u.includes('fb_icon') ||
    u.includes('fblogo') ||
    u.includes('static.xx.fbcdn.net') ||
    u.includes('facebook.com/images/') ||
    u.includes('redditstatic.com/shreddit/assets/favicon') ||
    u.includes('redditstatic.com/avatars/avatar_default') ||
    u.includes('reddit.com/favicon') ||
    u.includes('favicon.ico') ||
    u.includes('favicon.png') ||
    u.includes('192x192.png') ||
    u.endsWith('/null') ||
    u.endsWith('/undefined')
  );
}

/**
 * Sanitizes partial group updates to ensure existing valid metadata (title, description,
 * image, etc.) is NEVER overwritten by login pages, error pages, blocked scraper responses,
 * or generic error assets.
 * 
 * If isUserSubmission is true, explicit user-provided title, description, and images are
 * strictly respected and never deleted.
 */
export function sanitizeGroupUpdatesWithProtection(
  existing: Group,
  updates: Partial<Group>,
  isUserSubmission = false
): Partial<Group> {
  const protectedUpdates: Partial<Group> = { ...updates };

  // Explicit user submissions must never have their customized title or description stripped
  if (isUserSubmission) {
    return protectedUpdates;
  }

  // 1. Guard Title
  if (protectedUpdates.title !== undefined) {
    const rawTitle = String(protectedUpdates.title).trim();
    if (isInvalidOrBlockedTitle(rawTitle)) {
      if (existing.title && !isInvalidOrBlockedTitle(existing.title)) {
        console.warn(
          `[METADATA SHIELD] Blocked attempt to overwrite valid title "${existing.title}" with invalid/login title "${rawTitle}" for group ID: ${existing.id}`
        );
        delete protectedUpdates.title;
      }
    }
  }

  // 2. Guard Description
  if (protectedUpdates.description !== undefined) {
    const rawDesc = String(protectedUpdates.description).trim();
    if (isInvalidOrBlockedDescription(rawDesc)) {
      if (existing.description && !isInvalidOrBlockedDescription(existing.description)) {
        console.warn(
          `[METADATA SHIELD] Blocked attempt to overwrite valid description with invalid/login description for group ID: ${existing.id}`
        );
        delete protectedUpdates.description;
      }
    }
  }

  // 3. Guard Image URL
  if (protectedUpdates.imageUrl !== undefined) {
    const rawImg = String(protectedUpdates.imageUrl).trim();
    if (isGenericOrInvalidImage(rawImg)) {
      if (existing.imageUrl && !isGenericOrInvalidImage(existing.imageUrl)) {
        console.warn(
          `[METADATA SHIELD] Blocked attempt to overwrite valid image with generic/invalid asset for group ID: ${existing.id}`
        );
        delete protectedUpdates.imageUrl;
      }
    }
  }

  return protectedUpdates;
}
