const SHIKIMORI_BASE_URL = "https://shikimori.one";

export function getPosterUrl(path: string): string {
  const normalizedPath = path.trim();

  if (normalizedPath.startsWith("//")) {
    return `https:${normalizedPath}`;
  }

  return normalizedPath.startsWith("/")
    ? `${SHIKIMORI_BASE_URL}${normalizedPath}`
    : normalizedPath;
}
