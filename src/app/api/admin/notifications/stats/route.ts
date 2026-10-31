import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { getAllSubscriptions, getAutoNotificationConfig } from '@/src/lib/push-notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth.isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const subscriptions = await getAllSubscriptions();
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activeThisWeek = subscriptions.filter(s => {
      if (!s.created_at) return true;
      const t = new Date(s.created_at).getTime();
      return isNaN(t) || t > oneWeekAgo;
    }).length;

    const autoConfig = getAutoNotificationConfig();

    return NextResponse.json({
      success: true,
      total: subscriptions.length,
      activeThisWeek,
      autoConfig
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
