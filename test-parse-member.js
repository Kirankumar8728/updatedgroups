import { parseMemberCount } from './src/lib/scrapers/utils.js';

const testCases = [
  '480 members',
  '1.2k members',
  '1200 members',
  '50 subscribers',
  '1.5M subscribers',
  '123 members',
];

for (const tc of testCases) {
  console.log(`Input: "${tc}" -> Result: ${parseMemberCount(tc)}`);
}
