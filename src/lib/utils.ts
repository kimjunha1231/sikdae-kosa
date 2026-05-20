import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | string): string {
  if (price === undefined || price === null) return '0';
  const str = String(price);
  if (str.includes('~')) {
    return str.split('~').map(p => {
      const n = parseInt(p.trim(), 10);
      return isNaN(n) ? p : n.toLocaleString();
    }).join(' ~ ');
  }
  const n = parseInt(str, 10);
  return isNaN(n) ? str : n.toLocaleString();
}
