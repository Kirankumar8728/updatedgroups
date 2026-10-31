/**
 * Robust fetch helper with automatic 429 rate limit handling, exponential backoff, and random jitter.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<Response | null> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      }).catch(err => {
        clearTimeout(timeoutId);
        throw err;
      });

      clearTimeout(timeoutId);

      // If rate limited (429) or server error (5xx), retry with exponential backoff & jitter
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        if (attempt === maxRetries) return res;
        attempt++;
        const jitter = Math.random() * 400;
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return res;
    } catch (err) {
      if (attempt === maxRetries) return null;
      attempt++;
      const jitter = Math.random() * 400;
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return null;
}
