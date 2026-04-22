const SHIKIMORI_BASE_URL = "https://shikimori.one";
export const FALLBACK_POSTER_URL = "/poster-placeholder.svg";

function isMissingPosterPath(path: string): boolean {
  return path.toLowerCase().includes("missing");
}

export function getPosterUrl(path?: string | null): string {
  if (typeof path !== "string") {
    return FALLBACK_POSTER_URL;
  }

  const normalizedPath = path.trim();

  if (!normalizedPath || isMissingPosterPath(normalizedPath)) {
    return FALLBACK_POSTER_URL;
  }

  if (normalizedPath.startsWith("//")) {
    return `https:${normalizedPath}`;
  }

  return normalizedPath.startsWith("/")
    ? `${SHIKIMORI_BASE_URL}${normalizedPath}`
    : normalizedPath;
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
