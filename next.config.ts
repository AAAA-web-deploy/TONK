import type { NextConfig } from 'next'

const pages = process.env.GITHUB_PAGES === 'true'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const nextConfig: NextConfig = {
  agentRules: false,
  output: pages ? 'export' : 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
  ...(pages ? { trailingSlash: true } : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  // The supplied media should retain its exact dimensions and source bytes.
  images: { unoptimized: true },
  ...(!pages ? { async headers() {
    return [
      { source: '/vendor/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ]
  }, async rewrites() {
    const tracker = process.env.TONK_TRACKER_ORIGIN || 'http://127.0.0.1:4217'
    return {
      beforeFiles: [
        { source: '/api/analytics/:path*', destination: `${tracker}/api/analytics/:path*` },
        { source: '/api/dashboard/:path*', destination: `${tracker}/api/dashboard/:path*` },
      ],
    }
  } } : {}),
}

export default nextConfig
