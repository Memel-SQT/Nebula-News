import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Short relative time ("il y a 5 min", "3h ago"). Each unit is computed on its own scale: the
 * previous loop divided before naming the unit, so 10 minutes read "10 s" and 10 hours "10 min".
 */
export function timeAgo(date: Date, locale: "fr" | "en", now: Date = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (locale === "fr") {
    if (minutes < 1) return "à l'instant";
    if (hours < 1) return `il y a ${minutes} min`;
    if (days < 1) return `il y a ${hours} h`;
    return `il y a ${days} j`;
  }
  if (minutes < 1) return "just now";
  if (hours < 1) return `${minutes}m ago`;
  if (days < 1) return `${hours}h ago`;
  return `${days}d ago`;
}
