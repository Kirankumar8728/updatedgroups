import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { savePushSubscription } from '@/src/lib/push-notifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth.isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';
    let subscribersToImport: Array<{ endpoint: string; p256dh: string; auth: string; platform?: string }> = [];

    if (contentType.includes('application/json')) {
      const body = await req.json();
      const list = Array.isArray(body) ? body : (Array.isArray(body?.subscribers) ? body.subscribers : []);
      subscribersToImport = list.map((item: any) => ({
        endpoint: item.endpoint || item.keys?.endpoint,
        p256dh: item.p256dh || item.keys?.p256dh,
        auth: item.auth || item.keys?.auth,
        platform: item.platform || 'web'
      }));
    } else {
      const text = await req.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.replace(/^"|"$/g, '').trim());
          if (parts.length >= 5) {
            subscribersToImport.push({
              platform: parts[1] || 'web',
              endpoint: parts[2],
              p256dh: parts[3],
              auth: parts[4]
            });
          }
        }
      }
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const sub of subscribersToImport) {
      if (sub.endpoint && sub.p256dh && sub.auth && sub.endpoint.startsWith('http')) {
        await savePushSubscription({
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          platform: sub.platform || 'web'
        });
        importedCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      message: `Successfully imported ${importedCount} subscriber(s). Skipped ${skippedCount} invalid entries.`
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
