import { NextRequest, NextResponse } from 'next/server';
import { bookmarkGroup } from '@/src/lib/groups-dal';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action === 'remove' ? 'remove' : 'add';

    const updated = await bookmarkGroup(id, action);
    if (!updated) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404, headers: REALTIME_NO_CACHE_HEADERS });
    }
    return NextResponse.json(
      { success: true, bookmarks: updated.bookmarks, group: updated },
      { headers: REALTIME_NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
  }
}
