'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils'; // Using cn instead of clsx for consistency
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItemProps {
  href: string;
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  showTooltip?: boolean;
  onClick?: () => void;
}

export function NavItem({
  href,
  label,
  children,
  icon,
  showTooltip = true,
  onClick
}: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle client-side rendering and detect mobile
  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle both the component's onClick and any parent onClick
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
  };

  // Only render tooltip on client-side and when not on mobile
  const renderTooltip = isMounted && showTooltip && !isMobile;

  const navItem = (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'group relative flex items-center justify-center rounded-lg transition-all duration-200 ease-in-out',
        'h-10 w-10 md:h-9 md:w-9', // Slightly larger on mobile for better touch targets
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground',
        {
          'scale-[0.98] transition-transform duration-100': isActive, // Subtle pressed effect
        }
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Icon wrapper with consistent sizing */}
      <span className="flex items-center justify-center h-5 w-5">
        {children}
      </span>
      
      {/* Always include the label for screen readers */}
      <span className="sr-only">{label}</span>
      
      {/* Show active indicator dot for mobile (no tooltip) */}
      {isActive && isMounted && isMobile && (
        <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-foreground" />
      )}
    </Link>
  );

  // If tooltip shouldn't be shown, just return the link
  if (!renderTooltip) {
    return navItem;
  }

  // Otherwise, wrap in tooltip
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {navItem}
        </TooltipTrigger>
        <TooltipContent 
          side="right"
          align="center" 
          className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}