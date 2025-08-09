'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/app/components/ui/input';
import { Search } from 'lucide-react';

export function SearchInput() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  function searchAction(formData: FormData) {
    const value = formData.get('q');
    
    // Don't trigger search for empty queries
    if (!value || (typeof value === 'string' && value.trim() === '')) return;
    
    // Ensure value is a string
    const searchValue = typeof value === 'string' ? value : String(value);
    const params = new URLSearchParams({ q: searchValue });
    
    startTransition(() => {
      // Navigate to the search page
      router.push(`/dashboard/search?${params.toString()}`);
    });
  }
  
  return (
    <form action={searchAction} className="relative ml-auto flex-1 md:grow-0">
      <Search className="absolute left-2.5 top-[.75rem] h-4 w-4 text-muted-foreground" />
      <Input
        name="q"
        type="search"
        placeholder="Search jobs, properties..."
        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
      />
      {isPending && (
        <div className="absolute right-2.5 top-[.6rem]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      )}
    </form>
  );
}