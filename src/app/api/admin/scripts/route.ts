import { NextRequest, NextResponse } from 'next/server';
import { getCustomScriptsServer, saveCustomScriptsServer } from '@/src/lib/server-scripts-persistence';
import { requireAdmin } from '@/src/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const config = getCustomScriptsServer();
    return NextResponse.json(
      { success: true, config },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load custom scripts' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid custom script payload' },
        { status: 400 }
      );
    }

    const saved = saveCustomScriptsServer({
      googleAnalyticsId: body.googleAnalyticsId,
      googleVerificationCode: body.googleVerificationCode,
      bingVerificationCode: body.bingVerificationCode,
      customHeadCode: body.customHeadCode,
      customBodyCode: body.customBodyCode,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Header & footer codes saved permanently on server and ready live.',
        config: saved,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save custom scripts' },
      { status: 500 }
    );
  }
}
