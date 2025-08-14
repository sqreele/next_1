// @ts-check
/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: 'http', hostname: '127.0.0.1', port: '8000', pathname: '/media/**' },
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/media/**' },
      { protocol: 'https', hostname: 'pmcs.site', port: '', pathname: '/media/**' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true, // Remove this once ESLint issues are fixed
  },
  trailingSlash: true, // Optional, depending on your backend
};

export default nextConfig;
