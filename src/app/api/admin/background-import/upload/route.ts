import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { initializeBackgroundImport, getBackgroundImportJob } from '@/src/lib/background-importer';
import { verifySameOrigin, sanitizeFileName } from '@/src/lib/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const originCheck = verifySameOrigin(req);
  if (!originCheck.valid) {
    return originCheck.response!;
  }

  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json();
    const { content, fileName, options } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No content or links provided in the upload.' },
        { status: 400 }
      );
    }

    const cleanFileName = fileName ? sanitizeFileName(fileName, ['.txt', '.json', '.csv'], 'import.txt') : undefined;

    const job = initializeBackgroundImport(content, cleanFileName, options);

    return NextResponse.json({
      success: true,
      message: `Background import job started with ${job.total} unique links.`,
      job,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initialize background import.' },
      { status: 500 }
    );
  }
}
