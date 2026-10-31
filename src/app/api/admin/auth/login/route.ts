import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPrimaryCredentialsServer, sendAdminLoginOtpServer, ADMIN_TOTP_SECRET, ADMIN_EMAIL } from '@/src/lib/admin-auth';
import { checkRateLimit, rateLimitResponse } from '@/src/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limit: 8 attempts per 15 minutes per IP
  const rateLimit = checkRateLimit(req, {
    keyPrefix: 'admin_login_primary',
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, 'Too many login attempts. Please wait before trying again.');
  }

  try {
    const body = await req.json();
    const { usernameOrEmail, password } = body;

    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { success: false, error: 'Username/Email and password are required.' },
        { status: 400 }
      );
    }

    const result = verifyAdminPrimaryCredentialsServer(usernameOrEmail, password);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Invalid credentials.' },
        { status: 401 }
      );
    }

    // Default to email_otp if Google Authenticator TOTP is not configured
    const twoFactorMethod = ADMIN_TOTP_SECRET ? 'authenticator' : 'email_otp';

    let otpDispatched = false;
    let dispatchMsg = '';
    if (twoFactorMethod === 'email_otp') {
      const otpSendResult = await sendAdminLoginOtpServer();
      otpDispatched = otpSendResult.success;
      dispatchMsg = otpSendResult.message;
    }

    return NextResponse.json({
      success: true,
      requires2FA: result.requires2FA,
      twoFactorMethod,
      otpDispatched,
      message: dispatchMsg || (twoFactorMethod === 'email_otp' 
        ? `Primary credentials verified. A 6-digit verification code has been sent to ${ADMIN_EMAIL}.`
        : 'Primary credentials verified. Please enter 2FA verification code.'),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed.' },
      { status: 500 }
    );
  }
}
