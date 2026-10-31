/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: false,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['mysql2', 'web-push'],
  allowedDevOrigins: [
    '*.asia-east1.run.app',
    '*.run.app',
    'localhost:3000',
    '127.0.0.1:3000',
  ],
  httpAgentOptions: {
    keepAlive: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.grouplinks.app' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'media.discordapp.net' },
      { protocol: 'https', hostname: 'preview.redd.it' },
      { protocol: 'https', hostname: 'external-preview.redd.it' },
      { protocol: 'https', hostname: 'styles.redditmedia.com' },
      { protocol: 'https', hostname: 'a.thumbs.redditmedia.com' },
      { protocol: 'https', hostname: 'b.thumbs.redditmedia.com' },
      { protocol: 'https', hostname: '**.redditmedia.com' },
      { protocol: 'https', hostname: '**.redd.it' },
      { protocol: 'https', hostname: 'i.postimg.cc' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'pps.whatsapp.net' },
      { protocol: 'https', hostname: '**.whatsapp.net' },
      { protocol: 'https', hostname: '**.whatsapp.com' },
      { protocol: 'https', hostname: 't.me' },
      { protocol: 'https', hostname: 'telegram.org' },
      { protocol: 'https', hostname: '**.telegram.org' },
      { protocol: 'https', hostname: 'telesco.pe' },
      { protocol: 'https', hostname: '**.telesco.pe' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.blogspot.com' },
      { protocol: 'https', hostname: '**.blogger.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'assets.stickpng.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.facebook.com' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.instagram.com' },
      { protocol: 'https', hostname: '**.signal.org' },
      { protocol: 'https', hostname: '**.snapchat.com' },
      { protocol: 'https', hostname: 'images.weserv.nl' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/LLMS.TXT',
        destination: '/llms.txt',
      },
      {
        source: '/LLMS.txt',
        destination: '/llms.txt',
      },
      {
        source: '/LLMS-FULL.TXT',
        destination: '/llms-full.txt',
      },
      {
        source: '/LLMS-full.txt',
        destination: '/llms-full.txt',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/reddit-groups',
        destination: '/reddit-communities',
        permanent: true,
      },
      {
        source: '/discord-groups',
        destination: '/discord-servers',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      // 1. Static bundles & assets (immutable in production, dynamic in development)
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=31536000, immutable'
              : 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/(images|icons|fonts)/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // 2. LLMS.txt & Sitemaps & robots caching
      {
        source: '/(llms.txt|llms-full.txt|robots.txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
          },
        ],
      },
      // 3. Real-time API endpoints: Explicitly bypass Hostinger / Cloudflare / LiteSpeed / Nginx edge caches
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
          {
            key: 'Cloudflare-CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'X-Accel-Expires',
            value: '0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      // 4. Admin & User realtime dashboards & submission routes
      {
        source: '/(admin|kiran8728|direct-pay|submit|submit-group)(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
          {
            key: 'Cloudflare-CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'X-Accel-Expires',
            value: '0',
          },
        ],
      },
      // 5. Default global security & content headers
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co https://*.googleapis.com https://accounts.google.com https://*.google-analytics.com https://*.googletagmanager.com",
              "frame-src 'self' https://accounts.google.com",
              "frame-ancestors *",
            ].join('; '),
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
      if (dev) {
        config.output = {
          ...config.output,
          chunkLoadTimeout: 60000,
        };
      }
    }
    return config;
  },
};

export default nextConfig;
