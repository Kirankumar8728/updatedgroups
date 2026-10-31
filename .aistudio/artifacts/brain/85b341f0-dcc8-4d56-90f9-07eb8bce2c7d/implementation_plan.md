# Implementation Plan - Precise Error Page Detection for Reddit, Discord, and Telegram

## Goal
Implement robust, exact-phrase matching in metadata scrapers to catch the exact error states shown in the user's screenshots:
1. **Reddit**: `"We couldn't find that community"` (e.g. `r/Damnthatsinterestingg`).
2. **Discord**: `"Invite Invalid"` / `"This invite may be expired"` (e.g. `discord.com/invite/eZJzqpWxKsd`).
3. **Telegram**: `"If you have Telegram, you can contact"` / `"contact @"` / `tgme_page_user` (e.g. `t.me/proofiumxx`).

When detected, block publication immediately and show the red inline error banner with: `"This invite link got expired add other active link"`.

## Proposed Changes

### 1. Enhanced Expiry Checkers (`src/lib/metadata-scraper.ts`)
- **Reddit (`scrapeRedditDirect` & `checkIsExpiredInviteLink`)**: Check if HTML or title contains `"we couldn't find that community"`. If so, return `isExpired: true`.
- **Discord (`scrapeDiscordDirect` & `checkIsExpiredInviteLink`)**: Check if API response or HTML contains `"invite invalid"` or `"unknown invite"`. If so, return `isExpired: true`.
- **Telegram (`fetchTelegramChannelMetadata` & `checkIsExpiredInviteLink`)**: Check if HTML contains `"if you have telegram, you can contact"` or `"contact @"`. If so, return `isExpired: true`.

### 2. Frontend & Backend Enforcement (`src/app/actions/submit-group.ts`, `src/app/api/groups/route.ts`, and `SubmitGroupView.tsx`)
- Ensure all submission endpoints reject `isExpired: true` with `"This invite link got expired add other active link"`.
- Ensure `SubmitGroupView.tsx` catches this and displays the red inline error banner on the submit form.

## Verification Plan
- Run `npx tsc --noEmit` to verify type safety.
- Test scraping the exact URLs provided by the user (`https://www.reddit.com/r/Damnthatsinterestingg/`, `https://discord.com/invite/eZJzqpWxKsd`, `https://t.me/proofiumxx`) to verify they are correctly flagged as expired and publishing is blocked.
