import { NextRequest, NextResponse } from 'next/server';
import { incrementStat } from '@/src/lib/stats-db';

export async function POST(req: NextRequest) {
  try {
    const { groupId, action } = await req.json();
    if (!groupId || !['upvote', 'share', 'join', 'click'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const updated = await incrementStat(groupId, action);
    return NextResponse.json({ success: true, stats: updated }, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to increment stat' }, { status: 500 });
  }
}
