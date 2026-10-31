import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';

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

    if (!auth.user || !auth.user.id) {
      return NextResponse.json(
        { success: false, error: 'Session expired or unauthenticated' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: auth.user,
        userId: auth.user.id,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch session' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
