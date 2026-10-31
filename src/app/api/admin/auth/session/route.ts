import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ADMIN_EMAIL, ADMIN_USERNAME } from '@/src/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  const headers = {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
  };

  if (!auth.authorized) {
    return NextResponse.json({
      authenticated: false,
    }, { headers });
  }

  return NextResponse.json({
    authenticated: true,
    adminEmail: ADMIN_EMAIL,
    adminUsername: ADMIN_USERNAME,
  }, { headers });
}
