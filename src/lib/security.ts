import { NextRequest, NextResponse } from 'next/server';

/**
 * Security & Sanitization Utilities
 */

export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/javascript:/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onload=/gi, '')
    .trim();
}

export const sanitizeInput = sanitizeText;
export const sanitizeHtml = sanitizeText;

export function isValidInviteUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase();
    const validDomains = [
      'chat.whatsapp.com',
      'wa.me',
      't.me',
      'telegram.me',
      'discord.gg',
      'discord.com',
      'facebook.com',
      'fb.com',
      'signal.group',
      'snapchat.com',
      'reddit.com',
      'redd.it',
    ];
    return validDomains.some(d => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/**
 * Enforces Same-Origin verification on state-mutating requests (POST, PUT, DELETE, PATCH).
 * Extracts Origin or Referer and rejects cross-origin requests with HTTP 403 Forbidden.
 */
export function verifySameOrigin(req: NextRequest): { valid: boolean; response?: NextResponse } {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return { valid: true };
  }

  // Reject cross-site requests signaled by browser Sec-Fetch-Site header
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite === 'cross-site') {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: 'Cross-origin request blocked' },
        { status: 403 }
      ),
    };
  }

  const originHeader = req.headers.get('origin');
  const refererHeader = req.headers.get('referer');
  const source = originHeader || refererHeader;

  if (source) {
    try {
      const sourceUrl = new URL(source);
      const sourceHost = sourceUrl.host.toLowerCase();

      const hostHeader = (
        req.headers.get('x-forwarded-host') ||
        req.headers.get('host') ||
        req.nextUrl.host
      ).toLowerCase();
      const targetHost = hostHeader.split(',')[0].trim();

      const configuredSite = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
      let configuredHost = '';
      if (configuredSite) {
        try {
          configuredHost = new URL(configuredSite.startsWith('http') ? configuredSite : `https://${configuredSite}`).host.toLowerCase();
        } catch {}
      }

      const isMatch =
        sourceHost === targetHost ||
        (configuredHost && sourceHost === configuredHost) ||
        (sourceHost.includes('localhost') && targetHost.includes('localhost')) ||
        (sourceHost.endsWith('.run.app') && targetHost.endsWith('.run.app') && sourceHost === targetHost);

      if (!isMatch) {
        return {
          valid: false,
          response: NextResponse.json(
            { success: false, error: 'Cross-origin request blocked' },
            { status: 403 }
          ),
        };
      }
    } catch {
      return {
        valid: false,
        response: NextResponse.json(
          { success: false, error: 'Cross-origin request blocked' },
          { status: 403 }
        ),
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitizes file names received from client requests:
 * 1. Strips directory traversal sequences (.., /, \) and null bytes.
 * 2. Enforces allowed extensions whitelist (.json, .txt).
 */
export function sanitizeFileName(
  rawFileName: string,
  allowedExtensions: string[] = ['.json', '.txt'],
  fallbackName = 'export.json'
): string {
  if (!rawFileName || typeof rawFileName !== 'string') {
    return fallbackName;
  }

  // 1. Strip directory traversal sequences, slashes, backslashes, null bytes
  let clean = rawFileName
    .replace(/\0/g, '')
    .replace(/\\/g, '/')
    .split('/')
    .pop() || '';

  // Remove any remaining traversal dots sequences (e.g. ..)
  clean = clean.replace(/\.\.+/g, '');

  // Keep only safe characters: alphanumeric, dash, underscore, space, dot
  clean = clean.replace(/[^a-zA-Z0-9_\-\. ]/g, '').trim();

  if (!clean) {
    return fallbackName;
  }

  // 2. Validate and enforce whitelisted file extensions
  const hasAllowedExt = allowedExtensions.some(ext => clean.toLowerCase().endsWith(ext.toLowerCase()));
  if (!hasAllowedExt) {
    const defaultExt = allowedExtensions[0] || '.json';
    clean = `${clean.replace(/\.[a-zA-Z0-9]+$/, '')}${defaultExt}`;
  }

  return clean;
}

export function validateFileExtension(
  fileName: string,
  allowedExtensions: string[] = ['.json', '.txt']
): boolean {
  if (!fileName || typeof fileName !== 'string') return false;
  const lower = fileName.trim().toLowerCase();
  return allowedExtensions.some(ext => lower.endsWith(ext.toLowerCase()));
}

