import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateCanonicalUser, createSignedUserSession } from '@/src/lib/user-dal';

export const dynamic = 'force-dynamic';

/**
 * GET /auth/callback
 * Handles redirect from Google OAuth 2.0.
 * Exchanges authorization code for tokens, extracts real profile,
 * creates or updates the user in local server persistence, and sends a postMessage back to opener.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 1.5rem; text-align: center; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 1rem; padding: 2rem; max-width: 400px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            h2 { color: #f87171; margin-top: 0; }
            p { font-size: 0.875rem; color: #94a3b8; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Authentication Cancelled</h2>
            <p>${escapeHtml(error)}</p>
            <p style="font-size: 0.75rem; margin-top: 1.5rem;">This window will close automatically...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: ${JSON.stringify(error)} }, '*');
              }
            } catch(e) {}
            setTimeout(() => window.close(), 2500);
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  if (!code) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>Authentication Code Missing</title></head>
        <body style="font-family:sans-serif;background:#0f172a;color:#fff;text-align:center;padding:3rem;">
          <p>No authorization code received.</p>
          <script>setTimeout(() => window.close(), 2000);</script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  
  const registeredRedirectUri = 'https://grouplinks.app/auth/callback';
  
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const currentOrigin = host ? `${proto}://${host}` : 'https://grouplinks.app';
  const currentRedirectUri = `${currentOrigin}/auth/callback`;

  try {
    let tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: registeredRedirectUri,
        grant_type: 'authorization_code'
      })
    });

    let tokenData = await tokenRes.json();

    if (!tokenRes.ok && (tokenData.error === 'redirect_uri_mismatch' || tokenData.error_description?.includes('redirect_uri_mismatch')) && currentRedirectUri !== registeredRedirectUri) {
      tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: currentRedirectUri,
          grant_type: 'authorization_code'
        })
      });
      tokenData = await tokenRes.json();
    }

    if (!tokenRes.ok || !tokenData.id_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code for Google token.');
    }

    // Decode ID Token JWT payload
    const parts = tokenData.id_token.split('.');
    if (parts.length < 2) {
      throw new Error('Malformed Google ID token');
    }

    const payloadRaw = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadRaw);

    const sub = payload.sub;
    const email = payload.email ? String(payload.email).trim().toLowerCase() : '';
    const name = payload.name || (email ? email.split('@')[0] : 'Google User');
    const picture = payload.picture || '';

    if (!email) {
      throw new Error('Google did not return an email address.');
    }

    // Create or link user in local server persistence
    const outcome = await findOrCreateCanonicalUser({
      provider: 'google',
      providerId: sub,
      email: email,
      displayName: name,
      avatarUrl: picture || undefined
    });

    const user = outcome?.user || {
      id: sub,
      email,
      displayName: name,
      avatarUrl: picture,
      role: 'user',
      createdAt: new Date().toISOString(),
      creditsBalance: 10,
      provider: 'google',
    };
    const isNewUser = outcome?.isNewUser ?? false;

    const sessionToken = createSignedUserSession(user.id);

    const html = `<!DOCTYPE html>
    <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 1.5rem; text-align: center; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 1rem; padding: 2rem; max-width: 420px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .check { width: 48px; height: 48px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 24px; }
          h2 { color: #f8fafc; margin-top: 0; font-size: 1.25rem; }
          p { font-size: 0.875rem; color: #94a3b8; line-height: 1.5; }
          .email { color: #38bdf8; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="check">✓</div>
          <h2>Signed In with Google</h2>
          <p>Welcome, <span class="email">${escapeHtml(email)}</span>!</p>
          <p style="font-size: 0.75rem; margin-top: 1rem; color: #64748b;">Closing window and returning to GroupLinks...</p>
        </div>
        <script>
          try {
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                user: ${JSON.stringify(user)},
                token: ${JSON.stringify(sessionToken)},
                isNewUser: ${Boolean(isNewUser)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          } catch (e) {
            window.location.href = '/';
          }
        </script>
      </body>
    </html>`;

    const res = new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    res.cookies.set('gl_user_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });
    return res;
  } catch (err: any) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Google Sign-In Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 1.5rem; text-align: center; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 1rem; padding: 2rem; max-width: 440px; width: 100%; }
            h2 { color: #f87171; margin-top: 0; font-size: 1.25rem; }
            p { font-size: 0.875rem; color: #94a3b8; line-height: 1.5; word-break: break-word; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Authentication Failed</h2>
            <p>${escapeHtml(err.message || 'Could not authenticate with Google.')}</p>
            <p style="font-size: 0.75rem; margin-top: 1rem; color: #64748b;">Closing in a few seconds...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GOOGLE_AUTH_ERROR',
                  error: ${JSON.stringify(err.message || 'Google authentication failed')}
                }, '*');
              }
            } catch(e) {}
            setTimeout(() => window.close(), 3500);
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
