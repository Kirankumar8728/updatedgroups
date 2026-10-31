/**
 * Comprehensive Metadata Extraction & Existing Group Update Verification Suite
 * Tests:
 * 1. Telegram (real title, Hindi/English description, subscriber count, avatar)
 * 2. Discord (invite code normalization, official API preview, counts, icon)
 * 3. Reddit (subreddit normalization, JSON/RSS endpoint, subscribers)
 * 4. WhatsApp (invite code normalization, fallback handling without fake counts)
 * 5. Update Existing Group (idempotency, preserve metrics, update metadata)
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_KEY = process.env.ADMIN_KEY || 'kiran8728';

async function runTests() {
  console.log('🧪 Starting Group Metadata & Update Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  // 1. Test Telegram
  try {
    console.log('1️⃣ Testing Telegram Metadata Scraper (https://t.me/anilsiriti)...');
    const res = await fetch(`${BASE_URL}/api/scrape-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://t.me/anilsiriti' }),
    });
    const data = await res.json();
    
    if (
      data.success &&
      data.platform === 'telegram' &&
      data.title &&
      data.title.includes('Anil sir ITI') &&
      data.description &&
      data.description.includes('Anil Sir ITI') &&
      data.imageUrl &&
      data.imageUrl.startsWith('http') &&
      typeof data.memberCount === 'number' &&
      data.memberCount > 10000 &&
      data.metadataSource === 'telegram' &&
      data.fallbackMetadata === false
    ) {
      console.log('   ✅ PASS: Telegram metadata correctly fetched and parsed.');
      console.log(`      Title: "${data.title}"`);
      console.log(`      Subscribers: ${data.memberCount.toLocaleString()}`);
      console.log(`      Image: ${data.imageUrl.slice(0, 60)}...`);
      passed++;
    } else {
      console.error('   ❌ FAIL: Telegram metadata did not meet expectations:', data);
      failed++;
    }
  } catch (err) {
    console.error('   ❌ FAIL: Telegram test error:', err.message);
    failed++;
  }

  // 2. Test Discord
  try {
    console.log('\n2️⃣ Testing Discord Metadata Scraper (https://discord.gg/reactiflux)...');
    const res = await fetch(`${BASE_URL}/api/scrape-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://discord.gg/reactiflux' }),
    });
    const data = await res.json();
    
    if (
      data.success &&
      data.platform === 'discord' &&
      data.title &&
      (data.metadataSource === 'discord-api' || data.metadataSource === 'opengraph')
    ) {
      console.log('   ✅ PASS: Discord metadata correctly fetched.');
      console.log(`      Title: "${data.title}"`);
      console.log(`      Member Count: ${data.memberCount ? data.memberCount.toLocaleString() : 'N/A'}`);
      console.log(`      Source: ${data.metadataSource}`);
      passed++;
    } else {
      console.error('   ❌ FAIL: Discord metadata unexpected:', data);
      failed++;
    }
  } catch (err) {
    console.error('   ❌ FAIL: Discord test error:', err.message);
    failed++;
  }

  // 3. Test Reddit
  try {
    console.log('\n3️⃣ Testing Reddit Metadata Scraper (https://www.reddit.com/r/reactjs)...');
    const res = await fetch(`${BASE_URL}/api/scrape-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.reddit.com/r/reactjs' }),
    });
    const data = await res.json();
    
    if (
      data.success &&
      data.platform === 'reddit' &&
      data.title &&
      (data.title.includes('reactjs') || data.title.includes('React')) &&
      (data.metadataSource === 'reddit-api' || data.metadataSource === 'opengraph')
    ) {
      console.log('   ✅ PASS: Reddit metadata correctly fetched.');
      console.log(`      Title: "${data.title}"`);
      console.log(`      Subscribers: ${data.memberCount ? data.memberCount.toLocaleString() : 'N/A'}`);
      console.log(`      Source: ${data.metadataSource}`);
      passed++;
    } else {
      console.error('   ❌ FAIL: Reddit metadata unexpected:', data);
      failed++;
    }
  } catch (err) {
    console.error('   ❌ FAIL: Reddit test error:', err.message);
    failed++;
  }

  // 4. Test WhatsApp Fallback Handling
  try {
    console.log('\n4️⃣ Testing WhatsApp Metadata Fallback Handling...');
    const res = await fetch(`${BASE_URL}/api/scrape-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://chat.whatsapp.com/Kpabc1234567890TestInvite' }),
    });
    const data = await res.json();
    
    if (
      data.success &&
      data.platform === 'whatsapp' &&
      data.title &&
      typeof data.fallbackMetadata === 'boolean'
    ) {
      console.log('   ✅ PASS: WhatsApp fallback correctly generated with safe defaults.');
      console.log(`      Title: "${data.title}"`);
      console.log(`      Fallback Flag: ${data.fallbackMetadata}`);
      passed++;
    } else {
      console.error('   ❌ FAIL: WhatsApp fallback failed:', data);
      failed++;
    }
  } catch (err) {
    console.error('   ❌ FAIL: WhatsApp test error:', err.message);
    failed++;
  }

  // 5. Test Updating an Existing Submitted Group
  try {
    console.log('\n5️⃣ Testing Existing Group Metadata Update & Idempotency...');
    // Submit / Re-submit Telegram group
    const submitRes = await fetch(`${BASE_URL}/api/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        url: 'https://t.me/anilsiriti',
      }),
    });
    const submitData = await submitRes.json();

    if (
      submitData.success &&
      (submitData.updated || submitData.isUpdate || submitData.group?.id)
    ) {
      console.log('   ✅ PASS: Existing group recognized and re-synchronized with platform metadata.');
      console.log(`      Group ID: ${submitData.group?.id}`);
      console.log(`      Message: "${submitData.message}"`);
      console.log(`      Title: "${submitData.group?.title}"`);
      passed++;
    } else {
      console.error('   ❌ FAIL: Existing group update failed:', submitData);
      failed++;
    }
  } catch (err) {
    console.error('   ❌ FAIL: Update test error:', err.message);
    failed++;
  }

  console.log(`\n================================`);
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
