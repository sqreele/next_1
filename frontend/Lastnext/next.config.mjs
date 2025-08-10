// @ts-check
/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Temporarily disable standalone output for Docker build
  // output: 'standalone',
  
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: 'http', hostname: '127.0.0.1', port: '8000', pathname: '/media/**' },
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/media/**' },
      { protocol: 'https', hostname: 'pmcs.site', port: '', pathname: '/media/**' },
      // Add Django backend hostname for Docker networking
      { protocol: 'http', hostname: 'django-backend', port: '8000', pathname: '/media/**' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true, // Remove this once ESLint issues are fixed
  },
  trailingSlash: true, // Optional, depending on your backend
  
  // Experimental features (if using app directory)
  experimental: {
    // Enable if you're using the app directory structure
    // appDir: true,
  },
};

export default nextConfig;