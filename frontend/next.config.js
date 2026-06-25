/** @type {import('next').NextConfig} */
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { typedRoutes: false },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'commondatastorage.googleapis.com' },
    ],
  },
  async rewrites() {
    // No proxying in demo/mock mode — every call is intercepted client-side.
    if (MOCK_MODE) return [];
    const api = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    return [
      { source: '/api/:path*', destination: `${api}/api/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
