'use client';

import { TooltipProvider } from '@/app/components/ui/tooltip';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}