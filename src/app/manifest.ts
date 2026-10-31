import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Group Links Directory',
    short_name: 'GroupLinks',
    description: 'Find active WhatsApp groups, Telegram channels, Discord servers, and more.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#6366f1',
    icons: [
      {
        src: 'https://api.dicebear.com/7.x/identicon/svg?seed=grouplinks&backgroundColor=6366f1',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: 'https://api.dicebear.com/7.x/identicon/svg?seed=grouplinks&backgroundColor=6366f1',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
