import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const SHIKIMORI_BASE_URL = "https://shikimori.one"
export const IMAGE_PLACEHOLDER_URL = "/poster-placeholder.svg"

function isMissingImageUrl(url: string) {
  return url.toLowerCase().includes("missing")
}

export function getImageUrl(url: string | null | undefined): string {
  if (typeof url !== "string") {
    return IMAGE_PLACEHOLDER_URL
  }

  const normalizedUrl = url.trim()

  if (!normalizedUrl || isMissingImageUrl(normalizedUrl)) {
    return IMAGE_PLACEHOLDER_URL
  }

  if (normalizedUrl.startsWith("http")) {
    return normalizedUrl
  }

  if (normalizedUrl.startsWith("//")) {
    return `https:${normalizedUrl}`
  }

  if (normalizedUrl.startsWith("/")) {
    return `${SHIKIMORI_BASE_URL}${normalizedUrl}`
  }

  return `${SHIKIMORI_BASE_URL}/${normalizedUrl.replace(/^\/+/, "")}`
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
