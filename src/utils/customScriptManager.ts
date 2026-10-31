/**
 * Custom Script & Verification Code Manager
 * Stores and manages Google Analytics, Search Console verification tags,
 * Bing Webmaster tags, and custom header/footer HTML/JS codes configured via Admin Panel.
 */

export interface CustomScriptsConfig {
  googleAnalyticsId: string;
  googleVerificationCode: string;
  bingVerificationCode: string;
  customHeadCode: string;
  customBodyCode: string;
}

const CUSTOM_SCRIPTS_STORAGE_KEY = 'grouplinks_custom_scripts_v1';

export const DEFAULT_SCRIPTS_CONFIG: CustomScriptsConfig = {
  googleAnalyticsId: '',
  googleVerificationCode: '',
  bingVerificationCode: '',
  customHeadCode: '',
  customBodyCode: '',
};

export function getCustomScriptsConfig(): CustomScriptsConfig {
  if (typeof window === 'undefined') return DEFAULT_SCRIPTS_CONFIG;
  try {
    const raw = localStorage.getItem(CUSTOM_SCRIPTS_STORAGE_KEY) || localStorage.getItem('grouplinks_custom_scripts_backup');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SCRIPTS_CONFIG,
        ...parsed,
        googleAnalyticsId: typeof parsed.googleAnalyticsId === 'string' ? parsed.googleAnalyticsId : '',
        googleVerificationCode: typeof parsed.googleVerificationCode === 'string' ? parsed.googleVerificationCode : '',
        bingVerificationCode: typeof parsed.bingVerificationCode === 'string' ? parsed.bingVerificationCode : '',
        customHeadCode: typeof parsed.customHeadCode === 'string' ? parsed.customHeadCode : '',
        customBodyCode: typeof parsed.customBodyCode === 'string' ? parsed.customBodyCode : '',
      };
    }
  } catch (err) {
    console.warn('Failed to load custom scripts config from storage:', err);
  }
  return DEFAULT_SCRIPTS_CONFIG;
}

export async function fetchCustomScriptsFromServer(): Promise<CustomScriptsConfig> {
  try {
    const res = await fetch('/api/admin/scripts', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        const conf: CustomScriptsConfig = {
          googleAnalyticsId: data.config.googleAnalyticsId || '',
          googleVerificationCode: data.config.googleVerificationCode || '',
          bingVerificationCode: data.config.bingVerificationCode || '',
          customHeadCode: data.config.customHeadCode || '',
          customBodyCode: data.config.customBodyCode || '',
        };
        // Update local storage cache
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(CUSTOM_SCRIPTS_STORAGE_KEY, JSON.stringify(conf));
            localStorage.setItem('grouplinks_custom_scripts_backup', JSON.stringify(conf));
          } catch {
            // Ignore quota errors
          }
        }
        return conf;
      }
    }
  } catch (err) {
    console.warn('Could not fetch server custom scripts:', err);
  }
  return getCustomScriptsConfig();
}

export function saveCustomScriptsConfig(config: CustomScriptsConfig): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonStr = JSON.stringify(config);
    localStorage.setItem(CUSTOM_SCRIPTS_STORAGE_KEY, jsonStr);
    localStorage.setItem('grouplinks_custom_scripts_backup', jsonStr);
    window.dispatchEvent(
      new CustomEvent('grouplinks_scripts_updated', { detail: config })
    );
  } catch (err) {
    console.warn('Failed to save custom scripts config to local storage:', err);
  }

  // Also sync to server in background
  fetch('/api/admin/scripts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  }).catch(err => {
    console.warn('Background server script sync failed:', err);
  });
}

export async function saveCustomScriptsConfigAsync(config: CustomScriptsConfig): Promise<boolean> {
  // 1. Immediately store to local storage & dispatch DOM update
  saveCustomScriptsConfig(config);

  // 2. Persist to server API
  try {
    const res = await fetch('/api/admin/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      const data = await res.json();
      return data.success;
    }
  } catch (err) {
    console.warn('Failed to post scripts to /api/admin/scripts:', err);
  }
  return true;
}

