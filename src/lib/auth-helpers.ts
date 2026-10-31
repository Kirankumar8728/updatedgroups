import { NextRequest } from 'next/server';
import { requireAdmin } from './admin-auth';
import { verifySignedUserSession, getUserById, getUserByEmail } from './user-dal';
import { UserProfile } from '../types/user';

export interface AuthenticatedContext {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId?: string;
  user?: UserProfile | null;
  adminEmail?: string;
}

/**
 * Resolves the authenticated user or administrator from incoming NextRequest.
 * Uses cryptographically signed sessions backed by MySQL.
 */
export async function resolveAuthContext(req: NextRequest): Promise<AuthenticatedContext> {
  // 1. First, check if caller provided a User Session Token (Authorization header or session cookies)
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const cookieToken = req.cookies.get('gl_user_session')?.value || req.cookies.get('user_session')?.value;
  const userToken = bearerToken || cookieToken;

  if (userToken) {
    const verifiedUserId = verifySignedUserSession(userToken);
    if (verifiedUserId) {
      const user = await getUserById(verifiedUserId);
      if (user && !user.isBanned) {
        return {
          isAuthenticated: true,
          isAdmin: user.role === 'admin',
          userId: user.id,
          user,
          adminEmail: user.role === 'admin' ? user.email : undefined,
        };
      }
    }
  }

  // 2. Second, check if caller is an authorized administrator
  const adminCheck = requireAdmin(req);
  if (adminCheck.authorized) {
    const adminEmail = (process.env.ADMIN_EMAIL || 'kirankumar8728@gmail.com').trim().toLowerCase();
    let adminUser = await getUserByEmail(adminEmail);
    if (!adminUser) {
      adminUser = await getUserById('usr_admin_1790520435899');
    }
    if (!adminUser) {
      adminUser = {
        id: 'usr_admin_1790520435899',
        email: adminEmail,
        displayName: 'Kiran Kumar (Admin)',
        role: 'admin',
        credits: 1000,
        creditsBalance: 1000,
        totalCreditsEarned: 1000,
        totalCreditsSpent: 0,
        referralCode: 'REF_ADMIN',
        reputationScore: 100,
        isBanned: false,
        claimedCommunityIds: [],
        savedGroupIds: [],
        linkedAccounts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      isAuthenticated: true,
      isAdmin: true,
      userId: adminUser.id,
      user: adminUser,
      adminEmail,
    };
  }

  return {
    isAuthenticated: false,
    isAdmin: false,
  };
}
