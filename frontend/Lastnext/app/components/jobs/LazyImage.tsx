'use client';
import Image from 'next/image';
import React from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className }) => {
  // Check if this is a URL from our own domain
  const isOwnDomain = src.includes('pmcs.site');
  
  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      width={0}  // Required for remote images in Next.js 15
      height={0} // Required for remote images in Next.js 15
      sizes="100vw" // Adjust based on layout
      style={{ width: '100%', height: 'auto' }} // Responsive
      loading="lazy"
      unoptimized={isOwnDomain} // Skip optimization for our own domain
      onError={() => console.error(`Failed to load image: ${src}`)} // Debug
    />
  );
};
