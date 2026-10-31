import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import {
  getHealthAutomationState,
  updateAutomationSettings,
  executeHealthValidationBatch,
  revalidateSingleGroup,
  startDailyImageValidationCron,
} from '@/src/lib/scheduled-image-validator';
import { checkRateLimit, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    // Ensure background timer is active
    startDailyImageValidationCron();

    const state = getHealthAutomationState();

    return NextResponse.json({
      success: true,
      data: state,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[API /api/admin/health-automation GET Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch health automation status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const rateCheck = checkRateLimit(req, {
      limit: 30,
      windowMs: 60 * 1000,
      route: 'admin_health_automation',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many health automation requests. Please wait.');
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'run_now';

    if (action === 'update_settings') {
      const { mode, nightHour, intervalHours, batchSize, autoFixImages, checkLinks } = body;
      const updatedState = updateAutomationSettings({
        mode: mode === 'nightly' || mode === 'interval' || mode === 'manual' ? mode : undefined,
        nightHour: typeof nightHour === 'number' ? nightHour : undefined,
        intervalHours: typeof intervalHours === 'number' ? intervalHours : undefined,
        batchSize: typeof batchSize === 'number' ? batchSize : undefined,
        autoFixImages: typeof autoFixImages === 'boolean' ? autoFixImages : undefined,
        checkLinks: typeof checkLinks === 'boolean' ? checkLinks : undefined,
      });

      return NextResponse.json({
        success: true,
        message: 'Automation settings updated successfully.',
        data: updatedState,
      });
    }

    if (action === 'revalidate_group') {
      const { groupId, autoFix = true } = body;
      if (!groupId || typeof groupId !== 'string') {
        return NextResponse.json({ success: false, error: 'Group ID is required' }, { status: 400 });
      }

      const res = await revalidateSingleGroup(groupId, autoFix);
      return NextResponse.json({
        success: res.success,
        item: res.item,
        error: res.error,
        message: res.success ? `Revalidated group ${groupId} successfully.` : res.error,
      });
    }

    if (action === 'run_now') {
      const batchSize = typeof body.batchSize === 'number' ? body.batchSize : undefined;
      const autoFix = typeof body.autoFix === 'boolean' ? body.autoFix : undefined;
      const checkLinks = typeof body.checkLinks === 'boolean' ? body.checkLinks : undefined;

      const report = await executeHealthValidationBatch({
        batchSize,
        autoFix,
        checkLinks,
        runType: 'manual',
      });

      const state = getHealthAutomationState();

      return NextResponse.json({
        success: true,
        message: `Manual health audit completed for ${report.totalChecked} groups.`,
        report,
        data: state,
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/admin/health-automation POST Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process automation action' },
      { status: 500 }
    );
  }
}
