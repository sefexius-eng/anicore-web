import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const SHIKIMORI_BASE_URL = "https://shikimori.one"
export const IMAGE_PLACEHOLDER_URL = "/poster-placeholder.svg"

function isMissingImageUrl(url: string) {
  return url.toLowerCase().includes("missing")
}

export function getImageUrl(url?: string | null) {
  if (typeof url !== "string") {
    return IMAGE_PLACEHOLDER_URL
  }

  const normalizedUrl = url.trim()

  if (!normalizedUrl || isMissingImageUrl(normalizedUrl)) {
    return IMAGE_PLACEHOLDER_URL
  }

  if (normalizedUrl.startsWith("//")) {
    return `https:${normalizedUrl}`
  }

  if (normalizedUrl.startsWith("/system/")) {
    return `${SHIKIMORI_BASE_URL}${normalizedUrl}`
  }

  if (normalizedUrl.startsWith("/")) {
    return `${SHIKIMORI_BASE_URL}${normalizedUrl}`
  }

  return normalizedUrl
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
