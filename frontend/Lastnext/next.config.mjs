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
  
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXTAUTH_URL || 'https://pmcs.site' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  
  experimental: {
    // ✅ Fixed: serverActions must be an object in Next.js 15+
    serverActions: {},
  },
  
  async rewrites() {
    return [
      {
        source: '/internal-api/:path*',
        destination: 'http://django-backend:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
