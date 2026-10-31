import { parse } from 'node-html-parser';

async function testReddit() {
  const url = 'https://old.reddit.com/r/Damnthatsinteresting/';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Accept': 'text/html',
    },
  });

  console.log('HTTP Status:', res.status);
  if (res.ok) {
    const html = await res.text();
    const root = parse(html);

    const subText = root.querySelector('.subscribers .number')?.text || '';
    console.log('Subscriber number from HTML:', subText);

    const ogImg = root.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    console.log('OG Image:', ogImg);

    const headerImg = root.querySelector('#header-img')?.getAttribute('src') || '';
    console.log('Header Image:', headerImg);
  }
}

testReddit();
