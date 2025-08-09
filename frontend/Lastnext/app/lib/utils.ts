import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
export function formatDate(date: string | number | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}