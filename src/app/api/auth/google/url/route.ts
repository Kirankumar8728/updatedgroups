import { NextRequest, NextResponse } from 'next/server';
import rawFirebaseConfig from '@/firebase-applet-config.json';
const firebaseConfig = (rawFirebaseConfig as any).default || rawFirebaseConfig;

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google/url
 * Returns the Google OAuth 2.0 authorization URL for popup-based authentication.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || (firebaseConfig as any).oAuthClientId;

  // Determine redirect URI: prioritize grouplinks.app or client origin
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const queryOrigin = req.nextUrl.searchParams.get('origin');
  
  let origin = 'https://grouplinks.app';
  if (host.includes('grouplinks.app')) {
    origin = 'https://grouplinks.app';
  } else if (queryOrigin && (queryOrigin.startsWith('http://') || queryOrigin.startsWith('https://'))) {
    origin = queryOrigin.replace(/\/+$/, '');
  } else if (process.env.NEXT_PUBLIC_SITE_URL) {
    origin = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  } else if (req.nextUrl.origin && !req.nextUrl.origin.includes('localhost:3000')) {
    origin = req.nextUrl.origin;
  }

  const redirectUri = `${origin}/auth/callback`;

  if (!clientId) {
    return NextResponse.json({
      success: false,
      configured: false,
      redirectUri,
      error: 'GOOGLE_CLIENT_ID is not configured in environment settings'
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.json({
    success: true,
    configured: true,
    url,
    redirectUri,
    clientId
  });
}
