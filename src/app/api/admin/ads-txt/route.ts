import { NextRequest, NextResponse } from 'next/server';
import { getAdsTxtServer, saveAdsTxtServer } from '@/src/lib/server-scripts-persistence';
import { requireAdmin } from '@/src/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const content = getAdsTxtServer();
    return NextResponse.json(
      { success: true, content },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to read ads.txt' },
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
    if (body === undefined || body === null || typeof body.content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid payload. "content" string is required.' },
        { status: 400 }
      );
    }

    const saved = saveAdsTxtServer(body.content);

    return NextResponse.json(
      {
        success: true,
        message: 'ads.txt file updated and live at /ads.txt immediately!',
        content: saved,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save ads.txt' },
      { status: 500 }
    );
  }
}
