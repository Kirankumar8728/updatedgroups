import { headers } from 'next/headers';

/**
 * Checks whether the current server-side request originates from the adult subdomain (adult.grouplinks.app).
 */
export async function isAdultSubdomainRequest(): Promise<boolean> {
  try {
    const h = await headers();
    const xAdult = h.get('x-adult-subdomain');
    if (xAdult === 'true') return true;
    const host = (h.get('x-forwarded-host') || h.get('host') || '').toLowerCase();
    return host.startsWith('adult.') || host.includes('adult.grouplinks.app');
  } catch {
    return false;
  }
}
