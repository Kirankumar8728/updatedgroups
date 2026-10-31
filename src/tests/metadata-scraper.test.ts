import { scrapeGroupMetadataDirect, normalizePlatformUrl } from '../lib/metadata-scraper';
import { submitGroupAction } from '../app/actions/submit-group';
import { getGroupById } from '../lib/groups-dal';

async function runMetadataTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE GROUP METADATA & UPDATE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, detail || '');
      failed++;
    }
  }

  // -----------------------------------------------------------
  // TEST 1: URL Normalization
  // -----------------------------------------------------------
  console.log('--- TEST 1: URL Normalization ---');
  const tgNorm = normalizePlatformUrl('@anilsiriti');
  assert(tgNorm.platform === 'telegram' && tgNorm.normalizedUrl === 'https://t.me/anilsiriti' && tgNorm.platformHandle === 'anilsiriti', 'Normalizes @anilsiriti to canonical t.me URL');

  const tgUrlNorm = normalizePlatformUrl('https://telegram.me/anilsiriti');
  assert(tgUrlNorm.platform === 'telegram' && tgUrlNorm.normalizedUrl === 'https://t.me/anilsiriti', 'Normalizes telegram.me/anilsiriti to https://t.me/anilsiriti');

  const discordNorm = normalizePlatformUrl('discord.gg/reactiflux');
  assert(discordNorm.platform === 'discord' && discordNorm.normalizedUrl === 'https://discord.gg/reactiflux' && discordNorm.platformHandle === 'reactiflux', 'Normalizes discord.gg/reactiflux');

  const redditNorm = normalizePlatformUrl('r/nextjs');
  assert(redditNorm.platform === 'reddit' && redditNorm.normalizedUrl === 'https://www.reddit.com/r/nextjs' && redditNorm.platformHandle === 'nextjs', 'Normalizes r/nextjs to https://www.reddit.com/r/nextjs');

  const waNorm = normalizePlatformUrl('chat.whatsapp.com/ABC123456789xyz');
  assert(waNorm.platform === 'whatsapp' && waNorm.normalizedUrl === 'https://chat.whatsapp.com/ABC123456789xyz', 'Normalizes chat.whatsapp.com');

  // -----------------------------------------------------------
  // TEST 2: Telegram Live Metadata Scraping
  // -----------------------------------------------------------
  console.log('\n--- TEST 2: Telegram Live Metadata Scraping (https://t.me/anilsiriti) ---');
  try {
    const tgData = await scrapeGroupMetadataDirect('https://t.me/anilsiriti');
    assert(Boolean(tgData.success), 'Telegram scrape request succeeded');
    assert(tgData.title.includes('Anil sir ITI') || tgData.title.includes('anilsiriti'), `Real title parsed: "${tgData.title}"`);
    assert(tgData.description.length > 20, `Real Hindi/English description preserved (length: ${tgData.description.length})`);
    assert(tgData.imageUrl.startsWith('https://'), `Real channel avatar URL fetched: ${tgData.imageUrl.slice(0, 50)}...`);
    assert(typeof tgData.memberCount === 'number' && tgData.memberCount > 1000, `Real subscriber count parsed: ${tgData.memberCount}`);
    assert(tgData.metadataSource === 'telegram', `Metadata source marked as "telegram" (got: ${tgData.metadataSource})`);
    assert(tgData.fallbackMetadata === false, 'fallbackMetadata flag is false');
  } catch (err: any) {
    assert(false, 'Telegram live scraping threw an error', err?.message);
  }

  // -----------------------------------------------------------
  // TEST 3: Discord Live API Metadata Scraping
  // -----------------------------------------------------------
  console.log('\n--- TEST 3: Discord Live API Scraping (https://discord.gg/reactiflux) ---');
  try {
    const dData = await scrapeGroupMetadataDirect('https://discord.gg/reactiflux');
    assert(Boolean(dData.success), 'Discord scrape request succeeded');
    assert(dData.title === 'Reactiflux', `Discord server name parsed accurately: "${dData.title}"`);
    assert(dData.description.includes('React'), `Discord description parsed: "${dData.description}"`);
    assert(dData.imageUrl.includes('cdn.discordapp.com'), `Discord icon URL parsed: ${dData.imageUrl}`);
    assert(typeof dData.memberCount === 'number' && dData.memberCount > 10000, `Approximate member count parsed: ${dData.memberCount}`);
    assert(dData.metadataSource === 'discord-api', 'Metadata source is "discord-api"');
    assert(dData.fallbackMetadata === false, 'fallbackMetadata flag is false');
  } catch (err: any) {
    assert(false, 'Discord live scraping threw an error', err?.message);
  }

  // -----------------------------------------------------------
  // TEST 4: Reddit Live Metadata Scraping
  // -----------------------------------------------------------
  console.log('\n--- TEST 4: Reddit Live Scraping (https://reddit.com/r/nextjs) ---');
  try {
    const rData = await scrapeGroupMetadataDirect('https://reddit.com/r/nextjs');
    assert(Boolean(rData.success), 'Reddit scrape request succeeded');
    assert(rData.title.toLowerCase().includes('nextjs') || rData.title.toLowerCase().includes('next.js'), `Subreddit title parsed: "${rData.title}"`);
    assert(rData.description.toLowerCase().includes('react') || rData.description.toLowerCase().includes('next'), `Subreddit description parsed`);
    assert(rData.metadataSource === 'reddit-api', 'Metadata source is "reddit-api"');
    assert(rData.fallbackMetadata === false, 'fallbackMetadata flag is false');
  } catch (err: any) {
    assert(false, 'Reddit live scraping threw an error', err?.message);
  }

  // -----------------------------------------------------------
  // TEST 5: WhatsApp Fallback Handling
  // -----------------------------------------------------------
  console.log('\n--- TEST 5: WhatsApp Fallback Handling ---');
  try {
    const waData = await scrapeGroupMetadataDirect('https://chat.whatsapp.com/INVALIDCODE1234567890');
    assert(Boolean(waData.success), 'WhatsApp scrape completed');
    assert(waData.fallbackMetadata === true || waData.metadataSource === 'fallback' || waData.metadataSource === 'opengraph', 'Proper fallback flags assigned');
  } catch (err: any) {
    assert(false, 'WhatsApp scraping threw an error', err?.message);
  }

  // -----------------------------------------------------------
  // TEST 6: Group Submission & Automatic Existing Group Update
  // -----------------------------------------------------------
  console.log('\n--- TEST 6: Group Submission & Existing Group Update ---');
  try {
    const subRes1 = await submitGroupAction({
      title: 'anilsiriti',
      url: 'https://t.me/anilsiriti',
      category: 'General',
      forceUpdate: true,
    });

    assert(Boolean(subRes1.success), 'First submission of https://t.me/anilsiriti succeeded');
    assert(Boolean(subRes1.group?.title.includes('Anil sir ITI')), `First submission used real fetched title: "${subRes1.group?.title}"`);

    // Resubmit / update the existing group immediately (should trigger 24-hour update cooldown)
    const subRes2 = await submitGroupAction({
      title: 'anilsiriti',
      url: 'https://t.me/anilsiriti',
      updateExisting: true,
    });

    assert(
      subRes2.success === false && subRes2.diagnosticStep === '24_HOUR_UPDATE_COOLDOWN',
      'Immediate re-update correctly blocked by 24-hour update cooldown rule'
    );

    // Resubmit with forceUpdate: true to verify authorized update functionality
    const subRes3 = await submitGroupAction({
      title: 'anilsiriti',
      url: 'https://t.me/anilsiriti',
      updateExisting: true,
      forceUpdate: true,
    });

    assert(Boolean(subRes3.success), 'Forced resubmission / update succeeded');
    assert(Boolean(subRes3.isUpdate), 'Operation correctly identified as isUpdate: true');
    assert(Boolean(subRes3.group?.title?.includes('Anil sir ITI')), `Updated record has real platform title: "${subRes3.group?.title}"`);
    assert(subRes3.group?.metadataSource === 'telegram', 'Updated record has metadataSource: telegram');
  } catch (err: any) {
    assert(false, 'Submission and update test threw an error', err?.message);
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  return { passed, failed };
}

runMetadataTestSuite()
  .then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
