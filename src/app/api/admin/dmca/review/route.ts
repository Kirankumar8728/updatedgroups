import { NextRequest, NextResponse } from 'next/server';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';
import { requireAdmin } from '@/src/lib/admin-auth';
import { getGroupByIdOrSlug, updateGroup } from '@/src/lib/groups-dal';
import { verifySameOrigin } from '@/src/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const originCheck = verifySameOrigin(req);
  if (!originCheck.valid) {
    return originCheck.response!;
  }

  const adminCheck = requireAdmin(req);
  if (!adminCheck.authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Master Admin session required.' }, { status: 401, headers: REALTIME_NO_CACHE_HEADERS });
  }

  try {
    const { groupId, action } = await req.json();

    if (!groupId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Valid groupId and action (approve or reject) are required.' }, { status: 400, headers: REALTIME_NO_CACHE_HEADERS });
    }

    const group = await getGroupByIdOrSlug(groupId);
    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found.' }, { status: 404, headers: REALTIME_NO_CACHE_HEADERS });
    }

    if (action === 'approve') {
      // Approved DMCA: Keep category fallback image, mark as approved
      await updateGroup(group.id, {
        dmcaStatus: 'approved',
      });
      return NextResponse.json({ success: true, message: 'DMCA takedown approved. Category fallback image retained permanently.' }, { headers: REALTIME_NO_CACHE_HEADERS });
    } else {
      // Rejected DMCA: Restore original image
      const restoredImg = group.originalImageUrl || group.imageUrl;
      await updateGroup(group.id, {
        imageUrl: restoredImg,
        dmcaStatus: 'rejected',
      });
      return NextResponse.json({ success: true, message: 'DMCA takedown rejected. Original image restored to group.' }, { headers: REALTIME_NO_CACHE_HEADERS });
    }
  } catch (err: any) {
    console.error('[Admin DMCA Review Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to process DMCA review.' }, { status: 500, headers: REALTIME_NO_CACHE_HEADERS });
  }
}
