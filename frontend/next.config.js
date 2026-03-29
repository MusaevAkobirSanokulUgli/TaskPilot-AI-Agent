/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' } : {}),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_INTERNAL_URL || 'http://localhost:5002'}/api/:path*`,
      },
      {
        source: '/agent/:path*',
        destination: `${process.env.AGENT_INTERNAL_URL || 'http://localhost:8001'}/agent/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
