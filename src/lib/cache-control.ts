/**
 * Cache control headers tailored for high-performance Next.js + CDN / Hostinger / Cloudflare deployments.
 * Ensures real-time mutations (upvotes, clicks, submissions, rankings) bypass edge and browser caches,
 * while allowing static assets to be cached efficiently.
 */

// Headers for real-time endpoints that should NEVER be cached by any CDN or browser
export const REALTIME_NO_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
  'CDN-Cache-Control': 'no-store',
  'Surrogate-Control': 'no-store',
  'Cloudflare-CDN-Cache-Control': 'no-store',
  'X-Accel-Expires': '0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Vary': 'Accept-Encoding, Authorization, Cookie',
};

// Headers for dynamic SSR pages that should revalidate frequently
export const DYNAMIC_SSR_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=10, stale-while-revalidate=59',
  'Vary': 'Accept-Encoding',
};

// Headers for static and immutable assets
export const STATIC_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'Vary': 'Accept-Encoding',
};
