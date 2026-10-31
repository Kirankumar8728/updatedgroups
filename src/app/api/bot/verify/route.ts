import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { approveCommunityClaim } from '@/src/lib/user-dal';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawApiKey = (req.headers.get('x-bot-api-key') || req.headers.get('authorization') || '')
      .replace(/^Bearer\s+/i, '')
      .trim();

    const expectedApiKey = (process.env.BOT_API_KEY || '').trim();

    if (!expectedApiKey) {
      return NextResponse.json(
        { success: false, error: 'Bot API is not configured on this server.' },
        { status: 503 }
      );
    }

    if (!rawApiKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. x-bot-api-key header or Authorization Bearer token required.' },
        { status: 401 }
      );
    }

    const providedBuf = Buffer.from(rawApiKey);
    const expectedBuf = Buffer.from(expectedApiKey);

    const isValid =
      providedBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(providedBuf, expectedBuf);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Invalid bot API credentials.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, claimId } = body;

    if (action === 'verify_claim' && claimId) {
      const result = await approveCommunityClaim(claimId);
      if (!result.success) {
        return NextResponse.json({ success: false, error: (result as any).error || 'Failed to approve claim' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Community claim verified by bot engine' });
    }

    return NextResponse.json({ success: true, message: 'Operation acknowledged' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Bot gateway error' }, { status: 500 });
  }
}

