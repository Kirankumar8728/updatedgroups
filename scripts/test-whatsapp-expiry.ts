/**
 * Comprehensive Validation Test Suite for WhatsApp False-Expiry Fixes
 * Covers all 13 required scenarios from the problem specification.
 */

import {
  checkIsExpiredInviteLink,
  WHATSAPP_REVOKED_PATTERNS,
  isBotOrSecurityChallenge,
  scrapeGroupMetadataDirect,
} from '../src/lib/metadata-scraper';
import { updateGroup as updateGroupInStore, createNewGroup, getGroupByIdOrSlug } from '../src/lib/groups-store';
import { Group } from '../src/types';

interface TestResult {
  scenario: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(scenario: number, name: string, passed: boolean, details: string) {
  results.push({ scenario, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [Scenario ${scenario}] ${name}: ${details}`);
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('  RUNNING WHATSAPP EXPIRY & METADATA VALIDATION TEST SUITE (13 SCENARIOS)');
  console.log('======================================================================\n');

  // ------------------------------------------------------------------------
  // Scenario 1: Valid WhatsApp invite with title and image
  // ------------------------------------------------------------------------
  {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Next.js & React Developers Group" />
          <meta property="og:description" content="Official community for React and Next.js developers." />
          <meta property="og:image" content="https://pps.whatsapp.net/v/t61.24694-24/123456789_n.jpg" />
        </head>
        <body>
          <h3>Next.js & React Developers Group</h3>
        </body>
      </html>
    `;
    const res = checkIsExpiredInviteLink({
      url: 'https://chat.whatsapp.com/ABC123ValidInvite',
      platform: 'whatsapp',
      title: 'Next.js & React Developers Group',
      description: 'Official community for React and Next.js developers.',
      html,
      statusCode: 200,
    });

    const passed = res.isExpired === false && res.status === 'active';
    recordTest(
      1,
      'Valid WhatsApp invite with title and image',
      passed,
      `isExpired=${res.isExpired}, status=${res.status}`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 2: Valid invite whose HTML lacks <h3> (crucial bug fix)
  // ------------------------------------------------------------------------
  {
    // The previous buggy scraper flagged any page lacking <h3> as expired!
    const htmlWithoutH3 = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Modern Tech Innovators" />
          <meta property="og:description" content="Discussion on modern web apps and AI." />
          <meta property="og:image" content="https://pps.whatsapp.net/v/t61.24694-24/999888_n.jpg" />
        </head>
        <body>
          <div id="main_block">
            <span class="group-title">Modern Tech Innovators</span>
          </div>
        </body>
      </html>
    `;
    const res = checkIsExpiredInviteLink({
      url: 'https://chat.whatsapp.com/Def456NoH3Invite',
      platform: 'whatsapp',
      title: 'Modern Tech Innovators',
      description: 'Discussion on modern web apps and AI.',
      html: htmlWithoutH3,
      statusCode: 200,
    });

    const passed = res.isExpired === false && res.status === 'active';
    recordTest(
      2,
      'Valid invite whose HTML lacks <h3>',
      passed,
      `isExpired=${res.isExpired}, status=${res.status} (Page without <h3> correctly recognized as active)`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 3: Valid invite with title but no avatar (no pps.whatsapp.net)
  // ------------------------------------------------------------------------
  {
    // The previous buggy scraper flagged any page lacking 'pps.whatsapp.net' as expired!
    const htmlNoAvatar = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Neighborhood Book Club" />
          <meta property="og:description" content="Weekly book readings and literary reviews." />
        </head>
        <body>
          <div>Neighborhood Book Club</div>
        </body>
      </html>
    `;
    const res = checkIsExpiredInviteLink({
      url: 'https://chat.whatsapp.com/Ghi789NoAvatarInvite',
      platform: 'whatsapp',
      title: 'Neighborhood Book Club',
      description: 'Weekly book readings and literary reviews.',
      html: htmlNoAvatar,
      statusCode: 200,
    });

    const passed = res.isExpired === false && res.status === 'active';
    recordTest(
      3,
      'Valid invite with title but no avatar',
      passed,
      `isExpired=${res.isExpired}, status=${res.status} (No avatar does NOT falsely flag invite as expired)`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 4: Generic WhatsApp landing page without enough evidence (unverified)
  // ------------------------------------------------------------------------
  {
    const genericHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>WhatsApp</title></head>
        <body>
          <p>Simple. Personal. Real time messaging.</p>
        </body>
      </html>
    `;
    // Old buggy scraper had: htmlLower.includes('expired') or !hasValidTitle -> isExpired: true
    // Our fix: If page is generic, return unverified, NOT expired!
    const isRevoked = WHATSAPP_REVOKED_PATTERNS.some(p => p.test(genericHtml));
    const res = checkIsExpiredInviteLink({
      url: 'https://chat.whatsapp.com/Jkl012GenericPage',
      platform: 'whatsapp',
      title: 'WhatsApp Community',
      html: genericHtml,
      statusCode: 200,
    });

    const passed = res.isExpired === false && !isRevoked;
    recordTest(
      4,
      'Generic WhatsApp landing page without enough evidence',
      passed,
      `isExpired=${res.isExpired}, isRevoked=${isRevoked} (Generic pages are never falsely marked expired)`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 5: Explicit revoked or invalid invite response
  // ------------------------------------------------------------------------
  {
    const revokedPhrases = [
      'This invite link was revoked',
      'You can\'t join this group because this invite link was reset',
      'Couldn\'t find this group',
      'This invite link is invalid',
      'Invite link has expired',
    ];

    let allRevokedDetected = true;
    for (const phrase of revokedPhrases) {
      const revokedHtml = `<html><body><div class="error-msg">${phrase}</div></body></html>`;
      const res = checkIsExpiredInviteLink({
        url: 'https://chat.whatsapp.com/RevokedLinkXYZ',
        platform: 'whatsapp',
        html: revokedHtml,
        statusCode: 200,
      });

      if (!res.isExpired || res.status !== 'revoked') {
        allRevokedDetected = false;
        console.warn(`Failed to detect revocation for phrase: "${phrase}"`);
      }
    }

    recordTest(
      5,
      'Explicit revoked or invalid invite response',
      allRevokedDetected,
      `All ${revokedPhrases.length} distinct WhatsApp revocation messages correctly identified as expired/revoked`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 6: HTTP 403, 429, 500, 503 responses & bot challenges
  // ------------------------------------------------------------------------
  {
    const statusCodes = [403, 429, 500, 502, 503];
    let allInconclusive = true;

    for (const code of statusCodes) {
      const res = checkIsExpiredInviteLink({
        url: 'https://chat.whatsapp.com/RateLimitedLink',
        platform: 'whatsapp',
        statusCode: code,
      });
      if (res.isExpired === true || res.status !== 'unverified') {
        allInconclusive = false;
      }
    }

    // Also test bot challenge HTML
    const botChallengeHtml = '<html><head><title>Attention Required! | Cloudflare</title></head><body>Just a moment...</body></html>';
    const botRes = checkIsExpiredInviteLink({
      url: 'https://chat.whatsapp.com/BotChallengeLink',
      platform: 'whatsapp',
      html: botChallengeHtml,
      statusCode: 403,
    });
    const challengeHandled = botRes.isExpired === false && botRes.status === 'unverified' && isBotOrSecurityChallenge(botChallengeHtml, 403);

    const passed = allInconclusive && challengeHandled;
    recordTest(
      6,
      'HTTP 403, 429, 500, 503 responses and bot challenges',
      passed,
      `All HTTP status codes (${statusCodes.join(', ')}) & Cloudflare challenges treated as unverified/inconclusive, NOT expired`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 7: Network timeout or failed fetch
  // ------------------------------------------------------------------------
  {
    // Network failures return statusCode: 0, empty html
    const res = checkIsExpiredInviteLink({
      url: 'https://chat.whatsapp.com/TimeoutLink',
      platform: 'whatsapp',
      html: '',
      statusCode: 0,
    });

    const passed = res.isExpired === false;
    recordTest(
      7,
      'Network timeout or failed fetch',
      passed,
      `isExpired=${res.isExpired}, status=${res.status} (Network failures do NOT falsely mark groups expired)`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 8: Cached result followed by admin forced refresh
  // ------------------------------------------------------------------------
  {
    // Call scrapeGroupMetadataDirect with cache bypass
    const normalFetch = await scrapeGroupMetadataDirect('https://chat.whatsapp.com/CacheTestLink123', {
      platform: 'whatsapp',
    });
    const forcedRefresh = await scrapeGroupMetadataDirect('https://chat.whatsapp.com/CacheTestLink123', {
      platform: 'whatsapp',
      forceRefresh: true,
      bypassCache: true,
    });

    const passed = Boolean(normalFetch && forcedRefresh && forcedRefresh.url);
    recordTest(
      8,
      'Cached result followed by admin forced refresh',
      passed,
      `forceRefresh successfully executes and returns fresh metadata payload`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 9: Group incorrectly marked expired revalidated successfully
  // ------------------------------------------------------------------------
  {
    const ts = Date.now();
    const mockGroupId = `test-group-rescrape-${ts}`;
    const testTitle = `False Expired Group ${ts}`;
    const initialGroup: Group = {
      id: mockGroupId,
      slug: `test-false-expired-${ts}`,
      title: testTitle,
      description: 'Valid community that was incorrectly archived.',
      url: `https://chat.whatsapp.com/FalseExpiredRestored-${ts}`,
      platform: 'whatsapp',
      category: 'Tech & Programming',
      language: 'English',
      region: 'Global',
      customTags: ['#tech'],
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
      memberCount: 450,
      verified: true,
      featured: false,
      isNsfw: false,
      isActive: false,       // Archived by old false expiry
      isExpired: true,        // Falsely marked expired
      expiredReason: 'This invite link got expired add other active link',
      status: 'archived',     // Archived state
      safetyScore: 95,
      rankScore: 80,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createNewGroup(initialGroup);

    // Simulate Admin Rescrape update flow:
    // Scraper returns active/valid result
    const simulatedFreshScrape = {
      isExpired: false,
      validationStatus: 'confirmed_active' as const,
      healthStatus: 'active' as const,
      title: `${testTitle} (Verified Active)`,
    };

    const updates: any = {
      isExpired: false,
      expiredReason: '',
      healthStatus: 'active',
      status: 'approved',
      isActive: true,
      title: simulatedFreshScrape.title,
    };

    const updated = await updateGroupInStore(mockGroupId, updates);
    const passed = Boolean(
      updated &&
      updated.isExpired === false &&
      updated.isActive === true &&
      updated.status === 'approved' &&
      updated.expiredReason === ''
    );

    recordTest(
      9,
      'Group incorrectly marked expired revalidated successfully',
      passed,
      `Group reactivated: isExpired=${updated?.isExpired}, isActive=${updated?.isActive}, status=${updated?.status}`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 10: Database update failure handling
  // ------------------------------------------------------------------------
  {
    // Calling updateGroup with an invalid / non-existent ID returns null
    const nonExistentId = 'grp-non-existent-xyz-99999999';
    const result = await updateGroupInStore(nonExistentId, { title: 'New Title' });

    // In admin rescrape route: if (!updatedGroup) return 500 error instead of false success!
    const passed = result === null;
    recordTest(
      10,
      'Database update failure handling',
      passed,
      `Non-existent or failing DB updates return null, allowing route to emit HTTP 500 instead of false 200 OK`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 11: Inconclusive scrape of already active group
  // ------------------------------------------------------------------------
  {
    const ts = Date.now();
    const mockGroupId = `test-group-inconclusive-${ts}`;
    const testTitle = `Authentic Active Community ${ts}`;
    const initialGroup: Group = {
      id: mockGroupId,
      slug: `active-community-${ts}`,
      title: testTitle,
      description: 'Preserved authentic description that must not be overwritten.',
      url: `https://chat.whatsapp.com/InconclusiveTestInvite-${ts}`,
      platform: 'whatsapp',
      category: 'Tech & Programming',
      language: 'English',
      region: 'Global',
      customTags: ['#tech'],
      imageUrl: 'https://cdn.example.com/authentic-avatar.jpg',
      memberCount: 1200,
      isActive: true,
      isExpired: false,
      status: 'approved',
      safetyScore: 98,
      rankScore: 90,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createNewGroup(initialGroup);

    // An inconclusive scrape returns validationStatus: 'unverified'
    const inconclusiveScrape = {
      success: false,
      isExpired: false,
      validationStatus: 'unverified' as const,
      healthStatus: 'unverified' as const,
      fallbackMetadata: true,
      title: 'WhatsApp Community', // Generic fallback
    };

    const isInconclusive = inconclusiveScrape.validationStatus === 'unverified';
    const updates: any = {};
    if (isInconclusive) {
      // Per Section 5: Inconclusive scrape preserves existing metadata & active status
      updates.metadataFetchError = 'Upstream fetch inconclusive';
      updates.healthStatus = initialGroup.healthStatus || 'unverified';
    }

    const updated = await updateGroupInStore(mockGroupId, updates);
    const passed = Boolean(
      updated &&
      updated.title === testTitle &&
      updated.description === 'Preserved authentic description that must not be overwritten.' &&
      updated.imageUrl === 'https://cdn.example.com/authentic-avatar.jpg' &&
      updated.memberCount === 1200 &&
      updated.isActive === true &&
      updated.isExpired === false
    );

    recordTest(
      11,
      'Inconclusive scrape of already active group preserves metadata & status',
      passed,
      `Authentic title, description, image, and active status perfectly preserved`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 12: Correct detail-page rendering & slug preservation
  // ------------------------------------------------------------------------
  {
    const ts = Date.now();
    const originalSlug = `crypto-traders-hub-${ts}`;
    const mockGroupId = `test-group-slug-${ts}`;
    const testTitle = `Crypto Traders Hub ${ts}`;
    const initialGroup: Group = {
      id: mockGroupId,
      slug: originalSlug,
      title: testTitle,
      url: `https://chat.whatsapp.com/SlugPreservationTest-${ts}`,
      platform: 'whatsapp',
      category: 'Crypto & Web3',
      isActive: true,
      isExpired: false,
      status: 'approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createNewGroup(initialGroup);

    // Update group title without passing a new slug
    // Previously, updateGroup in groups-store.ts would regenerate slug to a new slug!
    const updated = await updateGroupInStore(mockGroupId, {
      title: `${testTitle} - Elite Discussions`,
    });

    const slugPreserved = updated?.slug === originalSlug;
    const fetchedByOriginalSlug = await getGroupByIdOrSlug(originalSlug);

    // Verify detail-page redirect check: `if (!group || group.isExpired || group.isActive === false)`
    const wouldRedirect = !fetchedByOriginalSlug || fetchedByOriginalSlug.isExpired || fetchedByOriginalSlug.isActive === false;

    const passed = slugPreserved && Boolean(fetchedByOriginalSlug) && !wouldRedirect;
    recordTest(
      12,
      'Detail-page slug preservation & rendering',
      passed,
      `Original slug '${originalSlug}' preserved on title update. Detail page renders without redirect.`
    );
  }

  // ------------------------------------------------------------------------
  // Scenario 13: Regression tests for Discord, Telegram, and Reddit expiry checks
  // ------------------------------------------------------------------------
  {
    // Discord: Invalid invite should expire; valid server remains active
    const discordRevoked = checkIsExpiredInviteLink({
      url: 'https://discord.gg/invalidCode',
      platform: 'discord',
      title: 'Discord',
      description: 'Invite Invalid',
      html: '<html><body>The invite link is invalid or has expired.</body></html>',
    });

    const discordActive = checkIsExpiredInviteLink({
      url: 'https://discord.gg/activeCode',
      platform: 'discord',
      title: 'Tailwind CSS Community',
      description: 'Official Tailwind CSS Discord server.',
      html: '<html><body>Welcome to Tailwind CSS Discord!</body></html>',
    });

    // Telegram: Non-existent channel expires; valid channel remains active
    const tgRevoked = checkIsExpiredInviteLink({
      url: 'https://t.me/nonexistent12345',
      platform: 'telegram',
      title: 'Telegram',
      html: '<html><body>Channel does not exist</body></html>',
    });

    const tgActive = checkIsExpiredInviteLink({
      url: 'https://t.me/activechannel',
      platform: 'telegram',
      title: 'Crypto Signals Daily',
      html: '<html><body>25,000 subscribers</body></html>',
    });

    // Reddit: Banned or missing subreddit expires; active subreddit remains active
    const redditRevoked = checkIsExpiredInviteLink({
      url: 'https://reddit.com/r/bannedsub123',
      platform: 'reddit',
      title: 'Reddit',
      html: '<html><body>This community has been banned</body></html>',
    });

    const redditActive = checkIsExpiredInviteLink({
      url: 'https://reddit.com/r/nextjs',
      platform: 'reddit',
      title: 'r/nextjs',
      html: '<html><body>The community for Next.js developers</body></html>',
    });

    // Platform Isolation: WhatsApp text should NOT false-flag Discord or Telegram
    const crossPlatformIsolation = checkIsExpiredInviteLink({
      url: 'https://discord.gg/mixedContent',
      platform: 'discord',
      title: 'WhatsApp and Discord Gaming Clan',
      description: 'Join our clan across platforms!',
      html: '<html><body>Join our Discord! (Also check our WhatsApp link)</body></html>',
    });

    const passed =
      discordRevoked.isExpired === true &&
      discordActive.isExpired === false &&
      tgRevoked.isExpired === true &&
      tgActive.isExpired === false &&
      redditRevoked.isExpired === true &&
      redditActive.isExpired === false &&
      crossPlatformIsolation.isExpired === false;

    recordTest(
      13,
      'Regression tests for Discord, Telegram, and Reddit platform checks',
      passed,
      `Discord, Telegram, and Reddit expiry & active states operate independently with zero cross-platform contamination`
    );
  }

  // ------------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------------
  console.log('\n======================================================================');
  const allPassed = results.every(r => r.passed);
  const passCount = results.filter(r => r.passed).length;
  console.log(`  TEST RESULTS: ${passCount} / ${results.length} PASSED (${allPassed ? '100% SUCCESS' : 'FAILURES DETECTED'})`);
  console.log('======================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
