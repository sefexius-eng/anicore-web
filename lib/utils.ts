import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const SHIKIMORI_IMAGE_BASE_URL = "https://desu.shikimori.one";
export const IMAGE_PLACEHOLDER_URL =
  "https://placehold.co/225x320/1a1a1a/ffffff?text=No+Image";

function isMissingImageUrl(url: string) {
  return url.toLowerCase().includes("missing");
}

export function getImageUrl(url?: string | null) {
  if (typeof url !== "string") {
    return IMAGE_PLACEHOLDER_URL;
  }

  const normalizedUrl = url.trim();

  if (!normalizedUrl || isMissingImageUrl(normalizedUrl)) {
    return IMAGE_PLACEHOLDER_URL;
  }

  if (normalizedUrl.startsWith("http")) {
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith("//")) {
    return `https:${normalizedUrl}`;
  }

  return normalizedUrl.startsWith("/")
    ? `${SHIKIMORI_IMAGE_BASE_URL}${normalizedUrl}`
    : `${SHIKIMORI_IMAGE_BASE_URL}/${normalizedUrl}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
