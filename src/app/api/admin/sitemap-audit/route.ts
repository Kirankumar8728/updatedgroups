import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { auditSitemapCanonicalLinks, getLatestSitemapAuditReport } from '@/src/lib/sitemap-canonical-auditor';
import { checkRateLimit, rateLimitResponse } from '@/src/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Enforce admin authentication
    const auth = requireAdmin(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    // 2. Rate limit audit requests
    const rateCheck = checkRateLimit(req, {
      limit: 20,
      windowMs: 60 * 1000,
      route: 'admin_sitemap_audit',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many sitemap audit requests. Please wait.');
    }

    const forceFresh = req.nextUrl.searchParams.get('fresh') === 'true';
    let report = getLatestSitemapAuditReport();

    if (!report || forceFresh) {
      report = await auditSitemapCanonicalLinks();
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate sitemap canonical audit report.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
