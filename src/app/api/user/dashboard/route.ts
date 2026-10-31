import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { getUserById, getUserByEmail, getUserLedger, getUserClaims } from '@/src/lib/user-dal';
import { getPool } from '@/src/lib/db';
import { parseMysqlGroupRow } from '@/src/lib/groups-dal';
import { getGroupsDatabase } from '@/src/lib/groups-store';
import { Group } from '@/src/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    let user = auth.user;
    if (!user && auth.userId) {
      user = await getUserById(auth.userId);
    }
    if (!user && auth.adminEmail) {
      user = await getUserByEmail(auth.adminEmail);
    }

    const effectiveUserId = user?.id || auth.userId;

    const [ledger, claims] = await Promise.all([
      getUserLedger(effectiveUserId, 50),
      getUserClaims(effectiveUserId),
    ]);

    if (!user) {
      user = {
        id: effectiveUserId,
        email: auth.adminEmail || '',
        displayName: auth.isAdmin ? 'Admin User' : 'Community Member',
        role: auth.isAdmin ? 'admin' : 'user',
        credits: 50,
        creditsBalance: 50,
        totalCreditsEarned: 50,
        totalCreditsSpent: 0,
        referralCode: `ref_${effectiveUserId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`,
        reputationScore: 10,
        isBanned: false,
        claimedCommunityIds: [],
        savedGroupIds: [],
        linkedAccounts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const userEmail = user.email ? user.email.toLowerCase() : '';
    let myCommunities: Group[] = [];

    const pool = getPool();
    if (pool) {
      try {
        const [groupRows]: any = await pool.query(
          'SELECT * FROM groups_dir WHERE (claimedByUserId = ? OR authorEmail = ? OR owner_id = ?) ORDER BY createdAt DESC',
          [user.id, userEmail, user.id]
        );
        if (Array.isArray(groupRows)) {
          myCommunities = groupRows.map(parseMysqlGroupRow);
        }
      } catch (err: any) {
        console.warn('[Dashboard API] MySQL error:', err.message);
      }
    }

    if (myCommunities.length === 0) {
      const allGroups = getGroupsDatabase();
      myCommunities = allGroups.filter(g => 
        g.ownerId === user!.id || 
        g.claimedByUserId === user!.id ||
        (userEmail && g.authorEmail && g.authorEmail.toLowerCase() === userEmail)
      );
    }

    const now = Date.now();
    const activePromotions = myCommunities.filter(
      g => (g.isSticky && g.stickyUntil && new Date(g.stickyUntil).getTime() > now) || g.isPromoted
    );

    const creditsBalance = user?.creditsBalance ?? 0;
    const totalEarned = ledger.filter(tx => tx.amount > 0).reduce((acc, tx) => acc + tx.amount, 0);
    const totalSpent = Math.abs(ledger.filter(tx => tx.amount < 0).reduce((acc, tx) => acc + tx.amount, 0));

    return NextResponse.json({
      success: true,
      user,
      ledger,
      claims,
      promoVerifications: [],
      trackingLink: { code: user?.referralCode || '', clicks: 0 },
      myCommunities,
      activePromotions,
      stats: {
        balance: creditsBalance,
        totalEarned,
        totalSpent,
        claimedCount: claims.filter(c => c.status === 'VERIFIED').length,
        promotionsCount: activePromotions.length,
        trackingClicks: 0,
      },
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dashboard' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
