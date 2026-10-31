import { NextResponse, type NextRequest } from 'next/server';

/**
 * Global Edge Security & Subdomain Routing Middleware
 * - Enforces CSRF / Same-Origin protections on mutative requests.
 * - Manages subdomain isolation for adult.grouplinks.app:
 *   1. Rewrites root requests on adult.grouplinks.app to /adult-groups.
 *   2. Redirects adult paths from grouplinks.app to adult.grouplinks.app.
 * - Applies strict security response headers across all routes.
 */

const CSRF_EXEMPT_PATHS = [
  '/api/cashfree/webhook',
  '/api/cron/',
  '/api/ping',
];

const ADULT_PATHS = [
  '/adult-groups',
  '/categories/adult',
  '/category/adult',
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const method = req.method.toUpperCase();

  const hostHeader = (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    req.nextUrl.host
  ).toLowerCase().split(',')[0].trim();

  // Detect adult subdomain via Host header or explicit query param for testing
  const isAdultSubdomain = 
    hostHeader.startsWith('adult.') || 
    hostHeader.includes('adult.grouplinks.app') ||
    req.nextUrl.searchParams.get('subdomain') === 'adult';

  const requestHeaders = new Headers(req.headers);
  if (isAdultSubdomain) {
    requestHeaders.set('x-adult-subdomain', 'true');
  }

  // 1. Subdomain Isolation Logic
  if (isAdultSubdomain) {
    // Root `/` on adult.grouplinks.app serves adult group listings directly
    if (pathname === '/') {
      const url = req.nextUrl.clone();
      url.pathname = '/adult-groups';
      const rewriteRes = NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
      rewriteRes.headers.set('X-Content-Type-Options', 'nosniff');
      rewriteRes.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      rewriteRes.headers.set('X-Adult-Subdomain', 'true');
      return rewriteRes;
    }
  } else {
    // Main domain (grouplinks.app): redirect direct adult visits to adult.grouplinks.app
    const isAdultPath = ADULT_PATHS.some(p => pathname.startsWith(p));
    if (isAdultPath) {
      const targetHost = 'adult.grouplinks.app';
      if (!hostHeader.includes('localhost') && !hostHeader.endsWith('.run.app')) {
        return NextResponse.redirect(`https://${targetHost}${pathname}${search}`, 301);
      }
    }
  }

  // 2. CSRF Protection for state-mutating requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const isExempt = CSRF_EXEMPT_PATHS.some(path => pathname.startsWith(path));

    if (!isExempt) {
      const secFetchSite = req.headers.get('sec-fetch-site');
      if (secFetchSite && secFetchSite === 'cross-site') {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Cross-site request blocked by CSRF policy.' },
          { status: 403 }
        );
      }

      const origin = req.headers.get('origin');
      const referer = req.headers.get('referer');
      const source = origin || referer;

      if (source) {
        try {
          const sourceHost = new URL(source).host.toLowerCase();

          const isLocalhost = sourceHost.includes('localhost') && hostHeader.includes('localhost');
          const isRunApp = sourceHost.endsWith('.run.app') && hostHeader.endsWith('.run.app');
          const isSubdomainMatch = sourceHost.includes('grouplinks.app') && hostHeader.includes('grouplinks.app');
          const isHostMatch = sourceHost === hostHeader;

          if (!isHostMatch && !isLocalhost && !isRunApp && !isSubdomainMatch) {
            return NextResponse.json(
              { success: false, error: 'Forbidden: Request origin does not match target host.' },
              { status: 403 }
            );
          }
        } catch {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Malformed request origin.' },
            { status: 403 }
          );
        }
      }
    }
  }

  // 3. Set strict security response headers and subdomain signal
  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isAdultSubdomain) {
    res.headers.set('X-Adult-Subdomain', 'true');
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.*\\.xml|robots\\.txt).*)',
  ],
};

