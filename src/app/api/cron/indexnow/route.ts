import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { pingIndexNow } from '@/src/lib/indexnow';
import { getGroups } from '@/src/lib/groups-dal';
import { TAXONOMY_CATEGORIES } from '@/src/lib/taxonomy';
import { Platform } from '@/src/types';

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

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized cron trigger. Valid CRON_SECRET Bearer token required.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    let urlList: string[] = body.urls || [];

    // If no specific URLs provided, collect all qualified Category and Explore URLs (>= 5 groups)
    if (urlList.length === 0) {
      const { groups: db } = await getGroups({ limit: 1000 });
      const activeGroups = db.filter(g => g.isActive !== false && g.is_active !== false);

      const qualifiedUrls = new Set<string>();

      // 1. Platform Hubs
      const platforms: Platform[] = ['telegram', 'whatsapp', 'discord', 'reddit', 'signal', 'facebook'];
      const platformRoutes = [
        '/telegram-channels',
        '/whatsapp-groups',
        '/discord-servers',
        '/reddit-communities',
        '/signal-groups',
        '/facebook-groups',
      ];
      platformRoutes.forEach(r => qualifiedUrls.add(r));

      // 2. Populated Category Hubs
      for (const cat of TAXONOMY_CATEGORIES) {
        const catGroups = activeGroups.filter(
          g => g.category.toLowerCase() === cat.name.toLowerCase()
        );
        if (catGroups.length > 0) {
          qualifiedUrls.add(`/categories/${cat.slug}`);
        }
      }

      // 3. Explore Hubs meeting the >= 5 groups threshold
      for (const platform of platforms) {
        for (const cat of TAXONOMY_CATEGORIES) {
          const comboCount = activeGroups.filter(
            g =>
              g.platform.toLowerCase() === platform.toLowerCase() &&
              g.category.toLowerCase() === cat.name.toLowerCase()
          ).length;

          if (comboCount >= 5) {
            qualifiedUrls.add(`/explore/${platform}-${cat.slug}`);
          }
        }
      }

      urlList = Array.from(qualifiedUrls);
    }

    const result = await pingIndexNow(urlList);

    return NextResponse.json({
      success: result.success,
      submittedCount: result.submittedCount,
      timestamp: new Date().toISOString(),
      urls: urlList,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'IndexNow submission failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
