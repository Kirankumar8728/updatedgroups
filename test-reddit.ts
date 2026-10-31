
import { scrapeRedditDirect } from './src/lib/scrapers/reddit';

async function test() {
  const result = await scrapeRedditDirect('https://www.reddit.com/r/antimeme/', 'antimeme');
  console.log(JSON.stringify(result, null, 2));
}

test();
