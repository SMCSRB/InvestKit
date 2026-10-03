// Politique de sécurité du contenu (anti-XSS, anti-clickjacking). Les scripts et styles « inline » restent autorisés (Next.js
// injecte des scripts en ligne) ; les ORIGINES sont en revanche limitées :
// plus aucun script d'un CDN tiers (les simulateurs sont des pages natives, sans iframe ni bibliothèque externe), seulement hCaptcha pour l'inscription.
const isDev = process.env.NODE_ENV !== 'production';
const apiOrigin = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').origin; } catch { return ''; }
})();
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://js.hcaptcha.com https://*.hcaptcha.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.hcaptcha.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  `img-src 'self' data: blob: https: ${apiOrigin}`,
  `connect-src 'self' ${apiOrigin} https://*.hcaptcha.com${isDev ? ' ws:' : ''}`,
  "frame-src 'self' https://*.hcaptcha.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Performance optimizations
  compress: true,

  // Image optimizations
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'api.example.com' },
      { protocol: 'https', hostname: '*.cdn.example.com' },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Headers for performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
          },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          // HSTS : à activer (ENABLE_HSTS=true) seulement quand le site est servi en HTTPS de façon stable : le navigateur
          // refusera ensuite toute connexion non chiffrée pendant un an.
          ...(process.env.ENABLE_HSTS === 'true'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/css/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, immutable',
          },
        ],
      },
    ];
  },

  // Redirects for legacy URLs
  async redirects() {
    return [
      {
        source: '/outils',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/pricing',
        destination: '/',
        permanent: false,
      },
    ];
  },

  // Rewrites
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  },

  // Webpack configuration for optimization
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              chunks: 'all',
              reuseExistingChunk: true,
              priority: 20,
              test: /node_modules/,
              enforce: true,
            },
            // Common chunk
            common: {
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    return config;
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['lodash-es'],
  },

  // Next.js specific optimizations
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },

  // Production source maps are disabled by default
  productionBrowserSourceMaps: false,

  // Powered by header
  poweredByHeader: false,
};

module.exports = nextConfig;
