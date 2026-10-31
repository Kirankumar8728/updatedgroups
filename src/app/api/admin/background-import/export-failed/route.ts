import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { getBackgroundImportJob } from '@/src/lib/background-importer';
import { sanitizeFileName } from '@/src/lib/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  const job = getBackgroundImportJob();
  const failedList = job.failedUrls || [];

  const textOutput = failedList
    .map(f => `${f.url}\t# Error: ${f.reason}`)
    .join('\n');

  const safeJobId = String(job.id || 'export').replace(/[^a-zA-Z0-9_\-]/g, '');
  const downloadFileName = sanitizeFileName(`failed-links-${safeJobId}.txt`, ['.txt'], 'failed-links.txt');

  return new NextResponse(textOutput || '# No failed links in this job.', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${downloadFileName}"`,
    },
  });
}
