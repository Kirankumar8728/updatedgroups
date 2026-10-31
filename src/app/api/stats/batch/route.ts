import { NextRequest, NextResponse } from 'next/server';
import { getStatsBatch } from '@/src/lib/stats-db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids') || '';
    const ids = idsParam.split(',').filter(Boolean);

    const statsMap = await getStatsBatch(ids);

    return NextResponse.json({ success: true, stats: statsMap }, {
      headers: {
        'Cache-Control': 'public, max-age=10, s-maxage=10, stale-while-revalidate=60',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to fetch batch stats' }, { status: 500 });
  }
}
