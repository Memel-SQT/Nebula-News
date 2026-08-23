import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: Date, locale: "fr" | "en"): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const steps: [number, string, string][] = [
    [60, "s", "s"],
    [60, "min", "m"],
    [24, "h", "h"],
    [7, "j", "d"],
  ];

  let value = seconds;
  let unitFr = "s";
  let unitEn = "s";
  for (const [size, fr, en] of steps) {
    if (value < size) break;
    value = Math.floor(value / size);
    unitFr = fr;
    unitEn = en;
  }

  if (locale === "fr") {
    if (seconds < 60) return "à l'instant";
    return `il y a ${value} ${unitFr}`;
  }
  if (seconds < 60) return "just now";
  return `${value}${unitEn} ago`;
}
