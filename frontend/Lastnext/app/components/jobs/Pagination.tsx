//app/

"use client";

import { Button } from '@/app/components/ui/button';
import { PaginationProps } from '@/app/lib/types';

export default function Pagination({ totalPages, currentPage, onPageChange }: PaginationProps) {
  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        variant="outline"
        className="flex items-center gap-1"
      >
        Previous
      </Button>
      
      <div className="flex items-center gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            onClick={() => onPageChange(page)}
            variant={currentPage === page ? "default" : "outline"}
            className="flex items-center justify-center min-w-[2.5rem]"
          >
            {page}
          </Button>
        ))}
      </div>
      
      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        variant="outline"
        className="flex items-center gap-1"
      >
        Next
      </Button>
    </div>
  );
}