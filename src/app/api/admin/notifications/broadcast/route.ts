import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { sendBatchedPushBroadcast } from '@/src/lib/push-notifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth.isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin authorization required' }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, url, batchSize, delayMs, maxSubscribers } = body;

    if (!title || !message) {
      return NextResponse.json({ success: false, error: 'Title and message are required' }, { status: 400 });
    }

    const result = await sendBatchedPushBroadcast({
      title: title.trim(),
      message: message.trim(),
      url: url?.trim() || '/',
      batchSize: typeof batchSize === 'number' ? batchSize : 25,
      delayMs: typeof delayMs === 'number' ? delayMs : 500,
      maxSubscribers: typeof maxSubscribers === 'number' && maxSubscribers > 0 ? maxSubscribers : undefined
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sent: result.totalSubscribers,
      successCount: result.sentCount,
      failureCount: result.failedCount,
      batchesCount: result.batchesCount,
      message: result.message
    });
  } catch (error: any) {
    console.error('Broadcast route error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
