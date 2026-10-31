import { NextRequest, NextResponse } from 'next/server';
import { runDailyAutoNotification } from '@/src/lib/push-notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron caller' }, { status: 401 });
    }

    const result = await runDailyAutoNotification(false);
    return NextResponse.json({
      success: result.executed,
      message: result.reason || 'Auto notification executed',
      details: result
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
