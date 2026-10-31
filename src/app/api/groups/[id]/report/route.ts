import { NextRequest, NextResponse } from 'next/server';
import { reportGroup, getGroupById } from '@/src/lib/groups-dal';
import { sanitizeInput } from '@/src/lib/security';
import { sendGroupFeedbackEmail } from '@/src/lib/email';
import { checkRateLimit } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const rateLimit = checkRateLimit(req, {
      limit: 10,
      windowMs: 60 * 1000,
      route: 'group-report',
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many reports submitted. Please wait a moment.' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
          },
        }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = sanitizeInput(body.reason || 'User report');
    const customMessage = body.customMessage || body.message ? sanitizeInput(body.customMessage || body.message) : '';
    const userEmail = body.userEmail ? sanitizeInput(body.userEmail) : undefined;

    const result = await reportGroup(id, reason, customMessage);
    if (!result) {
      return NextResponse.json(
        { error: 'Group not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
          },
        }
      );
    }

    const dbGroup = await getGroupById(id);
    const userIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'Unknown';

    // Map reason to feedback type
    let feedbackType: 'broken_link' | 'expired_invite' | 'inaccurate_info' | 'spam_or_abuse' | 'other' = 'other';
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('not working') || lowerReason.includes('broken')) {
      feedbackType = 'broken_link';
    } else if (lowerReason.includes('full') || lowerReason.includes('expired')) {
      feedbackType = 'expired_invite';
    } else if (lowerReason.includes('spam') || lowerReason.includes('fake') || lowerReason.includes('fraud') || lowerReason.includes('hateful')) {
      feedbackType = 'spam_or_abuse';
    } else if (lowerReason.includes('category') || lowerReason.includes('wrong')) {
      feedbackType = 'inaccurate_info';
    }

    // Send email alert to admin asynchronously
    sendGroupFeedbackEmail({
      groupId: id,
      groupTitle: dbGroup?.title,
      groupUrl: dbGroup?.url,
      groupPlatform: dbGroup?.platform,
      category: dbGroup?.category,
      feedbackType,
      message: `Reason: ${reason}\n\nDetails: ${customMessage || 'No extra message provided.'}`,
      userEmail,
      userIp,
      pageUrl: dbGroup ? `https://grouplinks.app/group/${dbGroup.slug || dbGroup.id}` : undefined,
    }).catch((err) => console.error('[Report Email Error]', err));

    return NextResponse.json(
      { success: true, message: 'Report submitted successfully' },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
        },
      }
    );
  }
}
