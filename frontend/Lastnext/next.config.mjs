// @ts-check
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
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
  
  // Ensure webpack resolves the '@' alias to the project root
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@'] = projectRoot;
    return config;
  },
  
  async rewrites() {
    const privateApi = process.env.NEXT_PRIVATE_API_URL || 'http://django-backend:8000';
    return [
      // Do NOT proxy NextAuth endpoints; let Next.js handle them
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
      // Pass-through for already versioned API calls
      {
        source: '/api/v1/:path*',
        destination: `${privateApi}/api/v1/:path*`,
      },
      // Convenience: rewrite unversioned /api/* to backend /api/v1/*
      {
        source: '/api/:path*',
        destination: `${privateApi}/api/v1/:path*`,
      },
      {
        source: '/internal-api/:path*',
        destination: 'http://django-backend:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
