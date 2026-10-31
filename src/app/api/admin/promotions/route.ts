import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { 
  getManualPromotions, 
  approveAndActivatePromotion, 
  updatePromotionStatus, 
  deleteManualPromotion 
} from '@/src/lib/promotions-store';

export const dynamic = 'force-dynamic';

// GET all manual promotion submissions
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const promotions = getManualPromotions();
    return NextResponse.json({
      success: true,
      promotions: promotions || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch promotions' }, { status: 500 });
  }
}

// POST actions: 'approve_activate' | 'update_status'
export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { action, promoId, status, notes } = body;

    if (!promoId) {
      return NextResponse.json({ error: 'promoId is required' }, { status: 400 });
    }

    if (action === 'approve_activate') {
      const result = await approveAndActivatePromotion(promoId);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to activate' }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: 'Promotion approved and group boosted successfully!',
        promotion: result.promotion,
        group: result.group
      });
    }

    if (action === 'update_status') {
      if (!status) {
        return NextResponse.json({ error: 'status is required' }, { status: 400 });
      }
      const updated = updatePromotionStatus(promoId, status, notes);
      if (!updated) {
        return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        promotion: updated
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed processing promotion action' }, { status: 500 });
  }
}

// DELETE a manual promotion request
export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { searchParams } = new URL(req.url);
    const promoId = searchParams.get('promoId');

    if (!promoId) {
      return NextResponse.json({ error: 'promoId is required' }, { status: 400 });
    }

    const deleted = deleteManualPromotion(promoId);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
  }
}
