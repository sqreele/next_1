'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User2 } from 'lucide-react';

interface ProfileImageProps {
  src: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { container: 'w-16 h-16', icon: 'h-8 w-8', imageSize: 64 },
  md: { container: 'w-24 h-24', icon: 'h-12 w-12', imageSize: 96 },
  lg: { container: 'w-32 h-32', icon: 'h-16 w-16', imageSize: 128 },
};

export function ProfileImage({ src, alt, size = 'md' }: ProfileImageProps) {
  const [error, setError] = useState(false);
  const { container, icon, imageSize } = sizes[size];

  if (!src || error) {
    return (
      <div className={`${container} rounded-full bg-muted flex items-center justify-center`}>
        <User2 className={`${icon} text-muted-foreground`} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={imageSize}
      height={imageSize}
      className={`${container} rounded-full object-cover border-2 border-muted`}
      onError={() => setError(true)}
      priority
    />
  );
}
