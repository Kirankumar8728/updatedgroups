/**
 * Admin Authentication & Security Management (Client Utility Layer)
 * Communicates with server-side authentication endpoints (/api/admin/auth/*)
 * and manages admin session cookies and local status.
 */

import { generateBackupRecoveryCodes, verifyTotpCode } from './totp';

export const AUTHORIZED_ADMIN_EMAIL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADMIN_EMAIL) || 'kirankumar8728@gmail.com';
export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = '';
export const DEFAULT_TOTP_SECRET = '';

const ADMIN_STORAGE_KEY = 'nexus_admin_credentials_v2';
const ADMIN_SESSION_KEY = 'nexus_admin_session_token';

export type TwoFactorMethod = 'email_otp' | 'authenticator';

export interface AdminCredentials {
  email: string;
  username: string;
  passwordHash: string;
  twoFactorEnabled: boolean;
  twoFactorMethod?: TwoFactorMethod;
  twoFactorSecret: string;
  backupCodes: string[];
  lastLogin?: string;
  updatedAt?: string;
}

export interface ResetRateLimitStatus {
  allowed: boolean;
  cooldownRemainingSeconds: number;
  isLockedOut: boolean;
  lockoutRemainingMinutes: number;
  attemptsInWindow: number;
  maxAttempts: number;
}

export function getAdminCredentials(): AdminCredentials {
  if (typeof window === 'undefined') {
    return {
      email: '',
      username: 'admin',
      passwordHash: '',
      twoFactorEnabled: true,
      twoFactorMethod: 'authenticator',
      twoFactorSecret: '',
      backupCodes: [],
    };
  }

  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.email) {
        return parsed;
      }
    }
  } catch {}

  return {
    email: '',
    username: 'admin',
    passwordHash: '',
    twoFactorEnabled: true,
    twoFactorMethod: 'authenticator',
    twoFactorSecret: '',
    backupCodes: [],
  };
}

export function saveAdminCredentials(creds: AdminCredentials): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(creds));
  } catch {}
}

export function updateTwoFactorSettings(
  enabled: boolean, 
  method: TwoFactorMethod = 'authenticator',
  newSecret?: string, 
  verificationCode?: string
): { success: boolean; error?: string } {
  const creds = getAdminCredentials();
  creds.twoFactorEnabled = enabled;
  creds.twoFactorMethod = method;

  if (enabled && method === 'authenticator' && newSecret) {
    if (!verificationCode || !verifyTotpCode(newSecret, verificationCode, 1)) {
      return { 
        success: false, 
        error: 'Invalid 6-digit code from Google Authenticator. Verify that your device time is synchronized.' 
      };
    }
    creds.twoFactorSecret = newSecret;
    if (!creds.backupCodes || creds.backupCodes.length === 0) {
      creds.backupCodes = generateBackupRecoveryCodes(6);
    }
  }

  creds.updatedAt = new Date().toISOString();
  saveAdminCredentials(creds);
  return { success: true };
}

export function refreshBackupCodes(): string[] {
  const creds = getAdminCredentials();
  const newCodes = generateBackupRecoveryCodes(6);
  creds.backupCodes = newCodes;
  saveAdminCredentials(creds);
  return newCodes;
}

export function getAdminSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // Purge legacy tokens from localStorage if any remain
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem('gl_admin_session');
    localStorage.removeItem('nexus_admin_session');

    const fromSession = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (fromSession) return fromSession;

    const cookieMatch = document.cookie.match(/(?:^|;\s*)(?:gl_admin_session|nexus_admin_session)=([^;]+)/);
    if (cookieMatch && cookieMatch[1]) {
      return decodeURIComponent(cookieMatch[1]);
    }
  } catch {}
  return null;
}

export function getAdminAuthHeaders(): Record<string, string> {
  const token = getAdminSessionToken();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
  return {
    'Content-Type': 'application/json',
  };
}

export function isUserAdminLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const token = getAdminSessionToken();
    return Boolean(token && (token.startsWith('gl_adm_') || token.startsWith('nexus_admin_')));
  } catch {
    return false;
  }
}

export const isAdminAuthenticated = isUserAdminLoggedIn;
export const checkAdminSession = isUserAdminLoggedIn;

export function setAdminLoginSession(tokenOrBool: string | boolean): void {
  if (typeof window === 'undefined') return;
  try {
    // Security: Admin tokens must never reside in localStorage to prevent credential theft
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem('gl_admin_session');
    localStorage.removeItem('nexus_admin_session');

    if (typeof tokenOrBool === 'string') {
      sessionStorage.setItem(ADMIN_SESSION_KEY, tokenOrBool);
      document.cookie = `gl_admin_session=${encodeURIComponent(tokenOrBool)}; path=/; max-age=604800; SameSite=Lax`;
    } else if (tokenOrBool === true) {
      const existingToken = sessionStorage.getItem(ADMIN_SESSION_KEY) || `gl_adm_active_${Date.now()}`;
      sessionStorage.setItem(ADMIN_SESSION_KEY, existingToken);
      document.cookie = `gl_admin_session=${encodeURIComponent(existingToken)}; path=/; max-age=604800; SameSite=Lax`;
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      document.cookie = 'gl_admin_session=; path=/; max-age=0; SameSite=Lax';
    }
  } catch (err) {
    console.warn('Error updating admin session storage:', err);
  }
}

export async function clearAdminSession(): Promise<void> {
  setAdminLoginSession(false);
  try {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
  } catch {}
}

export const clearAdminLoginSession = clearAdminSession;

/**
 * Validates primary username/email & password against server API
 */
export async function verifyAdminPrimaryCredentials(
  usernameOrEmail: string,
  passwordAttempt: string
): Promise<{ success: boolean; requires2FA: boolean; twoFactorMethod?: TwoFactorMethod; error?: string }> {
  try {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password: passwordAttempt }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        requires2FA: false,
        error: data.error || 'Invalid administrator username, email, or password.',
      };
    }

    return {
      success: true,
      requires2FA: Boolean(data.requires2FA),
      twoFactorMethod: data.twoFactorMethod || 'authenticator',
    };
  } catch (err: any) {
    return {
      success: false,
      requires2FA: false,
      error: err.message || 'Connection to authentication service failed.',
    };
  }
}

/**
 * Validates 2FA code (Authenticator TOTP, Email OTP, or Emergency Backup Key) against server
 */
export async function verifyAdmin2FACode(
  codeAttempt: string
): Promise<{ success: boolean; error?: string; usedBackupCode?: boolean; token?: string }> {
  try {
    const res = await fetch('/api/admin/auth/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeAttempt }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Invalid verification code or emergency backup key.',
      };
    }

    if (data.token) {
      setAdminLoginSession(data.token);
    } else {
      setAdminLoginSession(true);
    }

    return {
      success: true,
      token: data.token,
      usedBackupCode: data.usedBackupCode,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Verification service request failed.',
    };
  }
}

export const verifyAdminLoginOtp = verifyAdmin2FACode;

/**
 * Requests 6-digit email OTP from server
 */
export async function requestAdminLoginOtp(
  emailOrUsername?: string
): Promise<{ success: boolean; email: string; message: string; cooldownRemainingSeconds?: number }> {
  try {
    const res = await fetch('/api/admin/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrUsername || AUTHORIZED_ADMIN_EMAIL }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        email: AUTHORIZED_ADMIN_EMAIL,
        message: data.error || 'Failed to dispatch email verification code.',
      };
    }

    return {
      success: true,
      email: AUTHORIZED_ADMIN_EMAIL,
      message: data.message || `A 6-digit verification code was sent to ${AUTHORIZED_ADMIN_EMAIL}.`,
      cooldownRemainingSeconds: 60,
    };
  } catch (err: any) {
    return {
      success: false,
      email: AUTHORIZED_ADMIN_EMAIL,
      message: err.message || 'Error connecting to email service.',
    };
  }
}

/**
 * Request password reset OTP from server
 */
export async function requestPasswordReset(
  emailInput: string
): Promise<{ success: boolean; message: string; cooldownRemainingSeconds?: number }> {
  try {
    const res = await fetch('/api/admin/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request', email: emailInput }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error || 'Password reset request failed.',
      };
    }

    return {
      success: true,
      message: data.message || `Password reset code sent to ${AUTHORIZED_ADMIN_EMAIL}.`,
      cooldownRemainingSeconds: 60,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to request password reset.',
    };
  }
}

/**
 * Confirm password reset with OTP on server
 */
export async function confirmPasswordReset(
  emailInput: string,
  otpAttempt: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm',
        email: emailInput,
        otp: otpAttempt,
        newPassword,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to reset password.',
      };
    }

    if (data.token) {
      setAdminLoginSession(data.token);
    } else {
      setAdminLoginSession(true);
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Password reset verification failed.',
    };
  }
}

export function getResetRateLimitStatus(): ResetRateLimitStatus {
  return {
    allowed: true,
    cooldownRemainingSeconds: 0,
    isLockedOut: false,
    lockoutRemainingMinutes: 0,
    attemptsInWindow: 0,
    maxAttempts: 3,
  };
}

export function getLoginOtpRateLimitStatus(): ResetRateLimitStatus {
  return {
    allowed: true,
    cooldownRemainingSeconds: 0,
    isLockedOut: false,
    lockoutRemainingMinutes: 0,
    attemptsInWindow: 0,
    maxAttempts: 5,
  };
}
