import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    // Proxy API calls to NestJS backend (host network mode — always localhost)
    return [{ source: '/api/:path*', destination: 'http://localhost:3000/api/:path*' }];
  },
  async redirects() {
    return [
      { source: '/admin/school', destination: '/admin/settings/school', permanent: true },
      { source: '/admin/ai-config', destination: '/admin/settings/ai-config', permanent: true },
      { source: '/admin/ai-logs', destination: '/admin/settings/ai-logs', permanent: true },
    ];
  },
};

export default nextConfig;
