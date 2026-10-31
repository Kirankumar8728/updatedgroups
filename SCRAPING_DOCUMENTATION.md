# Group Links Directory - Master Web Scraping Architecture & Protocols

This document serves as the permanent technical specification and reference guide for the multi-platform metadata scraping engine in `src/lib/metadata-scraper.ts` and submission policies in `src/components/SubmitGroupView.tsx`.

---

## 1. Executive Summary & Scraping Methodology

| Platform | Primary Strategy | Fallback / Proxy Strategy | Image Domain Rule | Member Count Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Discord** | Official Unauthenticated API (`discord.com/api/v10/invites/{code}`) | OpenGraph HTML Scraper | `cdn.discordapp.com` | Exact API count (`approximate_member_count`) |
| **Telegram** | Direct SSR HTML Scraper (`t.me/s/{handle}` & `t.me/{handle}`) with Googlebot UA | OpenGraph Microservice (`api.microlink.io`) + `unavatar.io` | `cdn*.telesco.pe` | Exact HTML count (`.counter_value` / `.tgme_page_extra`). No synthetic estimation. |
| **Reddit** | Direct Web HTML Preview with `Twitterbot/1.0` UA | Subreddit Atom/RSS Feed (`.rss`) | **MUST prefer `b.thumbs.redditmedia.com`** over `styles.redditmedia.com` | Exact HTML count (`<p><strong>{count}</strong> Subscribers</p>` or `subscriber-count="{count}"`) |
| **WhatsApp** | Direct Stealth HTML Scraper (`facebookexternalhit/1.1`) | OpenGraph Microservice (`api.microlink.io`) to bypass CDN 429 rate limits | `pps.whatsapp.net` / `mmg.whatsapp.net` | Intelligent deterministic estimate (280–880) as WhatsApp hides member counts on web previews |
| **Facebook** | **Auto-Fetch Disabled** | Manual Details Mode Active | Custom User Image URL | User Input |
| **Signal** | **Auto-Fetch Disabled** | Manual Details Mode Active | Custom User Image URL | User Input |
| **Snapchat** | **Auto-Fetch Disabled** | Manual Details Mode Active | Custom User Image URL | User Input |
| **Instagram** | **Auto-Fetch Disabled** | Manual Details Mode Active | Custom User Image URL | User Input |

---

## 2. Platform-Specific Implementations & Code Rules

### A. Telegram Scraper (`fetchTelegramChannelMetadata`)

1. **User-Agent Header Pool:**
   - `Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)`
   - `TelegramBot (like TwitterBot)`
   - `Twitterbot/1.0`

2. **Endpoints Checked:**
   - `https://t.me/s/${handle}` (Public broadcast web preview)
   - `https://t.me/${handle}` (Public landing page)

3. **Exact Subscriber/Member Parsing:**
   ```typescript
   const extraText = root.querySelector('.tgme_page_extra')?.textContent?.trim() ||
     root.querySelector('.tgme_channel_info_counters')?.textContent?.trim() ||
     root.querySelector('.tgme_page_counter')?.textContent?.trim() ||
     root.querySelector('.tgme_page_subscribers')?.textContent?.trim() || '';

   let memberCount: number | undefined = undefined;
   if (extraText) {
     const parsedMembers = parseMemberCount(extraText);
     if (parsedMembers) memberCount = parsedMembers;
   }
   if (!memberCount) {
     const subMatch = html.match(/([0-9\s,.]+[KMkm]?)\s+(?:subscribers|members|users)/i);
     if (subMatch && subMatch[1]) {
       const parsedM = parseMemberCount(subMatch[1]);
       if (parsedM) memberCount = parsedM;
     }
   }
   ```

4. **Zero-Estimation Rule:**
   - If a Telegram link (e.g. personal handle `@proofiumx`) does not publish member counts on Telegram, `memberCount` remains `undefined` or `null`. Synthetic member count generation is strictly disabled for Telegram.

5. **Bio & Description Rule:**
   - Authentic user/channel bios (e.g., `"InfoCT" Legacy ;)`) are preserved verbatim without appending generic boilerplate text.

---

### B. Reddit Scraper (`scrapeRedditDirect`)

1. **User-Agent Header:**
   - `Twitterbot/1.0` or `facebookexternalhit/1.1` (Prevents Reddit 504/403 block pages).

2. **Strategy Priority:**
   - **Strategy 1:** Direct Web HTML Preview (`https://www.reddit.com/r/{subSlug}/`).
   - **Strategy 2:** Subreddit Atom/RSS Feed (`https://www.reddit.com/r/{subSlug}/.rss`).
   - **Strategy 3:** `KNOWN_SUBREDDITS` database dictionary.
   - **Strategy 4:** Category SVG community badge fallback.

3. **Image Domain Rule:**
   - Always prioritize `https://b.thumbs.redditmedia.com/` (or `[a-z].thumbs.redditmedia.com/`) over `styles.redditmedia.com`.
   ```typescript
   const thumbMatch = html.match(/https?:\/\/[a-z]\.thumbs\.redditmedia\.com\/[^\s\"\'\<\>]+/i);
   const commIconMatch = html.match(/https?:\/\/styles\.redditmedia\.com\/[^\s\"\'\<\>]*communityIcon[^\s\"\'\<\>]*/i);

   if (thumbMatch && !isGenericGroupImage(thumbMatch[0])) {
     imageUrl = thumbMatch[0].replace(/&amp;/g, '&');
   } else if (commIconMatch && !isGenericGroupImage(commIconMatch[0])) {
     imageUrl = commIconMatch[0].replace(/&amp;/g, '&');
   }
   ```

4. **Subscriber Extraction Rule:**
   ```typescript
   const subStrongMatch = html.match(/<p><strong>([\d,.]+)<\/strong>\s*Subscribers<\/p>/i) ||
     html.match(/subscriber-count="(\d+)"/i) ||
     html.match(/"subscribers":\s*(\d+)/i) ||
     html.match(/([\d,.]+)\s+(?:members|subscribers)/i);

   if (subStrongMatch && subStrongMatch[1]) {
     const parsed = parseMemberCount(subStrongMatch[1]);
     if (parsed) memberCount = parsed;
   }
   ```

---

### C. WhatsApp Scraper (`scrapeWhatsAppDirect`)

1. **429 CDN Rate Limit Bypass Strategy:**
   - Direct requests to `chat.whatsapp.com` from cloud server IPs return `HTTP 429`.
   - When direct fetch fails or returns generic titles ("WhatsApp Group Invite"), the scraper routes the request through the OpenGraph microservice:
     `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`

2. **Data Extracted:**
   - **Title:** `Manikanta Dog’s Kennel Hyderabad`
   - **Image:** `https://pps.whatsapp.net/v/t61.24694-24/646288681_1821640262304423...`
   - **Category:** `Pets & Animals`

3. **Deterministic Member Estimation:**
   ```typescript
   function estimateWhatsAppMembers(url: string, title?: string): number {
     const seed = `${url}-${title || ''}`;
     let hash = 0;
     for (let i = 0; i < seed.length; i++) {
       hash = (hash << 5) - hash + seed.charCodeAt(i);
       hash |= 0;
     }
     return 280 + (Math.abs(hash) % 600); // Realistic 280-880 range
   }
   ```

---

### D. Discord Scraper (`scrapeDiscordDirect`)

1. **Official Invite API:**
   `GET https://discord.com/api/v10/invites/{inviteCode}?with_counts=true&with_expiration=true`

2. **Data Returned:**
   - Guild Name, Guild Icon (`cdn.discordapp.com/icons/{guild.id}/{icon}.webp?size=256`), Guild Banner, `approximate_member_count`, `approximate_presence_count`.

---

### E. Auto-Fetch Disabling for Restricted Platforms (Facebook, Signal, Snapchat, Instagram)

1. **UI Policy (`src/components/SubmitGroupView.tsx`):**
   - When the user inputs a link from Facebook, Signal, Snapchat, or Instagram, the `Auto-Fetch` button is disabled (`disabled={isAutoFetchDisabledPlatform}`) with a `not-allowed` visual state.
   - An informative callout banner appears prompting the user to enter community details manually.

2. **API Endpoint Policy (`src/app/api/scrape-metadata/route.ts`):**
   - Any API request containing Facebook, Signal, Snapchat, or Instagram links returns `400 Bad Request`:
     ```json
     {
       "success": false,
       "disabled": true,
       "error": "Auto-fetch is disabled for [PLATFORM] links. Please enter community details manually."
     }
     ```

---

## 3. Reference Prompt Instructions (Re-use Prompt)

If you ever need to restore or prompt another AI engineer on these exact methods, use this system prompt snippet:

```text
Build a multi-platform metadata scraping engine for Telegram, Reddit, WhatsApp, Discord, Facebook, Signal, Snapchat, and Instagram with the following rules:

1. TELEGRAM:
   - Scrape https://t.me/s/{handle} and https://t.me/{handle} using Googlebot/Twitterbot UAs.
   - Parse exact member counts from .counter_value, .tgme_page_extra, or subscriber tags.
   - DO NOT estimate or fabricate Telegram member counts. If missing, leave as undefined.
   - Preserve exact user/channel bios without appending generic boilerplate text.
   - Extract telesco.pe photo URLs or use unavatar.io/telegram/{handle} for profile images.

2. REDDIT:
   - Scrape https://www.reddit.com/r/{subreddit}/ using Twitterbot/1.0 UA as Strategy 1.
   - ALWAYS prefer images from https://b.thumbs.redditmedia.com/ over styles.redditmedia.com.
   - Parse exact subscriber counts from <p><strong>{count}</strong> Subscribers</p> or subscriber-count attributes.
   - Fall back to RSS feed (.rss) and KNOWN_SUBREDDITS dictionary if HTML preview fails.

3. WHATSAPP:
   - Attempt direct OpenGraph fetch with facebookexternalhit/1.1 UA.
   - If direct fetch returns HTTP 429 or generic title, immediately query api.microlink.io/?url={url} as Tier 2.
   - Extract real group title and pps.whatsapp.net image URLs.
   - Assign a realistic deterministic estimated member count (280-880) specifically for WhatsApp groups.

4. DISCORD:
   - Query https://discord.com/api/v10/invites/{inviteCode}?with_counts=true.
   - Extract guild name, guild icon on cdn.discordapp.com, and approximate_member_count.

5. DISABLED AUTO-FETCH PLATFORMS (Facebook, Signal, Snapchat, Instagram):
   - Disable the Auto-Fetch UI button when Facebook, Signal, Snapchat, or Instagram links are entered.
   - Show a callout directing users to enter community title, description, and logo manually.
   - Block API scraping requests for these 4 platforms with an explicit 400 response.
```

---

## 4. Verification Test Command

To verify all platforms end-to-end, execute:

```bash
npx tsx -e "
import { scrapeGroupMetadataDirect } from './src/lib/metadata-scraper';

async function verifyAll() {
  console.log('Telegram 1:', await scrapeGroupMetadataDirect('https://t.me/proofiumx'));
  console.log('Telegram 2:', await scrapeGroupMetadataDirect('https://t.me/s/anilsiriti'));
  console.log('Reddit:', await scrapeGroupMetadataDirect('https://www.reddit.com/r/Damnthatsinteresting/'));
  console.log('WhatsApp:', await scrapeGroupMetadataDirect('https://chat.whatsapp.com/invite/HT9yJMqoSxnKawW91CcgS6'));
}
verifyAll();
"
```
