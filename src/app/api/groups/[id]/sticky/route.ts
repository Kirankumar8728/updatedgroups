import { NextRequest, NextResponse } from 'next/server';
import { updateStickyPromotion } from '@/src/lib/groups-dal';
import { requireAdmin } from '@/src/lib/admin-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const adminCheck = requireAdmin(req);
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Only administrators can update sticky promotion.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const durationHours = Number(body.durationHours) || 24;

    const updated = await updateStickyPromotion(id, durationHours);
    if (!updated) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, stickyUntil: updated.stickyUntil, isSticky: updated.isSticky, group: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
