import { NextRequest, NextResponse } from 'next/server';
import { sendAdminLoginOtpServer } from '@/src/lib/admin-auth';
import { checkRateLimit, rateLimitResponse } from '@/src/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limit: 3 requests per 5 minutes per IP
  const rateLimit = checkRateLimit(req, {
    keyPrefix: 'admin_send_otp',
    limit: 3,
    windowMs: 5 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, 'Too many OTP requests. Please wait before requesting another code.');
  }

  try {
    const result = await sendAdminLoginOtpServer();
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to dispatch email verification code.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error dispatching OTP.' },
      { status: 500 }
    );
  }
}
