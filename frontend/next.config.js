/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://breslev-torah-api.onrender.com/api/v1/:path*',
      },
    ]
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

module.exports = nextConfig