import { getImageUrl, IMAGE_PLACEHOLDER_URL } from "@/lib/utils";

export const FALLBACK_POSTER_URL = IMAGE_PLACEHOLDER_URL;

function isMissingPosterPath(path: string): boolean {
  return path.toLowerCase().includes("missing");
}

export function getPosterUrl(path?: string | null): string {
  return getImageUrl(path);
}

export function pickPosterUrl(paths: Array<string | null | undefined>): string {
  for (const path of paths) {
    if (typeof path !== "string") {
      continue;
    }

    const normalizedPath = path.trim();

    if (normalizedPath && !isMissingPosterPath(normalizedPath)) {
      return getPosterUrl(normalizedPath);
    }
  }

  return FALLBACK_POSTER_URL;
}
