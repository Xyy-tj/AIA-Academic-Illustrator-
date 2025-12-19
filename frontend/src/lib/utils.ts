import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { API_BASE_URL } from "./api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('data:')) {
      return url;
  }
  if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
  }
  return url;
}
