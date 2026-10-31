import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { getAllSubscriptions } from '@/src/lib/push-notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth.isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';
    const subscriptions = await getAllSubscriptions();

    if (format === 'csv') {
      const header = 'id,platform,endpoint,p256dh,auth,created_at\n';
      const rows = subscriptions.map(s => {
        const safeEndpoint = `"${(s.endpoint || '').replace(/"/g, '""')}"`;
        const safeP256dh = `"${(s.p256dh || '').replace(/"/g, '""')}"`;
        const safeAuth = `"${(s.auth || '').replace(/"/g, '""')}"`;
        return `${s.id || ''},${s.platform || 'web'},${safeEndpoint},${safeP256dh},${safeAuth},${s.created_at || ''}`;
      }).join('\n');

      return new NextResponse(header + rows, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="push_subscribers_${Date.now()}.csv"`
        }
      });
    }

    return new NextResponse(JSON.stringify(subscriptions, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="push_subscribers_${Date.now()}.json"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
