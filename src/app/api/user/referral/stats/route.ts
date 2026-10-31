import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { getUserReferralStats, getUserById } from '@/src/lib/user-dal';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const [user, { stats, attributions }] = await Promise.all([
      getUserById(auth.userId),
      getUserReferralStats(auth.userId),
    ]);

    const referralCode = user?.referralCode || '';

    return NextResponse.json({
      success: true,
      referralCode,
      referralLink: `https://grouplinks.app/?ref=${referralCode}`,
      stats,
      recentAttributions: attributions.slice(0, 20),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve referral stats' },
      { status: 500 }
    );
  }
}
