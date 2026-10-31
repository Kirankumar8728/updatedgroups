import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetOtp, resetUserPasswordWithOtp, verifyPasswordResetOtp } from '@/src/lib/user-dal';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, code, newPassword } = body;

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Request OTP for Password Reset
    if (action === 'request_otp') {
      const rateCheck = await checkRateLimitAsync(req, {
        limit: 5,
        windowMs: 5 * 60 * 1000,
        keyPrefix: 'auth_forgot_otp',
      });
      if (!rateCheck.allowed) {
        return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many reset requests. Please wait a few minutes before requesting another code.', 5);
      }

      const otpResult = await createPasswordResetOtp(cleanEmail);

      if (!otpResult.success) {
        return NextResponse.json(
          { success: false, error: (otpResult as any).error || 'Failed to dispatch reset code.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: otpResult.message || `A 6-digit reset code has been sent to ${cleanEmail}. Please check your inbox and spam folder.`,
        provider: otpResult.provider,
      });
    }

    // 2. Verify OTP only (optional check before entering new password)
    if (action === 'verify_otp') {
      if (!code || !code.trim()) {
        return NextResponse.json(
          { success: false, error: 'Please enter the 6-digit verification code.' },
          { status: 400 }
        );
      }

      const verifyCheck = await verifyPasswordResetOtp(cleanEmail, code.trim());
      if (!verifyCheck.success) {
        return NextResponse.json(
          { success: false, error: (verifyCheck as any).error || 'Invalid or expired verification code.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Verification code confirmed. Please set your new password.',
      });
    }

    // 3. Verify OTP & Reset Password
    if (action === 'verify_and_reset') {
      if (!code || !code.trim()) {
        return NextResponse.json(
          { success: false, error: 'Please enter the 6-digit verification code sent to your email.' },
          { status: 400 }
        );
      }

      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      const resetOutcome = await resetUserPasswordWithOtp(cleanEmail, code.trim(), newPassword);

      if (!resetOutcome.success || !resetOutcome.user || !resetOutcome.token) {
        return NextResponse.json(
          { success: false, error: (resetOutcome as any).error || 'Password reset failed. Please check the code and try again.' },
          { status: 400 }
        );
      }

      const response = NextResponse.json({
        success: true,
        user: resetOutcome.user,
        token: resetOutcome.token,
        message: 'Your password has been successfully updated! You are now signed in.',
      });

      response.cookies.set('gl_user_session', resetOutcome.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified. Supported actions: request_otp, verify_and_reset' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[AUTH FORGOT PASSWORD API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred during password reset.' },
      { status: 500 }
    );
  }
}
