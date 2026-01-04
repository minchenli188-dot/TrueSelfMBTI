import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get MBTI group based on type
 */
export function getMBTIGroup(type: string): "analyst" | "diplomat" | "sentinel" | "explorer" {
  const analysts = ["INTJ", "INTP", "ENTJ", "ENTP"];
  const diplomats = ["INFJ", "INFP", "ENFJ", "ENFP"];
  const sentinels = ["ISTJ", "ISFJ", "ESTJ", "ESFJ"];
  const explorers = ["ISTP", "ISFP", "ESTP", "ESFP"];

  if (analysts.includes(type)) return "analyst";
  if (diplomats.includes(type)) return "diplomat";
  if (sentinels.includes(type)) return "sentinel";
  if (explorers.includes(type)) return "explorer";
  
  return "analyst"; // Default fallback
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Generate a random session ID
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}





