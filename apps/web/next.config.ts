import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    // Proxy API calls to NestJS backend
    return [{ source: '/api/:path*', destination: 'http://localhost:3000/api/:path*' }];
  },
};

export default nextConfig;
