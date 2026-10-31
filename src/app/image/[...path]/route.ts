import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.webp':
      return 'image/webp';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml; charset=utf-8';
    case '.gif':
      return 'image/gif';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'image/webp';
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: rawSegments } = await context.params;
    if (!rawSegments || !Array.isArray(rawSegments) || rawSegments.length === 0) {
      return new NextResponse('Invalid image path', { status: 400 });
    }

    // Sanitize path segments to prevent directory traversal
    const cleanSegments = rawSegments
      .map((s) => s.replace(/[^a-zA-Z0-9._-]/g, ''))
      .filter((s) => s && s !== '..' && s !== '.');

    if (cleanSegments.length === 0) {
      return new NextResponse('Invalid image path', { status: 400 });
    }

    // Check local disk in public/image or public/images
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'image', ...cleanSegments),
      path.join(process.cwd(), 'public', 'images', ...cleanSegments),
      path.join(process.cwd(), 'image', ...cleanSegments),
      path.join(process.cwd(), 'images', ...cleanSegments),
      path.join(process.cwd(), '.next', 'standalone', 'public', 'image', ...cleanSegments),
    ];

    for (const diskPath of possiblePaths) {
      if (fs.existsSync(diskPath)) {
        const stats = fs.statSync(diskPath);
        if (stats.isFile()) {
          const buffer = fs.readFileSync(diskPath);
          const mime = getMimeType(diskPath);
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': mime,
              'Content-Length': String(buffer.length),
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }
      }
    }

    return new NextResponse('Image not found', { status: 404 });
  } catch (error) {
    console.error('[IMAGE ROUTE ERROR]:', error);
    return new NextResponse('Internal error loading image', { status: 500 });
  }
}
