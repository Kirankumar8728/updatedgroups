import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/src/lib/auth-helpers';
import { exportUserData, deleteUserData } from '@/src/lib/user-dal';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth.user || !auth.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data = await exportUserData(auth.user.id);
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to export data' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth.user || !auth.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await deleteUserData(auth.user.id);

    const response = NextResponse.json({
      success: true,
      message: 'Account and personal data have been permanently erased.',
    });

    response.cookies.delete('sb_session');
    response.cookies.delete('gl_user_session');

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete account' }, { status: 500 });
  }
}
