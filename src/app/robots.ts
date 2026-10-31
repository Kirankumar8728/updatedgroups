import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/src/lib/rank';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/internal', '/login', '/account'],
      },
      {
        userAgent: [
          'Googlebot',
          'Bingbot',
          'Applebot',
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'PerplexityBot',
          'ClaudeBot',
          'Anthropic-AI',
          'CCBot',
          'cohere-ai',
          'Bytespider',
        ],
        allow: '/',
        disallow: ['/admin', '/api/', '/internal', '/login', '/account'],
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemaps/core/sitemap.xml`,
      `${baseUrl}/sitemaps/categories/sitemap.xml`,
      `${baseUrl}/sitemaps/groups/sitemap.xml`,
      `${baseUrl}/sitemap-index.xml`,
    ],
  };
}

