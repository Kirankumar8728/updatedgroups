import crypto from 'crypto';

/**
 * Cryptographically secure password hashing and verification utility.
 * Uses PBKDF2 with SHA-512 and 100,000 iterations with a unique 16-byte random salt.
 * This is NIST and OWASP compliant, resilient against dictionary and rainbow table attacks.
 */

const ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = 'sha512';
const PREFIX = 'pbkdf2';

/**
 * Validates password strength (minimum 6 characters).
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password cannot exceed 128 characters' };
  }
  return { valid: true };
}

/**
 * Hashes a plaintext password using a cryptographically random salt and PBKDF2-SHA512.
 * Output format: pbkdf2$100000$<salt_hex>$<hash_hex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${PREFIX}$${ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verifies a plaintext password against a stored hashed password.
 * Uses timingSafeEqual to guard against timing analysis attacks.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash || typeof storedHash !== 'string') {
    return false;
  }

  try {
    // Format: pbkdf2$<iterations>$<salt>$<hash>
    const parts = storedHash.split('$');
    if (parts.length === 4 && parts[0] === PREFIX) {
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const originalHash = parts[3];

      if (!salt || !originalHash || isNaN(iterations)) return false;

      const derivedHash = crypto.pbkdf2Sync(password, salt, iterations, KEY_LEN, DIGEST).toString('hex');
      
      const originalBuf = Buffer.from(originalHash, 'hex');
      const derivedBuf = Buffer.from(derivedHash, 'hex');

      if (originalBuf.length !== derivedBuf.length) return false;
      return crypto.timingSafeEqual(originalBuf, derivedBuf);
    }

    // Fallback support for simple sha256 or legacy formats if any
    return false;
  } catch (err) {
    console.error('[PasswordUtils] Verification error:', err);
    return false;
  }
}
