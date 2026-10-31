/**
 * Smart request queue and throttler to prevent bulk requests and HTTP 429 errors.
 * Serializes network calls with a minimum delay between requests.
 */
class RequestThrottler {
  private queue: (() => Promise<any>)[] = [];
  private isProcessing = false;
  private minIntervalMs = 800; // Minimum 800ms between outbound batched requests
  private lastRequestTime = 0;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      if (elapsed < this.minIntervalMs) {
        await new Promise(r => setTimeout(r, this.minIntervalMs - elapsed));
      }

      const task = this.queue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        try {
          await task();
        } catch {}
      }
    }

    this.isProcessing = false;
  }
}

export const globalRequestThrottler = new RequestThrottler();

export async function throttledFetchJson(url: string, options?: RequestInit): Promise<any> {
  return globalRequestThrottler.enqueue(async () => {
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  });
}
