import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { executeDml } from '@/src/lib/db';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';

export async function POST(req: NextRequest) {
    const auth = requireAdmin(req);
    if (!auth.authorized) return auth.response!;

    try {
        const { groupIds } = await req.json();
        if (!Array.isArray(groupIds) || groupIds.length === 0) {
            return NextResponse.json({ success: false, error: 'Invalid group IDs' }, { status: 400 });
        }

        const placeholders = groupIds.map(() => '?').join(',');
        await executeDml(
            `UPDATE groups SET isActive = false, healthStatus = 'expired' WHERE id IN (${placeholders})`,
            groupIds
        );

        return NextResponse.json({ success: true }, { headers: REALTIME_NO_CACHE_HEADERS });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
    }
}
