import { getSiteUrl } from '@/src/lib/rank';

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export const INDEXNOW_API_KEY = (process.env.INDEXNOW_API_KEY || '').trim();

/**
 * Pings IndexNow API with qualified URLs that meet indexing thresholds.
 */
export async function pingIndexNow(urls: string[]): Promise<{
  success: boolean;
  submittedCount: number;
  statusCode?: number;
  message?: string;
}> {
  if (!INDEXNOW_API_KEY) {
    return { success: false, submittedCount: 0, message: 'INDEXNOW_API_KEY is not configured.' };
  }
  if (!urls || urls.length === 0) {
    return { success: true, submittedCount: 0, message: 'No URLs to submit' };
  }

  const baseUrl = getSiteUrl().replace(/\/+$/, '');
  const host = new URL(baseUrl).hostname;
  const keyLocation = `${baseUrl}/${INDEXNOW_API_KEY}.txt`;

  const payload: IndexNowPayload = {
    host,
    key: INDEXNOW_API_KEY,
    keyLocation,
    urlList: urls.map(u => (u.startsWith('http') ? u : `${baseUrl}${u}`)),
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'GroupLinks-IndexNow/2.0',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: res.ok || res.status === 200 || res.status === 202,
      submittedCount: payload.urlList.length,
      statusCode: res.status,
      message: res.ok ? 'Successfully submitted to IndexNow' : `IndexNow returned status ${res.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      submittedCount: payload.urlList.length,
      message: err.message || 'IndexNow request failed',
    };
  }
}
