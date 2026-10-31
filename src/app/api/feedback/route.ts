import { NextRequest, NextResponse } from 'next/server';
import { sendGroupFeedbackEmail, SendGroupFeedbackEmailParams } from '@/src/lib/email';
import { reportGroup, getGroupById } from '@/src/lib/groups-dal';
import { sanitizeInput } from '@/src/lib/security';
import { checkRateLimit } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting: Max 10 feedback submissions per minute per IP
    const rateLimit = checkRateLimit(req, {
      limit: 10,
      windowMs: 60 * 1000,
      route: 'feedback-submission',
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many feedback requests. Please wait a minute before submitting again.' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
          },
        }
      );
    }

    // 2. Parse and sanitize payload
    const body = await req.json().catch(() => ({}));
    const message = sanitizeInput(body.message || '');
    const feedbackType = body.feedbackType || 'broken_link';
    const groupId = body.groupId ? sanitizeInput(body.groupId) : undefined;
    const userEmail = body.userEmail ? sanitizeInput(body.userEmail) : undefined;
    const pageUrl = body.pageUrl ? sanitizeInput(body.pageUrl) : undefined;

    if (!message || message.trim().length < 3) {
      return NextResponse.json(
        { error: 'Please provide a descriptive message explaining the issue or suggestion.' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
          },
        }
      );
    }

    // 3. Resolve group metadata if groupId provided
    let groupTitle = body.groupTitle ? sanitizeInput(body.groupTitle) : undefined;
    let groupUrl = body.groupUrl ? sanitizeInput(body.groupUrl) : undefined;
    let groupPlatform = body.groupPlatform ? sanitizeInput(body.groupPlatform) : undefined;
    let category = body.category ? sanitizeInput(body.category) : undefined;

    if (groupId) {
      const dbGroup = await getGroupById(groupId);
      if (dbGroup) {
        groupTitle = dbGroup.title;
        groupUrl = dbGroup.url;
        groupPlatform = dbGroup.platform;
        category = dbGroup.category;

        // If it is a broken link or spam report, increment the internal report count
        if (['broken_link', 'expired_invite', 'spam_or_abuse', 'inaccurate_info'].includes(feedbackType)) {
          await reportGroup(groupId, feedbackType, message);
        }
      }
    }

    // 4. Client IP & User Agent for fraud / spam protection
    const userIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'Unknown';

    // 5. Dispatch email to Administrator
    const emailParams: SendGroupFeedbackEmailParams = {
      groupId,
      groupTitle,
      groupUrl,
      groupPlatform,
      category,
      feedbackType: feedbackType as SendGroupFeedbackEmailParams['feedbackType'],
      message,
      userEmail,
      userIp,
      pageUrl,
    };

    const dispatchResult = await sendGroupFeedbackEmail(emailParams);

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback submitted successfully. Our administrative team has been notified.',
        delivered: dispatchResult.success,
        provider: dispatchResult.provider,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('[Feedback API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process feedback submission.' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
        },
      }
    );
  }
}
