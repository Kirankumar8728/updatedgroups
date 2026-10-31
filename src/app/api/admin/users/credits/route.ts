import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { getUserByEmail, recordCreditTransaction } from '@/src/lib/user-dal';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email || !email.includes('@')) {
    return NextResponse.json({ success: false, error: 'A valid user email address is required.' }, { status: 400 });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(cleanEmail);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User profile not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: (user as any).displayName || (user as any).name || user.email?.split('@')[0] || 'User',
        role: (user as any).role || 'user',
        credits: (user as any).credits || 0,
        creditsBalance: (user as any).creditsBalance || 0,
        totalCreditsEarned: (user as any).totalCreditsEarned || 0,
        totalCreditsSpent: (user as any).totalCreditsSpent || 0,
        createdAt: (user as any).createdAt || new Date().toISOString(),
        isBanned: (user as any).isBanned || false
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error searching user' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { email, amount, reason, mode } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid user email address is required.' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      return NextResponse.json({ success: false, error: 'Credit amount must be a number.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(cleanEmail);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: `No registered user profile found for email "${cleanEmail}". The user must register an account first.`
      }, { status: 404 });
    }

    let finalAmount = numAmount;
    let finalReason = reason ? String(reason).trim() : `Custom credit adjustment by Administrator (${numAmount > 0 ? '+' : ''}${numAmount} Credits)`;

    if (mode === 'set') {
      const currentBalance = (user as any).creditsBalance || 0;
      finalAmount = numAmount - currentBalance;
      finalReason = reason ? String(reason).trim() : `Administrator set credit balance to ${numAmount} (Adjustment: ${finalAmount > 0 ? '+' : ''}${finalAmount})`;
    }

    if (finalAmount === 0 && mode !== 'set') {
      return NextResponse.json({ success: false, error: 'Credit adjustment amount must be non-zero.' }, { status: 400 });
    }

    const result = await recordCreditTransaction(
      user.id,
      'ADMIN_GRANT',
      finalAmount,
      finalReason
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: (result as any).error || 'Failed to apply credits.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully applied ${numAmount > 0 ? '+' : ''}${numAmount} credits to ${(user as any).displayName || user.email}!`,
      newBalance: (result as any).newBalance || 0,
      userId: user.id,
      email: cleanEmail
    });
  } catch (error: any) {
    console.error('[ADMIN CUSTOM CREDITS API] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error granting custom credits' }, { status: 500 });
  }
}
