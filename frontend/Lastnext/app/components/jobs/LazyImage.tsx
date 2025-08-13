'use client';
import Image from 'next/image';
import React, { useState, useMemo } from 'react';
import MissingImage from '@/app/components/jobs/MissingImage';

interface LazyImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className, rounded = 'md' }) => {
  const [hasError, setHasError] = useState(false);

  const normalizedSrc = useMemo(() => {
    if (!src || typeof src !== 'string' || src.trim() === '') return null;
    return src;
  }, [src]);

  const isOwnDomain = normalizedSrc ? normalizedSrc.includes('pmcs.site') : false;

  if (!normalizedSrc || hasError) {
    return <MissingImage className={className} rounded={rounded} />;
  }
  
  return (
    <Image
      src={normalizedSrc}
      alt={alt}
      className={className}
      width={0}
      height={0}
      sizes="100vw"
      style={{ width: '100%', height: 'auto' }}
      loading="lazy"
      unoptimized={isOwnDomain}
      onError={() => setHasError(true)}
    />
  );
};
