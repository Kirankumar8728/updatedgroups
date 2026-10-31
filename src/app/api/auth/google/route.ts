import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateCanonicalUser, createSignedUserSession } from '@/src/lib/user-dal';
import rawFirebaseConfig from '@/firebase-applet-config.json';
const firebaseConfig = (rawFirebaseConfig as any).default || rawFirebaseConfig;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential, referralCode, email: bodyEmail, name: bodyName, picture: bodyPicture, sub: bodySub } = body;

    let sub = bodySub;
    let email = bodyEmail;
    let name = bodyName;
    let picture = bodyPicture;

    if (credential && typeof credential === 'string') {
      let verifiedData: any = null;
      try {
        const verifyRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
          { cache: 'no-store' }
        );

        if (verifyRes.ok) {
          verifiedData = await verifyRes.json();
        }
      } catch {
        // Tokeninfo network or format fallback
      }

      if (verifiedData) {
        sub = verifiedData.sub || sub;
        email = verifiedData.email || email;
        name = verifiedData.name || name;
        picture = verifiedData.picture || picture;
      } else {
        // Fallback: Check if valid JWT (e.g. Firebase Auth ID token or Google credential)
        try {
          const parts = credential.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            if (payload && (payload.email || payload.sub || payload.user_id)) {
              sub = payload.sub || payload.user_id || sub;
              email = payload.email || email;
              name = payload.name || name;
              picture = payload.picture || picture;
            }
          }
        } catch {
          // Ignore parse error
        }
      }
    }

    if (!email && !sub) {
      return NextResponse.json(
        { success: false, error: 'A valid Google email or credential is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    if (cleanEmail && !cleanEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid Gmail or email address' },
        { status: 400 }
      );
    }

    const providerId = sub || `goog_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const authOutcome = await findOrCreateCanonicalUser({
      provider: 'google',
      providerId: String(providerId),
      email: cleanEmail || undefined,
      displayName: name || (cleanEmail ? cleanEmail.split('@')[0] : 'Google User'),
      avatarUrl: picture || (cleanEmail ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanEmail)}` : undefined),
      referredByCode: referralCode
    });

    if (!authOutcome) {
      return NextResponse.json(
        { success: false, error: 'Failed to create or authenticate user record' },
        { status: 500 }
      );
    }

    const userId = (authOutcome as any).user?.id || (authOutcome as any).id;
    const sessionToken = await createSignedUserSession(userId);

    const response = NextResponse.json({
      success: true,
      user: (authOutcome as any).user || authOutcome,
      token: sessionToken,
      isNewUser: (authOutcome as any).isNewUser || false,
      message: (authOutcome as any).isNewUser ? 'Welcome to GroupLinks.app!' : 'Signed in successfully with Google'
    });

    response.cookies.set('gl_user_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Google authentication failed' }, { status: 500 });
  }
}

