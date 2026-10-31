import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory token bucket / sliding window store
const inMemoryStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of inMemoryStore.entries()) {
      if (now > record.resetTime) {
        inMemoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Detects all loopback, local, and private IPv4/IPv6 addresses.
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.trim().toLowerCase();
  
  if (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === 'localhost' ||
    clean === '::ffff:127.0.0.1' ||
    clean === '0.0.0.0' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    clean.startsWith('fc') ||
    clean.startsWith('fd') ||
    clean.startsWith('fe80')
  ) {
    return true;
  }

  if (clean.startsWith('172.')) {
    const parts = clean.split('.');
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) {
      return true;
    }
  }

  return false;
}

export function getClientIp(req: NextRequest): string {
  // Check standard proxy headers in order of preference
  const headerKeys = [
    'cf-connecting-ip',
    'true-client-ip',
    'x-real-ip',
    'x-client-ip',
    'x-cluster-client-ip',
  ];

  for (const key of headerKeys) {
    const val = req.headers.get(key);
    if (val && val.trim() && !isPrivateIp(val)) {
      return val.trim();
    }
  }

  // Check x-forwarded-for entries
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(Boolean);
    for (const ip of ips) {
      if (!isPrivateIp(ip)) {
        return ip;
      }
    }
  }

  // Fallback: When running behind a local reverse proxy like Hostinger LiteSpeed
  // where all forwarded IPs are loopback 127.0.0.1, build a compound browser fingerprint
  // based on User-Agent, Accept-Language, Sec-CH-UA, and client cookie (gl_fp_id).
  const ua = req.headers.get('user-agent') || 'unknown';
  const acceptLang = req.headers.get('accept-language') || 'en';
  const secChUa = req.headers.get('sec-ch-ua') || '';
  
  // Try extracting gl_fp_id cookie from request headers
  const cookieHeader = req.headers.get('cookie') || '';
  let cookieFp = '';
  const match = cookieHeader.match(/gl_fp_id=([^;]+)/);
  if (match && match[1]) {
    cookieFp = match[1].trim();
  }

  const compoundString = `${cookieFp}|${ua}|${acceptLang}|${secChUa}`;
  let hash = 0;
  for (let i = 0; i < compoundString.length; i++) {
    hash = ((hash << 5) - hash) + compoundString.charCodeAt(i);
    hash |= 0;
  }

  return `fp-${Math.abs(hash)}`;
}

export interface RateLimitOptions {
  limit: number;      // Maximum allowed requests
  windowMs: number;   // Time window in milliseconds
  keyPrefix?: string; // Optional namespace prefix
  route?: string;     // Alias for keyPrefix
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfterSeconds: number;
}

/**
 * Fast server in-memory rate limiter.
 */
export async function checkRateLimitAsync(
  req: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  return checkRateLimit(req, options);
}

/**
 * Synchronous in-memory rate limit check.
 */
export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): RateLimitResult {
  const ip = getClientIp(req);
  const prefix = options.route || options.keyPrefix || req.nextUrl.pathname;
  const storeKey = `${prefix}:${ip}`;
  const now = Date.now();

  let record = inMemoryStore.get(storeKey);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    inMemoryStore.set(storeKey, record);
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      resetTime: record.resetTime,
      retryAfterSeconds: 0,
    };
  }

  record.count += 1;
  const remaining = Math.max(0, options.limit - record.count);
  const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

  if (record.count > options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining,
    resetTime: record.resetTime,
    retryAfterSeconds: 0,
  };
}

export function rateLimitResponse(retryAfterSeconds: number, message?: string, limit: number = 60): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message || 'Too many requests. Please slow down and try again later.',
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'CDN-Cache-Control': 'no-store',
        'Surrogate-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store',
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + retryAfterSeconds),
      },
    }
  );
}
