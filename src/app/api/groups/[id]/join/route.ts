import { NextRequest, NextResponse } from 'next/server';
import { trackGroupClick, logGroupAction } from '@/src/lib/groups-dal';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';
import { getClientIp } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || '';

    // Log join action into MySQL group_actions table (+1 point per unique IP)
    await logGroupAction({
      groupId: id,
      actionType: 'join',
      ipAddress: ip,
      userAgent,
    });

    const updated = await trackGroupClick(id);
    if (!updated) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404, headers: REALTIME_NO_CACHE_HEADERS });
    }
    return NextResponse.json(
      { success: true, clicks: updated.clicks, memberCount: updated.memberCount, group: updated },
      { headers: REALTIME_NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
  }
}
