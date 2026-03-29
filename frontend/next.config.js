/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' } : {}),
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL;
    const agentUrl = process.env.AGENT_INTERNAL_URL;

    // Only proxy when backend URLs are explicitly configured (Docker/local dev)
    // On Vercel, skip rewrites to avoid DNS_HOSTNAME_RESOLVED_PRIVATE errors
    if (!backendUrl && !agentUrl) return [];

    return [
      ...(backendUrl
        ? [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }]
        : []),
      ...(agentUrl
        ? [{ source: '/agent/:path*', destination: `${agentUrl}/agent/:path*` }]
        : []),
    ];
  },
};

module.exports = nextConfig;
