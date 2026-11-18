import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: { '/api/recognize': ['./prompts/**/*'] },
  experimental: { serverActions: { bodySizeLimit: '1mb' } },
  webpack(config, { dev }) {
    if (dev) {
      // Avoid Windows PackFileCacheStrategy EOF/empty-file errors during rapid HMR restarts.
      config.cache = { type: 'memory' };
    } else if (
      config.cache &&
      typeof config.cache === 'object' &&
      config.cache.type === 'filesystem'
    ) {
      // Store uncompressed build packs cleanly to prevent partial gzip EOF failures on Windows.
      config.cache.compression = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(self), payment=()',
          },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
        ],
      },
      {
        // Unhashed public assets: a day fresh, a week stale-while-revalidate (MapLibre worker included).
        source: '/:dir(images|icons|mobile|website)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};
export default nextConfig;
