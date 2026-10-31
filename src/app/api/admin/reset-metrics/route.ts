import { NextRequest, NextResponse } from 'next/server';
import { resetAllGroupMetricsToZero } from '@/src/lib/groups-dal';
import { requireAdmin } from '@/src/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    let options = {};
    try {
      options = await req.json();
    } catch {}

    const result = await resetAllGroupMetricsToZero(options);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
