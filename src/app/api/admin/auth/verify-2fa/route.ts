import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin2FAServer } from '@/src/lib/admin-auth';
import { checkRateLimit, rateLimitResponse } from '@/src/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per 15 minutes per IP
  const rateLimit = checkRateLimit(req, {
    keyPrefix: 'admin_login_2fa',
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, 'Too many 2FA verification attempts. Please wait before trying again.');
  }

  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Verification code is required.' },
        { status: 400 }
      );
    }

    const result = verifyAdmin2FAServer(code);
    if (!result.success || !result.token) {
      return NextResponse.json(
        { success: false, error: result.error || 'Invalid 2FA code.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      token: result.token,
      usedBackupCode: result.usedBackupCode,
      message: 'Admin session authenticated successfully.',
    });

    // Set secure HTTP-only cookies
    response.cookies.set('gl_admin_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    response.cookies.set('nexus_admin_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '2FA verification failed.' },
      { status: 500 }
    );
  }
}
