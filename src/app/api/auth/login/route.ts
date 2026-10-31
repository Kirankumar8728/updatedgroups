import { NextRequest, NextResponse } from 'next/server';
import { loginUserWithPassword } from '@/src/lib/user-dal';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 10,
      windowMs: 60 * 1000,
      keyPrefix: 'auth_login',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many login attempts. Please wait a moment before trying again.', 10);
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Please enter your password.' },
        { status: 400 }
      );
    }

    const result = await loginUserWithPassword(email.trim().toLowerCase(), password);

    if (!result.success || !result.user || !result.token) {
      return NextResponse.json(
        { 
          success: false, 
          error: (result as any).error || 'Invalid credentials.',
          isGoogleAccount: (result as any).isGoogleAccount,
          notRegistered: (result as any).notRegistered,
          isIncorrectPassword: (result as any).isIncorrectPassword,
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
      message: 'Signed in successfully!',
    });

    response.cookies.set('gl_user_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('[AUTH LOGIN API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
