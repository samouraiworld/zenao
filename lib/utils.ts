import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isValidURL = (url: string, urlPattern: RegExp) => {
  const urlRegex = new RegExp(urlPattern);
  return urlRegex.test(url);
};
