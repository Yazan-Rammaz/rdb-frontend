import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn` — the single, project-wide way to compose class names.
 *
 * Always use this when a component needs conditional or merged classes so that
 * later utilities correctly override earlier ones (via tailwind-merge).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
