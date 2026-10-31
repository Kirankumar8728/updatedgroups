import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { runDailyAutoNotification } from '@/src/lib/push-notifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth.isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const force = Boolean(body?.force);

    const result = await runDailyAutoNotification(force);
    return NextResponse.json({
      success: result.executed,
      message: result.executed ? 'Daily automated notification dispatched successfully.' : result.reason,
      details: result
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
