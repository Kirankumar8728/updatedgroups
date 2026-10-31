import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { updateGroup } from '@/src/lib/groups-dal';
import { revalidatePath } from 'next/cache';
import { clearGroupsFromRam } from '@/src/lib/groups-store';

export async function POST(req: Request) {
  try {
    const { url, groupId } = await req.json();
    
    if (!url || !groupId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Parse clean relative path from URL
    // e.g. "https://grouplinks.app/image/reddit/upload/sipstea.webp" -> "image/reddit/upload/sipstea.webp"
    let cleanRelPath = String(url)
      .trim()
      .replace(/^https?:\/\/[^\/]+/i, '')
      .replace(/^\/+/, '');

    const candidates = [
      path.join(process.cwd(), 'public', cleanRelPath),
      path.join(process.cwd(), cleanRelPath),
    ];

    // If cleanRelPath begins with "image/", also test "images/" and vice-versa
    if (cleanRelPath.startsWith('image/')) {
      candidates.push(path.join(process.cwd(), 'public', cleanRelPath.replace(/^image\//, 'images/')));
    } else if (cleanRelPath.startsWith('images/')) {
      candidates.push(path.join(process.cwd(), 'public', cleanRelPath.replace(/^images\//, 'image/')));
    }

    for (const filePath of candidates) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          const dirPath = path.dirname(filePath);
          if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
            fs.rmdirSync(dirPath);
          }
        }
      } catch (fileErr) {
        console.warn('[IMAGE DELETE FILE WARNING]:', fileErr);
      }
    }

    // 2. Clear both imageUrl and bannerUrl in database record
    await updateGroup(groupId, {
      imageUrl: '',
      bannerUrl: '',
      updatedAt: new Date().toISOString(),
    });

    try {
      clearGroupsFromRam();
      revalidatePath('/', 'layout');
      revalidatePath('/');
    } catch {}

    return NextResponse.json({ success: true, message: 'Image permanently deleted.' });
  } catch (error: any) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete image' }, { status: 500 });
  }
}
