# Resilient Image Pipeline & Hostinger Deployment Fix

Resolve missing community group card preview images and default fallback placeholders on Hostinger (`grouplinks.app`) by establishing a resilient live-platform-first image architecture with dynamic server streaming and automatic recovery.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your confirmed choices:
> - **Storage & Serving Strategy**: Live platform URLs (direct CDN from Telegram, Discord, WhatsApp, Reddit) are preserved and prioritized, backed by a dynamic Next.js route handler (`/images/[...path]`) that safely serves cached local WebP files if present and falls back gracefully.
> - **Existing Broken Images**: Existing groups in the database with missing `/images/...` disk files will be automatically re-scraped or matched against live platform icons during lookup, recovering real community artwork without manual intervention.

---

## 1. Overview & Root Cause Analysis

### The Problem
When group links are fetched via `/api/scrape-metadata` or submitted via `/submit`:
1. The metadata scraper successfully locates the live, high-resolution platform image (e.g., Telegram's `https://cdn4.telesco.pe/file/...` or `https://t.me/i/userpic/...`).
2. Previously, `uploadImageToR2` / `processAndStoreImageLocally` attempted to write a WebP file to the local directory `public/images/{platform}/{slug}/image1.webp` and overwrote the database `imageUrl` with this local relative path.
3. In production on Hostinger:
   - Next.js does not serve files added to `public/` dynamically after `next build` without a dedicated App Router handler.
   - Pushing code to GitHub and deploying to Hostinger wipes or omits ephemeral local image files on disk.
   - Because the original live platform URL was discarded, `<img src="/images/telegram/..." />` returned HTTP 404, causing `onError` to fall back to the generic SVG icon.

### The Solution
1. **Preserve Live Platform Direct URLs**: Store and use the live CDN image URL (`telesco.pe`, `discordapp.com`, `whatsapp.net`, etc.) as primary or secondary source so the browser loads images reliably across all servers and deployments.
2. **Dynamic Route Handler (`/images/[...path]`)**: Implement an App Router route handler at `src/app/images/[...path]/route.ts`. When an image path like `/images/telegram/government-exams-official/image1.webp` is requested:
   - Check if the WebP file exists in `public/images/...`. If yes, stream it directly with proper MIME type and immutable cache headers.
   - If not found on disk, look up the community by platform and slug in the database/store, fetch or redirect to the live platform image URL, or generate the cached file on-the-fly.
3. **Auto-Recovery for Existing Groups**: Provide an automatic recovery step in the groups data access layer that detects non-existent local image paths and restores the live platform avatar.

---

## 2. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Browser (grouplinks.app)                    │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
         Live Direct Platform URL             Local /images/ URL
      (telesco.pe, discord, reddit)        (cached / custom upload)
                   │                                 │
                   ▼                                 ▼
        ┌──────────────────────┐         ┌───────────────────────────────┐
        │ External Platform CDN│         │ Next.js Route Handler         │
        │ (no-referrer header) │         │ src/app/images/[...path]/...  │
        └──────────────────────┘         └──────────────┬────────────────┘
                                                        │
                                     ┌──────────────────┴──────────────────┐
                                     │                                     │
                             File exists on disk?                 File missing on disk?
                                     │                                     │
                                    YES                                    NO
                                     ▼                                     ▼
                            Stream WebP with                 Auto-recover from Platform /
                            immutable cache                  Database & stream live image
```

### Component & File Changes

1. **`src/app/images/[...path]/route.ts`** (New File):
   - Dynamic GET handler intercepting any `/images/*` request.
   - Resolves file path from `public/images/`.
   - If present: streams file with `Content-Type: image/webp` and `Cache-Control: public, max-age=31536000, immutable`.
   - If missing: extracts platform and group slug, resolves live community URL, streams the image and caches it locally on disk.

2. **`src/lib/local-image-processor.ts` & `src/lib/r2-storage.ts`**:
   - Ensure `processAndStoreImageLocally` retains the original live source URL in metadata/return response.
   - Never replace a working live URL with a relative path if local disk write fails or R2 is disabled.

3. **`src/app/api/scrape-metadata/route.ts`**:
   - Return both `imageUrl` (live platform URL) and optional `cachedImageUrl` or local path.
   - Prevent premature overwriting of high-res direct platform URLs with unverified local relative paths.

4. **`src/utils/categoryImages.ts` (`resolveValidGroupImage`)**:
   - Enhance URL resolver to recognize local paths and provide graceful error resilience.

5. **`src/lib/groups-dal.ts` / Data Migration**:
   - Add recovery hook that repairs entries possessing stale or broken `/images/...` paths by restoring live platform URLs or auto-generating cached WebP assets.

---

## 3. Verification Plan

1. **Compilation & Lint Verification**:
   - Run `tsc --noEmit` and `compile_applet` to ensure zero type errors or broken imports.
2. **Route Handler HTTP Verification**:
   - Test `curl -I http://localhost:3000/images/telegram/government-exams-official/image1.webp` to verify it returns HTTP 200 with `Content-Type: image/webp` instead of 404.
3. **Scraper Live Preview Verification**:
   - Verify that pasting a Telegram link (`https://t.me/tgstat_bot` or `https://t.me/governmentexams`) immediately renders the real group image in the Live Community Card Preview rather than the fallback category SVG.
4. **Detail Page & Grid Verification**:
   - Verify group detail page (`/[platform]/[slug]`) renders real community icons and banners across simulated deployments.
