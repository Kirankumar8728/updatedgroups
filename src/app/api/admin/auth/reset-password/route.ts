import { NextRequest, NextResponse } from 'next/server';
import { requestAdminPasswordResetServer, confirmAdminPasswordResetServer } from '@/src/lib/admin-auth';
import { checkRateLimit, rateLimitResponse } from '@/src/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limit: 4 requests per 15 minutes per IP
  const rateLimit = checkRateLimit(req, {
    keyPrefix: 'admin_reset_password',
    limit: 4,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, 'Too many password reset requests. Please wait before trying again.');
  }

  try {
    const body = await req.json();
    const { action, email, otp, newPassword } = body;

    // Action 1: Request reset OTP
    if (action === 'request' || (!otp && !newPassword)) {
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
      }

      const result = await requestAdminPasswordResetServer(email);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: result.message });
    }

    // Action 2: Confirm reset with OTP and set new password
    if (action === 'confirm' || (otp && newPassword)) {
      if (!email || !otp || !newPassword) {
        return NextResponse.json(
          { success: false, error: 'Email, verification code, and new password are required.' },
          { status: 400 }
        );
      }

      const result = confirmAdminPasswordResetServer(email, otp, newPassword);
      if (!result.success || !result.token) {
        return NextResponse.json({ success: false, error: result.error || 'Password reset failed.' }, { status: 400 });
      }

      const response = NextResponse.json({
        success: true,
        token: result.token,
        message: 'Password reset successfully. Admin session activated.',
      });

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
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Reset password failed.' }, { status: 500 });
  }
}
