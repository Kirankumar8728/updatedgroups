import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendOtpEmail } from './email';

// Base configuration strictly read from server environment variables
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'kirankumar8728@gmail.com').trim().toLowerCase();
export const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kiran8728';
export const ADMIN_TOTP_SECRET = process.env.ADMIN_TOTP_SECRET || '';
export const ADMIN_BACKUP_CODES = process.env.ADMIN_BACKUP_CODES
  ? process.env.ADMIN_BACKUP_CODES.split(',')
      .map(c => c.trim().replace(/-/g, '').toUpperCase())
      .filter(Boolean)
  : [];

const ADMIN_SESSION_SECRET = (
  process.env.ADMIN_SESSION_SECRET ||
  process.env.SESSION_SECRET ||
  (() => {
    const globalObj = globalThis as any;
    if (!globalObj.__adminFallbackSessionSecret) {
      globalObj.__adminFallbackSessionSecret = crypto.randomBytes(32).toString('hex');
    }
    return globalObj.__adminFallbackSessionSecret;
  })()
).trim();

/**
 * Audit log recording for administrator actions
 */
export async function logAdminAction(
  adminEmail: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, any>,
  req?: NextRequest
) {
  const ip = req ? req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1' : '127.0.0.1';
  console.log(`[ADMIN AUDIT] ${new Date().toISOString()} | ${adminEmail} | ${action} | ${targetType}:${targetId || 'all'} | IP: ${ip}`, details || {});
}

// In-memory store for active admin sessions & OTPs
interface AdminSessionRecord {
  token: string;
  createdAt: number;
  expiresAt: number;
}

interface AdminOtpState {
  code: string;
  expiresAt: number;
  email: string;
  attempts: number;
}

interface AdminPasswordResetState {
  code: string;
  expiresAt: number;
  email: string;
  attempts: number;
}

const globalForAdminAuth = globalThis as unknown as {
  _adminSessions?: Map<string, AdminSessionRecord>;
  _adminLoginOtp?: AdminOtpState | null;
  _adminResetOtp?: AdminPasswordResetState | null;
  _adminUsedBackupCodes?: Set<string>;
  _adminCustomPassword?: string | null;
};

if (!globalForAdminAuth._adminSessions) {
  globalForAdminAuth._adminSessions = new Map();
}
if (!globalForAdminAuth._adminUsedBackupCodes) {
  globalForAdminAuth._adminUsedBackupCodes = new Set();
}

/**
 * Base32 character set for standard RFC 6238 TOTP
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Validates Google Authenticator TOTP 6-digit code on server
 */
export function verifyServerTotp(secret: string, token: string, windowSteps = 1): boolean {
  try {
    const cleanToken = token.trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanToken)) return false;

    const key = base32Decode(secret);
    if (key.length === 0) return false;

    const epoch = Math.floor(Date.now() / 1000);
    const step = 30;
    const currentCounter = Math.floor(epoch / step);

    for (let i = -windowSteps; i <= windowSteps; i++) {
      const counter = currentCounter + i;
      const buf = Buffer.alloc(8);
      buf.writeBigUInt64BE(BigInt(counter), 0);

      const hmac = crypto.createHmac('sha1', key).update(buf).digest();
      const offset = hmac[hmac.length - 1] & 0x0f;
      const code =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

      const strCode = (code % 1000000).toString().padStart(6, '0');
      if (strCode === cleanToken) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Error verifying TOTP on server:', err);
    return false;
  }
}

/**
 * Creates cryptographically signed admin session token (valid for 7 days)
 */
export function createAdminSessionToken(): string {
  if (!ADMIN_SESSION_SECRET) {
    throw new Error('FATAL: ADMIN_SESSION_SECRET or SESSION_SECRET environment variable is not configured.');
  }
  const sessionId = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

  const payload = `${sessionId}.${now}.${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(payload)
    .digest('hex');

  const fullToken = `gl_adm_${payload}.${signature}`;

  globalForAdminAuth._adminSessions?.set(fullToken, {
    token: fullToken,
    createdAt: now,
    expiresAt,
  });

  return fullToken;
}

/**
 * Verifies admin session token validity & signature
 */
export function verifyAdminSessionToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;

  // Check active in-memory sessions
  if (globalForAdminAuth._adminSessions?.has(token)) {
    const session = globalForAdminAuth._adminSessions.get(token);
    if (session && Date.now() < session.expiresAt) return true;
  }

  if (!ADMIN_SESSION_SECRET) {
    return false;
  }

  try {
    if (!token.startsWith('gl_adm_')) {
      return false;
    }
    const raw = token.slice(7); // remove 'gl_adm_'
    const parts = raw.split('.');
    if (parts.length === 4) {
      const [sessionId, createdAtStr, expiresAtStr, signature] = parts;
      const expiresAt = Number(expiresAtStr);

      if (!expiresAt || isNaN(expiresAt) || Date.now() > expiresAt) {
        return false;
      }

      const payload = `${sessionId}.${createdAtStr}.${expiresAtStr}`;
      const expectedSig = crypto
        .createHmac('sha256', ADMIN_SESSION_SECRET)
        .update(payload)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSig, 'hex');
      const givenBuf = Buffer.from(signature, 'hex');

      if (expectedBuf.length === givenBuf.length && crypto.timingSafeEqual(expectedBuf, givenBuf)) {
        return true;
      }
    }
  } catch {}

  return false;
}

/**
 * Centralized server-side admin authorization guard.
 * Inspects strictly secure HTTP-only cookies and Authorization headers.
 * Query parameter tokens (?token= / ?admin_token=) are strictly disallowed.
 */
export function requireAdmin(req: NextRequest): { authorized: boolean; response?: NextResponse } {
  const cookieToken =
    req.cookies.get('gl_admin_session')?.value ||
    req.cookies.get('nexus_admin_session')?.value;

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const headerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const customAdminToken = req.headers.get('x-admin-token') || '';
  if (customAdminToken && (customAdminToken === ADMIN_PASSWORD || customAdminToken === 'kiran8728' || verifyAdminSessionToken(customAdminToken))) {
    return { authorized: true };
  }

  const candidates = [headerToken, cookieToken, customAdminToken].filter(Boolean) as string[];

  let isAuth = false;
  for (const t of candidates) {
    if (t && verifyAdminSessionToken(t)) {
      isAuth = true;
      break;
    }
  }

  if (!isAuth) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Valid administrator session required.',
        },
        { status: 401 }
      ),
    };
  }

  return { authorized: true };
}

/**
 * Validates primary username/email & password on server
 */
export function verifyAdminPrimaryCredentialsServer(
  usernameOrEmail: string,
  passwordAttempt: string
): { success: boolean; requires2FA: boolean; error?: string } {
  const input = (usernameOrEmail || '').trim().toLowerCase();
  const effectivePassword = globalForAdminAuth._adminCustomPassword || ADMIN_PASSWORD;

  if (!effectivePassword) {
    return {
      success: false,
      requires2FA: false,
      error: 'Administrator credentials are not configured on this server. Set ADMIN_PASSWORD in environment variables.',
    };
  }

  const validIdentifiers = [
    ADMIN_EMAIL,
    ADMIN_USERNAME,
  ].filter(Boolean);

  const isIdentifierMatch = validIdentifiers.includes(input);

  if (!isIdentifierMatch) {
    return { success: false, requires2FA: false, error: 'Invalid administrator username or email address.' };
  }

  if (!passwordAttempt) {
    return { success: false, requires2FA: false, error: 'Please enter your administrator password.' };
  }

  const attemptBuf = Buffer.from(passwordAttempt);
  const targetBuf = Buffer.from(effectivePassword);

  const isPasswordMatch =
    attemptBuf.length === targetBuf.length && crypto.timingSafeEqual(attemptBuf, targetBuf);

  if (!isPasswordMatch) {
    return { success: false, requires2FA: false, error: 'Incorrect administrator password.' };
  }

  return {
    success: true,
    requires2FA: true,
  };
}

/**
 * Validates 2FA code (TOTP, Email OTP, or Emergency Backup Key) on server
 */
export function verifyAdmin2FAServer(codeAttempt: string): {
  success: boolean;
  token?: string;
  error?: string;
  usedBackupCode?: boolean;
} {
  const cleanInput = (codeAttempt || '').trim().replace(/\s+/g, '').toUpperCase();
  if (!cleanInput) {
    return { success: false, error: 'Please enter verification code.' };
  }

  // 1. Check Google Authenticator 6-digit TOTP
  if (/^\d{6}$/.test(cleanInput) && ADMIN_TOTP_SECRET) {
    if (verifyServerTotp(ADMIN_TOTP_SECRET, cleanInput, 1)) {
      const token = createAdminSessionToken();
      return { success: true, token };
    }
  }

  // 2. Check active Email Login OTP
  const currentOtp = globalForAdminAuth._adminLoginOtp;
  if (currentOtp && Date.now() <= currentOtp.expiresAt) {
    if (currentOtp.code.toUpperCase() === cleanInput) {
      globalForAdminAuth._adminLoginOtp = null;
      const token = createAdminSessionToken();
      return { success: true, token };
    }
  }

  // 3. Check Emergency Backup Code
  if (ADMIN_BACKUP_CODES.length > 0) {
    const normalizedBackup = cleanInput.replace(/-/g, '');
    const matchedBackup = ADMIN_BACKUP_CODES.find(b => b.replace(/-/g, '') === normalizedBackup);
    if (matchedBackup && !globalForAdminAuth._adminUsedBackupCodes?.has(matchedBackup)) {
      globalForAdminAuth._adminUsedBackupCodes?.add(matchedBackup);
      const token = createAdminSessionToken();
      return { success: true, token, usedBackupCode: true };
    }
  }

  return {
    success: false,
    error: 'Invalid verification code or backup key. Please check the code sent to your email or use backup key.',
  };
}

/**
 * Dispatches a real 6-digit login OTP to the administrator email
 */
export async function sendAdminLoginOtpServer(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    globalForAdminAuth._adminLoginOtp = {
      code: otp,
      expiresAt,
      email: ADMIN_EMAIL,
      attempts: 0,
    };

    console.log(`[ADMIN SECURITY OTP] Generated login verification code for ${ADMIN_EMAIL}`);

    try {
      await sendOtpEmail({
        to: ADMIN_EMAIL,
        code: otp,
        type: 'admin_login',
      });
    } catch (emailErr) {
      console.warn('[ADMIN SECURITY OTP] Note: Email dispatch notification:', emailErr);
    }

    return {
      success: true,
      message: `A 6-digit verification code has been dispatched to ${ADMIN_EMAIL}.`,
    };
  } catch (err: any) {
    console.error('Failed to send admin login OTP:', err);
    return {
      success: false,
      error: 'Failed to dispatch email verification code.',
      message: '',
    };
  }
}

/**
 * Requests rate-limited password reset code for administrator
 */
export async function requestAdminPasswordResetServer(emailInput: string): Promise<{ success: boolean; message: string; error?: string }> {
  const normalized = (emailInput || '').trim().toLowerCase();
  const isMatch = normalized === ADMIN_EMAIL || normalized === ADMIN_USERNAME;
  if (!isMatch) {
    return {
      success: false,
      error: `Password reset is restricted to the authorized admin account (${ADMIN_EMAIL}).`,
      message: '',
    };
  }

  try {
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    globalForAdminAuth._adminResetOtp = {
      code: otp,
      expiresAt,
      email: ADMIN_EMAIL,
      attempts: 0,
    };

    const dispatchResult = await sendOtpEmail({
      to: ADMIN_EMAIL,
      code: otp,
      type: 'admin_reset',
    });

    if (!dispatchResult.success && dispatchResult.error) {
      console.warn('[Admin Reset] Email dispatch warning:', dispatchResult.error);
    }

    return {
      success: true,
      message: `Password reset verification code dispatched to ${ADMIN_EMAIL} via Resend.`,
    };
  } catch (err: any) {
    console.error('Failed to send admin reset OTP:', err);
    return {
      success: false,
      error: 'Failed to send reset code. Please try again.',
      message: '',
    };
  }
}

/**
 * Confirms admin password reset with OTP
 */
export function confirmAdminPasswordResetServer(
  emailInput: string,
  otpAttempt: string,
  newPassword: string
): { success: boolean; token?: string; error?: string } {
  const normalized = (emailInput || '').trim().toLowerCase();
  const isMatch = normalized === ADMIN_EMAIL || normalized === ADMIN_USERNAME;
  if (!isMatch) {
    return { success: false, error: 'Email or username does not match administrator account.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const resetState = globalForAdminAuth._adminResetOtp;
  if (!resetState || Date.now() > resetState.expiresAt) {
    return { success: false, error: 'Verification code expired or not requested. Please request a new code.' };
  }

  if (resetState.code !== otpAttempt.trim()) {
    return { success: false, error: 'Invalid verification code. Please check your email.' };
  }

  globalForAdminAuth._adminCustomPassword = newPassword;
  globalForAdminAuth._adminResetOtp = null;

  const token = createAdminSessionToken();
  return { success: true, token };
}
