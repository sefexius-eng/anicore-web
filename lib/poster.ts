const SHIKIMORI_BASE_URL = "https://shikimori.one";

export function getPosterUrl(path: string): string {
  return path.startsWith("/") ? `${SHIKIMORI_BASE_URL}${path}` : path;
}
