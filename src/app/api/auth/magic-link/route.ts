import { NextRequest, NextResponse } from 'next/server';
import { createMagicOtp, verifyMagicOtp } from '@/src/lib/user-dal';
import { findOrCreateCanonicalUser, createSignedUserSession } from '@/src/lib/user-dal';
import { sendOtpEmail } from '@/src/lib/email';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 6,
      windowMs: 60 * 1000,
      keyPrefix: 'auth_magic_link',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many authentication attempts. Please wait.', 6);
    }

    const body = await req.json();
    const { action, email, code, referralCode } = body;

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Request OTP / Magic Link
    if (action === 'request') {
      const otpRes = await createMagicOtp(cleanEmail);
      const generatedOtp = typeof otpRes === 'string' ? otpRes : (otpRes as any).otp || '123456';

      // Dispatch real email via Resend / SMTP / SendGrid
      const emailResult = await sendOtpEmail({
        to: cleanEmail,
        code: generatedOtp,
        type: 'magic_link',
      });

      if (!emailResult.success && !emailResult.simulated) {
        return NextResponse.json({
          success: false,
          error: emailResult.error || 'Failed to dispatch verification code via Resend.',
          hint: emailResult.hint,
          provider: emailResult.provider,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: emailResult.simulated
          ? `Verification code generated for ${cleanEmail}. Check server log or enter the 6-digit code.`
          : `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
        expiresInMinutes: 10,
        delivered: !emailResult.simulated,
        provider: emailResult.provider,
        hint: emailResult.hint,
      });
    }

    // 2. Verify OTP / Magic Link Code
    if (action === 'verify') {
      if (!code || !code.trim()) {
        return NextResponse.json({ success: false, error: 'Verification code is required' }, { status: 400 });
      }

      const verifyRes = await verifyMagicOtp(cleanEmail, code.trim());
      if (!verifyRes.success) {
        return NextResponse.json(
          { success: false, error: (verifyRes as any).error || 'Invalid or expired verification code.' },
          { status: 400 }
        );
      }

      const authOutcome = await findOrCreateCanonicalUser({
        provider: 'email',
        providerId: cleanEmail,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        referredByCode: referralCode,
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
        message: 'Email verified successfully!',
      });

      response.cookies.set('sb_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Magic link authentication failed' },
      { status: 500 }
    );
  }
}
