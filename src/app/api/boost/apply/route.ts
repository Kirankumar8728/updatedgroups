import { NextRequest, NextResponse } from 'next/server';
import { getGroupById, updateGroup } from '@/src/lib/groups-dal';
import { getBoostPlanById } from '@/src/utils/boostPlans';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { recordCreditTransaction } from '@/src/lib/user-dal';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Centralized rate limiting
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 10,
      windowMs: 60 * 1000,
      keyPrefix: 'boost_apply',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many boost requests. Please slow down.', 10);
    }

    const auth = await resolveAuthContext(req);
    if (!auth.user || !auth.user.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to apply community boost.' },
        { status: 401 }
      );
    }
    const userId = auth.user.id;

    const body = await req.json();
    const { groupId, planId, orderId } = body;

    if (!groupId || !planId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: groupId and planId are required.' },
        { status: 400 }
      );
    }

    // 2. Validate boost plan from authoritative server catalog
    const plan = getBoostPlanById(planId);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Invalid boost plan specified.' },
        { status: 400 }
      );
    }

    // 3. Verify group exists and verify ownership (user owns group or is admin)
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Target community not found.' },
        { status: 404 }
      );
    }

    const isOwner = 
      auth.isAdmin ||
      (group as any).ownerId === userId || 
      (group as any).claimedByUserId === userId ||
      (auth.user?.email && (group as any).authorEmail && (group as any).authorEmail.toLowerCase() === auth.user.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to boost this community.' },
        { status: 403 }
      );
    }

    const creditCost = plan.price; // Required credits
    const ledgerRes = await recordCreditTransaction(
      userId,
      'PROMOTION_SPEND',
      -creditCost,
      `Boost promotion for "${group.title}" (${plan.name} - ${plan.durationLabel})`,
      groupId,
      {
        planId: plan.id,
        planName: plan.name,
        durationMs: plan.durationMs,
        orderId: orderId || null,
        groupId,
      }
    );

    if (!ledgerRes.success) {
      return NextResponse.json(
        { success: false, error: ledgerRes.error || 'Insufficient credits balance or transaction failed.' },
        { status: 402 }
      );
    }

    // 4. Activate promotion
    const currentExpiry =
      group.isSticky && group.stickyUntil && new Date(group.stickyUntil).getTime() > Date.now()
        ? new Date(group.stickyUntil).getTime()
        : Date.now();

    const newExpiry = new Date(currentExpiry + plan.durationMs).toISOString();

    const updatedGroup = await updateGroup(group.id, {
      isSticky: true,
      isPromoted: true,
      stickyUntil: newExpiry,
      stickyOrder: 1,
      featured: true,
    } as any);

    return NextResponse.json({
      success: true,
      message: `Promotion successfully activated for ${plan.durationLabel}!`,
      group: updatedGroup || {
        ...group,
        isSticky: true,
        isPromoted: true,
        stickyUntil: newExpiry,
        stickyOrder: 1,
        featured: true,
      },
      stickyUntil: newExpiry,
      durationLabel: plan.durationLabel,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to apply promotion' },
      { status: 500 }
    );
  }
}
