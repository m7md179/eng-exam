/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // This will warn but not error
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost'],
  },
}

export default nextConfig
