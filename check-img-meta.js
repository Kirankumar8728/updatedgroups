import sharp from 'sharp';
import fs from 'fs';

async function checkImage(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  try {
    const metadata = await sharp(filePath).metadata();
    console.log(`Metadata for ${filePath}:`, JSON.stringify(metadata, null, 2));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
}

async function run() {
  await checkImage('public/image/snapchat/upload/ddddddd.webp');
  await checkImage('public/images/snapchat/ddddddd/image1.webp');
}

run();
