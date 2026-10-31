/**
 * RFC 6238 TOTP (Time-based One-Time Password) & Base32 Engine
 * Compatible with Google Authenticator, Microsoft Authenticator, Authy, and 1Password.
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generates a random Base32 secret key (16 or 32 characters)
 */
export function generateBase32Secret(length: number = 16): string {
  let secret = '';
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : null;
  
  if (cryptoObj && cryptoObj.getRandomValues) {
    const randomBytes = new Uint8Array(length);
    cryptoObj.getRandomValues(randomBytes);
    for (let i = 0; i < length; i++) {
      secret += BASE32_CHARS[randomBytes[i] % BASE32_CHARS.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      secret += BASE32_CHARS[Math.floor(Math.random() * BASE32_CHARS.length)];
    }
  }
  return secret;
}

/**
 * Decodes a Base32 string to Uint8Array
 */
export function base32ToBytes(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/[\s=-]/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

/**
 * Pure JavaScript HMAC-SHA1 implementation for fast client-side TOTP calculation
 */
function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let keyPadded: Uint8Array;

  if (key.length > blockSize) {
    keyPadded = sha1(key);
  } else {
    keyPadded = new Uint8Array(blockSize);
    keyPadded.set(key);
  }

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = keyPadded[i] ^ 0x5c;
    iKeyPad[i] = keyPadded[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(iKeyPad.length + message.length);
  innerMsg.set(iKeyPad, 0);
  innerMsg.set(message, iKeyPad.length);
  const innerHash = sha1(innerMsg);

  const outerMsg = new Uint8Array(oKeyPad.length + innerHash.length);
  outerMsg.set(oKeyPad, 0);
  outerMsg.set(innerHash, oKeyPad.length);
  return sha1(outerMsg);
}

/**
 * Pure JavaScript SHA-1 implementation
 */
function sha1(bytes: Uint8Array): Uint8Array {
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const bitLength = bytes.length * 8;
  const paddingLength = (bytes.length % 64 < 56) ? 56 - (bytes.length % 64) : 120 - (bytes.length % 64);
  const totalLength = bytes.length + paddingLength + 8;
  const padded = new Uint8Array(totalLength);
  padded.set(bytes, 0);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLength - 4, bitLength, false);

  const w = new Uint32Array(80);

  for (let i = 0; i < totalLength; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 80; j++) {
      w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f = 0;
      let k = 0;
      if (j < 20) {
        f = (b & c) | ((~b) & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (rotl(a, 5) + f + e + k + w[j]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const result = new Uint8Array(20);
  const outView = new DataView(result.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  return result;
}

function rotl(n: number, s: number): number {
  return ((n << s) | (n >>> (32 - s))) >>> 0;
}

/**
 * Calculates 6-digit TOTP code for a given timestamp
 */
export function generateTotpCode(secretBase32: string, timeStepSeconds: number = 30, timestampMs: number = Date.now()): string {
  try {
    const key = base32ToBytes(secretBase32);
    if (key.length === 0) return '000000';

    const counter = Math.floor(timestampMs / 1000 / timeStepSeconds);
    const counterBytes = new Uint8Array(8);
    let tempCounter = counter;
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = tempCounter & 0xff;
      tempCounter = Math.floor(tempCounter / 256);
    }

    const hash = hmacSha1(key, counterBytes);
    const offset = hash[hash.length - 1] & 0x0f;
    const binary = ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    return otp;
  } catch (err) {
    console.error('Error generating TOTP:', err);
    return '000000';
  }
}

/**
 * Verifies a 6-digit code against the secret key with window drift allowance (±1 step / 30s)
 */
export function verifyTotpCode(
  secretBase32: string, 
  userCode: string, 
  windowSteps: number = 1,
  timeStepSeconds: number = 30
): boolean {
  const cleanCode = userCode.trim().replace(/\s+/g, '');
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return false;
  }

  const now = Date.now();
  for (let i = -windowSteps; i <= windowSteps; i++) {
    const testTime = now + (i * timeStepSeconds * 1000);
    const expected = generateTotpCode(secretBase32, timeStepSeconds, testTime);
    if (expected === cleanCode) {
      return true;
    }
  }
  return false;
}

/**
 * Generates an otpauth:// URI for Google Authenticator QR Code
 */
export function getOtpAuthUri(
  secretBase32: string,
  accountName: string = 'kirankumar8728@gmail.com',
  issuer: string = 'GroupLinks'
): string {
  const cleanSecret = secretBase32.replace(/\s+/g, '').toUpperCase();
  const cleanIssuer = issuer.trim();
  const encIssuer = encodeURIComponent(cleanIssuer);
  const encAccount = encodeURIComponent(accountName.trim());
  return `otpauth://totp/${encIssuer}:${encAccount}?secret=${cleanSecret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Format secret key into readable 4-character blocks for manual entry
 */
export function formatSecretKey(secret: string): string {
  const clean = secret.replace(/\s+/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

/**
 * Generate a set of 6 emergency recovery backup codes
 */
export function generateBackupRecoveryCodes(count: number = 6): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const part1 = Math.floor(1000 + Math.random() * 9000).toString();
    const part2 = Math.floor(1000 + Math.random() * 9000).toString();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}
