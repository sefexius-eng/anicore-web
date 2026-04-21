export interface AnimeShowcaseItem {
  id: number;
  title: string;
  image_url: string;
  score: number | null;
}

export interface AnimeDetailsItem extends AnimeShowcaseItem {
  synopsis: string;
  genres: string[];
}

interface ShikimoriGenre {
  name?: string | null;
  russian?: string | null;
}

interface ShikimoriAnimeResponse {
  id: number;
  name: string;
  russian?: string | null;
  score?: string | number | null;
  description?: string | null;
  description_html?: string | null;
  genres?: ShikimoriGenre[];
  image?: {
    original?: string | null;
    preview?: string | null;
    x96?: string | null;
    x48?: string | null;
  };
}

const SHIKIMORI_API_BASE_URL = "https://shikimori.one/api";
const SHIKIMORI_BASE_URL = "https://shikimori.one";
const FALLBACK_POSTER =
  `${SHIKIMORI_BASE_URL}/assets/globals/missing_original.jpg`;

function resolveImageUrl(path: string | null | undefined): string | null {
  if (typeof path !== "string" || !path.trim()) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${SHIKIMORI_BASE_URL}${path}`;
}

function resolvePosterUrl(payload: ShikimoriAnimeResponse): string {
  return (
    resolveImageUrl(payload.image?.original) ??
    resolveImageUrl(payload.image?.preview) ??
    resolveImageUrl(payload.image?.x96) ??
    resolveImageUrl(payload.image?.x48) ??
    FALLBACK_POSTER
  );
}

function resolveTitle(payload: ShikimoriAnimeResponse): string {
  const russianTitle = payload.russian?.trim();

  if (russianTitle) {
    return russianTitle;
  }

  const fallbackTitle = payload.name?.trim();
  return fallbackTitle || "Без названия";
}

function resolveScore(score: ShikimoriAnimeResponse["score"]): number | null {
  if (typeof score === "number" && Number.isFinite(score)) {
    return score;
  }

  if (typeof score === "string") {
    const parsedScore = Number(score);
    return Number.isFinite(parsedScore) ? parsedScore : null;
  }

  return null;
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function resolveSynopsis(payload: ShikimoriAnimeResponse): string {
  const plainDescription = payload.description?.trim();

  if (plainDescription) {
    return plainDescription;
  }

  const descriptionFromHtml =
    typeof payload.description_html === "string"
      ? stripHtmlTags(payload.description_html)
      : "";

  return descriptionFromHtml || "Синопсис временно недоступен.";
}

function resolveGenres(payload: ShikimoriAnimeResponse): string[] {
  if (!Array.isArray(payload.genres)) {
    return [];
  }

  return payload.genres
    .map((genre) => genre.russian?.trim() || genre.name?.trim() || "")
    .filter((genreName): genreName is string => genreName.length > 0);
}

async function fetchAnimePayload(id: number): Promise<ShikimoriAnimeResponse> {
  const response = await fetch(`${SHIKIMORI_API_BASE_URL}/animes/${id}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 60 * 60,
    },
  });

  if (!response.ok) {
    throw new Error(`Shikimori API request failed for ID ${id}: ${response.status}`);
  }

  return (await response.json()) as ShikimoriAnimeResponse;
}

export async function getAnimeById(id: number): Promise<AnimeShowcaseItem> {
  const payload = await fetchAnimePayload(id);

  return {
    id: payload.id,
    title: resolveTitle(payload),
    image_url: resolvePosterUrl(payload),
    score: resolveScore(payload.score),
  };
}

export async function getAnimeDetailsById(
  id: number,
): Promise<AnimeDetailsItem> {
  const payload = await fetchAnimePayload(id);

  return {
    id: payload.id,
    title: resolveTitle(payload),
    image_url: resolvePosterUrl(payload),
    score: resolveScore(payload.score),
    synopsis: resolveSynopsis(payload),
    genres: resolveGenres(payload),
  };
}
