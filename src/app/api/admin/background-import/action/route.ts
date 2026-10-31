import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { controlBackgroundWorker } from '@/src/lib/background-importer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { action } = await req.json();

    if (!action || !['pause', 'resume', 'cancel', 'clear'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be pause, resume, cancel, or clear.' },
        { status: 400 }
      );
    }

    const updatedJob = controlBackgroundWorker(action as any);

    return NextResponse.json({
      success: true,
      job: updatedJob,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute worker action.' },
      { status: 500 }
    );
  }
}
