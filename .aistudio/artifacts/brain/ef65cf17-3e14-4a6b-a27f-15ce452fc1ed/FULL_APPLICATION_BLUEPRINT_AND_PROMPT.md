# Master Blueprint & Universal Reproduction Prompt: GroupLinks Directory

> **Purpose**: This file contains the complete, production-grade system prompt, architecture documentation, data schema, scraper engine specifications, and frontend design guidelines. You can copy and paste the prompt in **Section 1** into any AI coding assistant to build or rebuild this application from scratch.

---

## SECTION 1: MASTER ONE-SHOT AI REPRODUCTION PROMPT

```markdown
You are an expert full-stack engineer and UI/UX designer. Build a complete, production-grade, high-performance community directory web application called "GroupLinks" (or "Nexus Groups Directory").

### 1. APPLICATION OVERVIEW
GroupLinks is a next-generation directory platform for discovering, ranking, sharing, and submitting public chat groups, channels, and communities across all major social networks:
- WhatsApp (Groups, Channels, Communities)
- Telegram (Public Channels, Supergroups)
- Discord (Servers, Communities)
- Reddit (Subreddits)
- Facebook (Public Groups)
- Signal (Open Chat Groups)
- Snapchat (Campus & Story Communities)
- Instagram (Broadcast Channels & Group Chats)

### 2. TECH STACK & ARCHITECTURE
- Framework: Next.js 15+ (App Router), TypeScript (Strict mode).
- Styling: Tailwind CSS (v4) with dark-first cyberpunk / sleek modern glassmorphism aesthetic.
- Animation & Icons: Lucide-react for all iconography, motion (`motion/react`) for smooth transitions and modal reveals.
- Persistence Layer: Dual-engine Data Access Layer (DAL):
  1. Native MySQL pool with indexed queries for production scale.
  2. Zero-dependency JSON disk store (`.data/nexus-groups.json`) fallback with atomic writes for local/serverless environments without MySQL.
  3. Strict Rule: Never auto-generate fake/random groups overnight or in background without visitor submission. Baseline seed data must have fixed past dates (e.g. 2026-05-01) and must never overwrite or jump ahead of real user submissions.
- Interactive Features: QR Code generator (`qrcode.react`), confetti celebrations (`canvas-confetti`) on upvotes/joins, Web Share API integration.

### 3. CORE FEATURES & FUNCTIONALITY

#### A. Public Discovery & Feed
- Universal search bar with instant debouncing across titles, descriptions, custom tags (#), and categories.
- Multi-dimensional taxonomy filters:
  - Categories: Tech & Programming, Business & Startups, Crypto & Web3, Gaming & Esports, Languages & Learning, Dating & Social, Entertainment, Education & Jobs, Food & Cooking, Health & Medical, Hobbies & Crafts, Humor & Memes, Local & Regional, Music & Audio, Pets & Animals, Art & Design, Adult / 18+.
  - Platforms: WhatsApp, Telegram, Discord, Reddit, Facebook, Signal, Snapchat, Instagram.
  - Regions: Global, United States, India, United Kingdom, Europe, Asia Pacific, Latin America, etc.
  - Languages: English, Hindi, Spanish, French, German, Portuguese, Japanese, etc.
- Sorting Modes:
  - Newest First (default chronological by `createdAt DESC`)
  - Most Popular (clicks + upvotes * 2)
  - Trending / Daily 24h Activity Score
  - Most Members
  - Top Growth Rate
- Spotlight / Sticky Promotions:
  - Sponsored / Boosted listings that stay pinned to top ranks with expiration timers, glowing badges, and priority sorting.
  - 24-Hour Top Ranked Spotlight injected into 3rd position.
- Adult / 18+ Content Isolation:
  - Sensitive content is hidden by default behind safe-mode switches and domain-level separation (`adult.*` subdomain support).

#### B. Direct Automated Metadata Scrapers
- Server-side scraper (`/api/scrape-metadata` and direct functions):
  - WhatsApp: Parses `chat.whatsapp.com/invite/:code`, extracts OpenGraph title, description, and group icon (`pps.whatsapp.net`). Flags revoked/expired invite codes.
  - Telegram: Parses `t.me/:handle`. Extracts channel name, avatar, and subscriber count.
    - Expired check: If Telegram returns "If you have Telegram, you can contact @username right away", flag channel as expired / inactive user handle instead of public group.
  - Reddit: Scrapes `reddit.com/r/:subreddit`. Extracts community name, icon, member count.
    - Expired check: If page contains "We couldn't find that community", flag as expired.
  - Instagram & Discord: Scrapes invite embeds and resolves title, preview, and presence metrics.
  - Fallbacks: Deterministic SVG avatars via DiceBear API or category-specific gradients when remote images are blocked.

#### C. Group Submission & Moderation
- Modern submission modal with real-time URL preview & automatic metadata scraping.
- Anti-spam & Rate Limiting: IP-based sliding window rate limiter (e.g. 15 submissions / 10 min for visitors).
- Duplicate Detection: Normalizes invite URLs and slugs to block duplicate submissions.
- Keyword Filtering & Moderation: Automatic safety scoring based on restricted keyword lists. Automatic moderation review queue.
- DMCA System: DMCA takedown request modal with automatic 24-hour review countdown and admin resolution actions.

#### D. Group Detail Page (`/group/[slug]` or `/group/[id]`)
- Rich metadata card, banner preview, direct "Join Group" CTA button with click-tracking.
- Interactive Upvote, Bookmark, and Share buttons.
- QR Code display for instant mobile scanning (especially WhatsApp and Signal).
- Community Reviews & Ratings (1-5 stars) with user comments.
- Related communities carousel based on matching category and custom tags.

#### E. Admin Dashboard (`/admin` or secret modal)
- Password / TOTP / OTP authentication.
- Group Management: Edit title, description, verified status, sticky promotion, or delete.
- Bulk Importer: Upload text/CSV lists of group URLs with background concurrent scraping, progress tracking, and pause/resume.
- Health Monitoring: Link-health check and image-health validator.

### 4. UI/UX DESIGN SYSTEM
- Theme: Deep dark space aesthetic (`#0b0f19` background, `#111827` cards, `#1f2937` borders).
- Accents: Electric Indigo (`#6366f1`), Cyan (`#06b6d4`), Emerald for WhatsApp (`#10b981`), Sky for Telegram (`#0284c7`), Blurple for Discord (`#5865f2`), Orange for Reddit (`#ff4500`).
- Typography: Crisp sans-serif with bold hierarchy, readable badges, zero clutter.
- Responsive: Seamless on mobile (bottom sheet drawers, touch targets >= 44px) and desktop (multi-column grid).

Build the complete application following standard App Router architecture with clean modular code.
```

---

## SECTION 2: ARCHITECTURAL SPECIFICATION

### 1. Data Models (`src/types/index.ts`)

```typescript
export type Platform = 'whatsapp' | 'telegram' | 'discord' | 'reddit' | 'facebook' | 'signal' | 'snapchat' | 'instagram';

export type Category =
  | 'Tech & Programming'
  | 'Business & Startups'
  | 'Crypto & Web3'
  | 'Gaming & Esports'
  | 'Languages & Learning'
  | 'Dating & Social'
  | 'Entertainment & Movies'
  | 'Education & Jobs'
  | 'Food & Cooking'
  | 'Health & Medical'
  | 'Hobbies & Crafts'
  | 'Humor & Memes'
  | 'Local & Regional'
  | 'Music & Audio'
  | 'Pets & Animals'
  | 'Art & Design'
  | 'Science & AI'
  | 'Adult / 18+';

export interface GroupComment {
  id: string;
  groupId: string;
  name: string;
  email?: string;
  maskedEmail?: string;
  comment: string;
  rating?: number;
  createdAt: string;
}

export interface Group {
  id: string;
  numericId?: number;
  slug: string;
  title: string;
  description: string;
  url: string;
  platform: Platform;
  category: Category;
  language: string;
  region: string;
  customTags: string[];
  imageUrl: string;
  bannerUrl?: string;
  memberCount: number;
  growthRate: number;
  clicks: number;
  upvotes: number;
  shares: number;
  bookmarks: number;
  rating: number;
  ratingCount: number;
  comments: GroupComment[];
  verified: boolean;
  featured: boolean;
  isNsfw: boolean;
  isSticky: boolean;
  stickyUntil?: string;
  stickyOrder?: number;
  isPromoted?: boolean;
  safetyScore: number;
  rankScore: number;
  createdAt: string;
  publishedAt?: string;
  updatedAt?: string;
  authorName?: string;
  isActive: boolean;
  isExpired?: boolean;
  expiredReason?: string;
  status: 'approved' | 'pending' | 'rejected';
}
```

---

### 2. Data Access Layer & Persistence Strategy

The system uses a resilient two-tier persistence design:

```
                  ┌───────────────────────────────┐
                  │    Caller (API / Actions)     │
                  └──────────────┬────────────────┘
                                 │
                     ┌───────────▼───────────┐
                     │     groups-dal.ts     │
                     └───────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
       MySQL Configured?                 MySQL Absent / Down?
                 │                               │
       ┌─────────▼─────────┐           ┌─────────▼─────────┐
       │   MySQL Database  │           │  groups-store.ts  │
       │   (`groups_dir`)  │           │ (Local RAM + JSON)│
       └───────────────────┘           └─────────┬─────────┘
                                                 │
                                       ┌─────────▼─────────┐
                                       │ nexus-groups.json │
                                       │   (Atomic Disk)   │
                                       └───────────────────┘
```

#### Prevention of Phantom / Random Group Generation:
1. **Never use `Date.now()` inside seed arrays**: All fallback/starter seeds must have static dates fixed in the past (e.g. `2026-05-01T00:00:00.000Z`).
2. **Never auto-inject seeds into an existing database**: Once `.data/nexus-groups.json` contains records, `ensureMinimumTaxonomyCoverage()` and `syncDatabaseFromSeeds()` must NOT append mock groups.
3. **Strict Visitor Submission Integrity**: Only groups submitted via `POST /api/groups` or the `submitGroupAction` server action receive fresh timestamps.

---

### 3. URL Scraper & Expired Link Detection Engine

```typescript
// Key Scraper Validation Rules:
// 1. Telegram Inactive Handle Detection:
if (html.includes('If you have Telegram, you can contact @') || html.includes('You can contact @')) {
  return { isExpired: true, expiredReason: 'Telegram handle is a direct contact, not a public group or channel.' };
}

// 2. Reddit Inactive / Deleted Community Detection:
if (html.includes("We couldn't find that community") || html.includes('community has been banned') || status === 404) {
  return { isExpired: true, expiredReason: 'Subreddit does not exist or has been banned.' };
}

// 3. WhatsApp Revoked Link Detection:
if (html.includes('This invite link was revoked') || html.includes('reset this invite link') || html.includes('Invite link is invalid')) {
  return { isExpired: true, expiredReason: 'WhatsApp invite link was revoked or expired.' };
}
```

---

### 4. Critical Files Map

| File Path | Role |
| :--- | :--- |
| `src/types/index.ts` | Core domain interfaces, enums, platforms, and filters |
| `src/lib/groups-dal.ts` | High-level data access layer with MySQL & Store fallback |
| `src/lib/groups-store.ts` | In-memory O(1) indexed store with disk persistence |
| `src/lib/groups-persistence.ts` | Synchronous & asynchronous disk JSON file I/O |
| `src/lib/metadata-scraper.ts` | Multi-platform metadata extractor & health analyzer |
| `src/lib/rate-limit.ts` | Sliding window IP rate limiter for submissions |
| `src/lib/content-settings.ts` | Safe-search, NSFW toggle, and runtime environment guards |
| `src/app/actions/submit-group.ts` | Server Action for visitor community submissions |
| `src/app/api/groups/route.ts` | Main REST API supporting search, filter, pagination, sorting |
| `src/app/api/scrape-metadata/route.ts` | Real-time scraper API for the submit form |
| `src/app/page.tsx` | Main directory landing page & feed |
| `src/components/GroupCard.tsx` | Interactive group card with metrics, badges & join CTA |
| `src/components/SubmitGroupModal.tsx` | Interactive submission modal with live link scraper |
| `src/components/AdminDashboardModal.tsx` | Administrative suite, bulk importer & health tools |

---

### 5. Deployment Instructions

1. **Install dependencies**: `npm install`
2. **Set environment variables** (optional for MySQL):
   ```env
   # Leave empty to run with high-performance zero-config JSON disk store:
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=grouplinks_db
   CRON_SECRET=your_secure_cron_secret
   ```
3. **Start local development**: `npm run dev` (Runs on http://localhost:3000)
4. **Build for production**: `npm run build && npm run start`
