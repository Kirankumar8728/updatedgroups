import { UserProfile, CreditTransaction, CommunityClaim, PromotionVerificationRequest, UserTrackingLink } from '@/src/types/user';

const AUTH_STORAGE_KEY = 'gl_user_session_token';
const AUTH_USER_KEY = 'gl_user_profile_cache';

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function getStoredSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromLocal = localStorage.getItem(AUTH_STORAGE_KEY);
    if (fromLocal) return fromLocal;
    const fromSession = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (fromSession) return fromSession;
    const cookieMatch = document.cookie.match(/(?:^|;\s*)(?:gl_user_session_token|gl_user_session)=([^;]+)/);
    if (cookieMatch && cookieMatch[1]) {
      return decodeURIComponent(cookieMatch[1]);
    }
  } catch {
    return null;
  }
  return null;
}

export function setStoredSessionToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    // Security: Auth tokens must never reside in localStorage to prevent XSS exfiltration
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.setItem(AUTH_STORAGE_KEY, token);
    document.cookie = `gl_user_session=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `gl_user_session_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
  } catch {}
}

export function getStoredUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export function setStoredUserProfile(user: UserProfile) {
  if (typeof window === 'undefined' || !user) return;
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    window.dispatchEvent(
      new CustomEvent('gl_user_session_updated', {
        detail: { user, source: 'set_profile' }
      })
    );
  } catch {}
}

export function clearStoredSessionToken() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    document.cookie = 'gl_user_session_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'gl_user_session=; path=/; max-age=0; SameSite=Lax';
    window.dispatchEvent(
      new CustomEvent('gl_user_session_updated', {
        detail: { user: null, source: 'logout' }
      })
    );
  } catch {}
}

export async function fetchCurrentSession(): Promise<UserProfile | null> {
  const token = getStoredSessionToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/session', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      clearStoredSessionToken();
      return null;
    }

    const data = await res.json();
    if (data.success && data.user) {
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      } catch {}
      return data.user;
    }

    clearStoredSessionToken();
    return null;
  } catch {
    // Fallback to cache if offline
    try {
      const cached = localStorage.getItem(AUTH_USER_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  const token = getStoredSessionToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {}
  }
  clearStoredSessionToken();
}
