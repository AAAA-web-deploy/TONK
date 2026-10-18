import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  agentRules: false,
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
  // The supplied media should retain its exact dimensions and source bytes.
  images: { unoptimized: true },
  async headers() {
    return [
      { source: '/vendor/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ]
  },
}

export default nextConfig
