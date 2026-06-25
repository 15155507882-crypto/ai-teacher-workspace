import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [{ source: '/home', destination: '/workspace', permanent: false }];
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://localhost:3000/api/:path*' }];
  },
};

export default nextConfig;
