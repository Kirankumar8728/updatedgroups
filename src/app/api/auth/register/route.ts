import { NextRequest, NextResponse } from 'next/server';
import { registerUserWithPassword, getUserByEmail, createMagicOtp, verifyMagicOtp } from '@/src/lib/user-dal';
import { sendOtpEmail } from '@/src/lib/email';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 10,
      windowMs: 60 * 1000,
      keyPrefix: 'auth_register',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many registration requests. Please wait a moment.', 10);
    }

    const body = await req.json();
    const { action, email, password, displayName, referralCode, otpCode } = body;

    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    // Step 1: Send Signup OTP
    if (action === 'send_otp') {
      const existingUser = await getUserByEmail(cleanEmail);
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'An account with this email address already exists. Please login instead.' },
          { status: 400 }
        );
      }

      if (!password || password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      const otpRes = await createMagicOtp(cleanEmail);
      const code = typeof otpRes === 'string' ? otpRes : (otpRes as any).otp || '123456';
      const emailResult = await sendOtpEmail({
        to: cleanEmail,
        code,
        type: 'register',
      });

      if (!emailResult.success && !emailResult.simulated) {
        return NextResponse.json(
          { success: false, error: emailResult.error || 'Failed to dispatch verification OTP. Please check email setup.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        otpSent: true,
        message: emailResult.simulated
          ? `Verification OTP generated for ${cleanEmail}. Check console or enter 6-digit code.`
          : `OTP verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
        provider: emailResult.provider,
      });
    }

    // Step 2: Verify OTP & Complete Registration
    if (action === 'verify_and_register') {
      if (!otpCode || String(otpCode).trim().length < 6) {
        return NextResponse.json(
          { success: false, error: 'Please enter the 6-digit OTP code sent to your email.' },
          { status: 400 }
        );
      }

      const otpResult = await verifyMagicOtp(cleanEmail, String(otpCode).trim());
      if (!otpResult.success) {
        return NextResponse.json(
          { success: false, error: (otpResult as any).error || 'Invalid or expired OTP code. Please check the 6-digit code or request a new one.' },
          { status: 400 }
        );
      }
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const outcome = await registerUserWithPassword({
      email: cleanEmail,
      password,
      displayName: displayName ? String(displayName).trim() : undefined,
      referralCode: referralCode ? String(referralCode).trim() : undefined,
    });

    const response = NextResponse.json({
      success: true,
      user: outcome.user,
      token: outcome.token,
      isNewUser: (outcome as any).isNewUser || true,
      message: 'Account created successfully! Welcome to GroupLinks.',
    });

    response.cookies.set('gl_user_session', outcome.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('[AUTH REGISTER API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed. Please try again.' },
      { status: 400 }
    );
  }
}
