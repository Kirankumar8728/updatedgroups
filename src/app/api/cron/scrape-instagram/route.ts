import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { getGroups, updateGroup } from '@/src/lib/groups-dal';
import { scrapeGroupMetadataDirect, isSafePublicUrl } from '@/src/lib/metadata-scraper';
import { requireAdmin } from '@/src/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  if (!cronSecret) return false;

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = (req.headers.get('x-cron-secret') || bearerToken).trim();

  if (!headerSecret) return false;

  const givenBuf = Buffer.from(headerSecret);
  const expectedBuf = Buffer.from(cronSecret);

  return (
    givenBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(givenBuf, expectedBuf)
  );
}

export async function GET(req: NextRequest) {
  const isCron = verifyCronAuth(req);
  const isAdmin = requireAdmin(req).authorized;

  if (!isCron && !isAdmin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Valid CRON_SECRET Bearer token or Admin session required.' },
      { status: 401 }
    );
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get('limit')) || 25, 100);

    const igGroupsRes = await getGroups({ platform: 'instagram', limit });
    const igGroups = igGroupsRes.groups || [];

    const updatedGroups: Array<{
      id: string;
      title: string;
      memberCount?: number;
      imageUrl?: string;
      updated: boolean;
    }> = [];

    for (const group of igGroups) {
      try {
        if (!isSafePublicUrl(group.url)) continue;

        const scraped = await scrapeGroupMetadataDirect(group.url, 'instagram');
        const updates: any = {};

        if (scraped.title && scraped.title !== group.title && !scraped.fallbackMetadata) {
          updates.title = scraped.title;
        }

        if (typeof scraped.memberCount === 'number' && scraped.memberCount > 0 && scraped.memberCount !== group.memberCount) {
          updates.memberCount = scraped.memberCount;
        }

        if (scraped.imageUrl && scraped.imageUrl !== group.imageUrl && !scraped.fallbackMetadata) {
          updates.imageUrl = scraped.imageUrl;
        }

        if (Object.keys(updates).length > 0) {
          updates.lastMetadataFetchAt = new Date().toISOString();
          await updateGroup(group.id, updates);
          updatedGroups.push({ id: group.id, title: updates.title || group.title, memberCount: updates.memberCount || group.memberCount, imageUrl: updates.imageUrl || group.imageUrl, updated: true });
        } else {
          updatedGroups.push({ id: group.id, title: group.title, updated: false });
        }
      } catch (scErr: any) {
        console.warn(`[Cron Scrape Instagram] Failed for group ${group.id}:`, scErr?.message);
      }
    }

    if (updatedGroups.some(g => g.updated)) {
      revalidatePath('/instagram-groups');
      revalidatePath('/');
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalInstagramGroups: igGroups.length,
      refreshedCount: updatedGroups.filter(g => g.updated).length,
      groups: updatedGroups,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Instagram cron scraper failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
