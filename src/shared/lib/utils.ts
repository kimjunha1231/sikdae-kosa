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

export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const MEMBER_COLORS = [
  { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400' },
  { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
  { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400' },
  { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400' },
  { border: 'border-rose-500/30', bg: 'bg-rose-500/5', text: 'text-rose-400' },
  { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400' },
  { border: 'border-pink-500/30', bg: 'bg-pink-500/5', text: 'text-pink-400' },
  { border: 'border-indigo-500/30', bg: 'bg-indigo-500/5', text: 'text-indigo-400' },
];

export const getMemberColorClass = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % MEMBER_COLORS.length;
  return MEMBER_COLORS[index];
};
