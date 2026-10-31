const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_KEY = process.env.ADMIN_KEY || 'kiran8728';

async function verifyAll() {
  console.log('🚀 Running Full Platform Fetching & Publishing Verification...\n');
  let passCount = 0;
  let testCount = 0;

  const testCases = [
    {
      platform: 'Telegram',
      url: 'https://t.me/durov',
      expectedPlatform: 'telegram',
    },
    {
      platform: 'Discord',
      url: 'https://discord.gg/reactiflux',
      expectedPlatform: 'discord',
    },
    {
      platform: 'Reddit',
      url: 'https://www.reddit.com/r/technology',
      expectedPlatform: 'reddit',
    },
    {
      platform: 'WhatsApp',
      url: 'https://chat.whatsapp.com/J1234567890abcdefghij',
      expectedPlatform: 'whatsapp',
    },
    {
      platform: 'Signal',
      url: 'https://signal.group/#CjQKIB3e9K1234567890abcdef',
      expectedPlatform: 'signal',
    },
    {
      platform: 'Facebook',
      url: 'https://www.facebook.com/groups/designerscommunity',
      expectedPlatform: 'facebook',
    },
    {
      platform: 'Snapchat',
      url: 'https://snapchat.com/t/SampleSnapGroup',
      expectedPlatform: 'snapchat',
    },
  ];

  for (const tc of testCases) {
    testCount++;
    console.log(`[${testCount}] Testing ${tc.platform} scraping: ${tc.url}`);
    try {
      const res = await fetch(`${BASE_URL}/api/scrape-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tc.url }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.platform === tc.expectedPlatform && data.title) {
        console.log(`    ✅ SUCCESS: [${tc.platform}] Title="${data.title}", Members=${data.memberCount || 'N/A'}, Image=${data.imageUrl ? data.imageUrl.slice(0, 45) + '...' : 'none'}`);
        if (tc.expectedPlatform === 'telegram' && data.title.includes('(Telegram Group)')) {
          console.error(`    ❌ FAILED: Found '(Telegram Group)' in Telegram title: "${data.title}"`);
        } else {
          passCount++;
        }
      } else {
        console.error(`    ❌ FAILED: Unexpected response for ${tc.platform}:`, data);
      }
    } catch (err) {
      console.error(`    ❌ FAILED: ${tc.platform} error:`, err.message);
    }
  }

  // TEST PUBLISHING: Submit a new verified community and check publication
  testCount++;
  console.log(`\n[${testCount}] Testing Community Submission & Publication Pipeline...`);
  const uniqueTitle = `Test Tech Hub ${Date.now()}`;
  const testUrl = `https://t.me/tech_hub_test_${Date.now()}`;

  try {
    const pubRes = await fetch(`${BASE_URL}/api/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        title: uniqueTitle,
        url: testUrl,
        category: 'Tech & Programming',
        description: 'A test tech community created to verify publishing pipeline integrity.',
        platform: 'telegram',
        language: 'English',
        customTags: ['#tech', '#programming', '#verified'],
      }),
    });

    const pubData = await pubRes.json();
    if (pubRes.ok && (pubData.success || pubData.group)) {
      const savedGroup = pubData.group || pubData.data;
      console.log(`    ✅ SUCCESS: Group published successfully! ID=${savedGroup.id}, Slug=${savedGroup.slug}, Status=${savedGroup.status}`);

      console.log(`    🔍 Verifying published group in directory index...`);
      const searchRes = await fetch(`${BASE_URL}/api/groups?search=${encodeURIComponent(uniqueTitle)}`);
      const searchData = await searchRes.json();

      const found = searchData.groups?.some(g => g.id === savedGroup.id || g.title === uniqueTitle);
      if (found) {
        console.log(`    ✅ SUCCESS: Published group is immediately discoverable in directory search!`);
        passCount++;
      } else {
        console.log(`    ⚠️ Group saved but not yet in search index, checking getById...`);
        const directRes = await fetch(`${BASE_URL}/api/groups/${savedGroup.id}`);
        if (directRes.ok) {
          console.log(`    ✅ SUCCESS: Group directly accessible by ID!`);
          passCount++;
        } else {
          console.error(`    ❌ FAILED: Group not found in directory query.`);
        }
      }
    } else {
      console.error(`    ❌ FAILED: Publication error:`, pubData);
    }
  } catch (pubErr) {
    console.error(`    ❌ FAILED: Publication exception:`, pubErr.message);
  }

  console.log(`\n========================================`);
  console.log(`Verification Complete: ${passCount}/${testCount} Passed`);
  console.log(`========================================\n`);

  if (passCount !== testCount) {
    process.exit(1);
  }
}

verifyAll();
