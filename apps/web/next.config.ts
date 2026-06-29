import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    // Proxy API calls to NestJS backend (configurable via API_URL env var)
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
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
