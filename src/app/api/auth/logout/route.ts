import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.delete('sb_session');
    response.cookies.delete('gl_user_session');
    response.cookies.delete('gl_user_session_token');
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Logout failed' }, { status: 500 });
  }
}
