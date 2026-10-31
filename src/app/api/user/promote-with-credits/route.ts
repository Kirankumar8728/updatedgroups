import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { recordCreditTransaction } from '@/src/lib/user-dal';
import { getGroupById, updateGroup } from '@/src/lib/groups-dal';
import { getBoostPlanById } from '@/src/utils/boostPlans';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 10,
      windowMs: 60 * 1000,
      keyPrefix: 'promote_credits',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many requests. Please wait.', 10);
    }

    const auth = await resolveAuthContext(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Please log in to promote your community.' }, { status: 401 });
    }

    const body = await req.json();
    const { groupId, planId } = body;

    if (!groupId || !planId) {
      return NextResponse.json({ success: false, error: 'Group ID and Boost Plan ID are required.' }, { status: 400 });
    }

    const plan = getBoostPlanById(planId);
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Invalid boost plan selected.' }, { status: 400 });
    }

    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json({ success: false, error: 'Target community not found.' }, { status: 404 });
    }

    // Verify ownership
    const isOwner =
      auth.isAdmin ||
      group.ownerId === auth.userId ||
      group.claimedByUserId === auth.userId ||
      (auth.user?.email && group.authorEmail && group.authorEmail.toLowerCase() === auth.user.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Forbidden: You can only boost communities you own or manage.' }, { status: 403 });
    }

    // Spend credits through the atomic transaction ledger
    const creditCost = plan.price;
    const ledgerResult = await recordCreditTransaction(
      auth.userId,
      'PROMOTION_SPEND',
      -creditCost,
      `Spent ${creditCost} credits for "${plan.name}" (${plan.durationLabel}) promotion`,
      groupId,
      {
        planId: plan.id,
        planName: plan.name,
        durationMinutes: plan.durationMinutes,
      }
    );

    if (!ledgerResult.success) {
      return NextResponse.json(
        { success: false, error: ledgerResult.error || 'Insufficient credits balance.' },
        { status: 402 }
      );
    }

    // Apply the boost
    const currentExpiry =
      group.isSticky && group.stickyUntil && new Date(group.stickyUntil).getTime() > Date.now()
        ? new Date(group.stickyUntil).getTime()
        : Date.now();

    const newExpiry = new Date(currentExpiry + plan.durationMs).toISOString();

    // Use a large negative number based on timestamp for stickyOrder so newest boosts appear first,
    // but allowing multiple groups to have unique orders.
    const stickyOrder = Math.floor(Date.now() / 1000) * -1;

    const updatedGroup = await updateGroup(groupId, {
      isSticky: true,
      isPromoted: true,
      stickyUntil: newExpiry,
      stickyOrder: stickyOrder,
      featured: true,
      lastActive: 'Just now',
    });

    return NextResponse.json({
      success: true,
      group: updatedGroup || group,
      newExpiry,
      newBalance: ledgerResult.newBalance,
      message: `Community "${group.title}" boosted successfully for ${plan.durationLabel}!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to promote community' }, { status: 500 });
  }
}
