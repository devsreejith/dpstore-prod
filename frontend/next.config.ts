// @ts-expect-error - next-pwa lacks built-in type declarations
import nextPWA from 'next-pwa';
// @ts-expect-error - next-pwa/cache lacks built-in type declarations
import runtimeCache from 'next-pwa/cache';
import { i18n } from './next-i18next.config';
import { access } from 'fs';

const withPWA = nextPWA({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production',
  runtimeCaching: runtimeCache,
});

export default withPWA({
  i18n,
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '**',
      },
    ],
  },
  async rewrites() {
    const backend =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      
    return [
      { source: '/api/v1/:path*', destination: `${backend}/api/v1/:path*` },
      { source: '/store/:path*', destination: `${backend}/store/:path*` },
      { source: '/auth/:path*', destination: `${backend}/auth/:path*` },
      { source: '/categories.json', destination: `${backend}/categories.json` },
      { source: '/products.json', destination: `${backend}/products.json` },
      { source: '/products_2.json', destination: `${backend}/products_2.json` },
      { source: '/search.json', destination: `${backend}/search.json` },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
      { source: '/static/:path*', destination: `${backend}/static/:path*` },
      {
        source: '/featured_products.json',
        destination: `${backend}/featured_products.json`,
      },
      {
        source: '/related_products.json',
        destination: `${backend}/related_products.json`,
      },
    ];
  },
});
