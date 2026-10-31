import { Platform } from '../../types';

export function decodeHtmlEntitiesAndClean(text: string): string {
  if (!text) return '';
  return text
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCharCode(parseInt(code, 10));
      } catch {
        return '';
      }
    })
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseMemberCount(text?: string): number | null {
  if (!text || typeof text !== 'string') return null;
  // Strip non-breaking spaces, commas, and internal space digit separators
  let clean = text.replace(/\u00a0/g, ' ').replace(/,/g, '').trim();
  clean = clean.replace(/(\d)\s+(\d)/g, '$1$2').replace(/(\d)\s+(\d)/g, '$1$2');
  
  // Extract number and optional unit
  const match = clean.match(/([0-9]+(?:\.[0-9]+)?)\s*([kmb])?(?:\s+|$)/i);
  if (!match) return null;
  
  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;
  
  const unit = match[2]?.toLowerCase();
  let multiplier = 1;
  if (unit === 'b') multiplier = 1000000000;
  else if (unit === 'm') multiplier = 1000000;
  else if (unit === 'k') multiplier = 1000;
  
  return Math.round(num * multiplier);
}

export const STEALTH_USER_AGENTS = {
  whatsapp: [
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0',
    'WhatsApp/2.24.6.77 i',
  ],
  reddit: [
    'Twitterbot/1.0',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    'TelegramBot (like TwitterBot)',
  ],
  telegram: [
    'TelegramBot (like TwitterBot)',
    'Twitterbot/1.0',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ],
  general: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  ],
};

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
