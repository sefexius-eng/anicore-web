import { getPosterUrl, pickPosterUrl } from "@/lib/poster";

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

export interface AnimeFranchiseSeasonItem {
  id: number;
  order: number;
  year: number | null;
  title: string;
}

interface ShikimoriGenre {
  name?: string | null;
  russian?: string | null;
}

interface ShikimoriFranchiseNode {
  id?: number;
  kind?: string | null;
  name?: string | null;
  russian?: string | null;
  year?: number | null;
}

interface ShikimoriFranchiseResponse {
  current_id?: number;
  nodes?: ShikimoriFranchiseNode[];
  links?: unknown[];
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
const FALLBACK_POSTER = getPosterUrl("/assets/globals/missing_original.jpg");

function resolveImageUrl(path: string | null | undefined): string | null {
  if (typeof path !== "string" || !path.trim()) {
    return null;
  }

  return getPosterUrl(path);
}

function resolvePosterUrl(payload: ShikimoriAnimeResponse): string {
  return pickPosterUrl([
    resolveImageUrl(payload.image?.original),
    resolveImageUrl(payload.image?.preview),
    resolveImageUrl(payload.image?.x96),
    resolveImageUrl(payload.image?.x48),
    FALLBACK_POSTER,
  ]);
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

  return (
    descriptionFromHtml ||
    "Описание этого сезона в процессе перевода. Вы можете начать просмотр прямо сейчас!"
  );
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

function toAnimeShowcaseItem(payload: ShikimoriAnimeResponse): AnimeShowcaseItem {
  return {
    id: payload.id,
    title: resolveTitle(payload),
    image_url: resolvePosterUrl(payload),
    score: resolveScore(payload.score),
  };
}

export async function getAnimeById(id: number): Promise<AnimeShowcaseItem> {
  const payload = await fetchAnimePayload(id);

  return toAnimeShowcaseItem(payload);
}

export async function getAnimeDetailsById(
  id: number,
): Promise<AnimeDetailsItem> {
  const payload = await fetchAnimePayload(id);

  return {
    ...toAnimeShowcaseItem(payload),
    synopsis: resolveSynopsis(payload),
    genres: resolveGenres(payload),
  };
}

export async function searchAnime(
  query: string,
  limit = 20,
): Promise<AnimeShowcaseItem[]> {
  const searchQuery = query.trim();

  if (!searchQuery) {
    return [];
  }

  const searchParams = new URLSearchParams({
    search: searchQuery,
    limit: String(limit),
  });

  const response = await fetch(`${SHIKIMORI_API_BASE_URL}/animes?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 60,
    },
  });

  if (!response.ok) {
    throw new Error(`Shikimori search request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ShikimoriAnimeResponse[];

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map(toAnimeShowcaseItem);
}

function isTvKind(kind: string | null | undefined): boolean {
  if (typeof kind !== "string") {
    return false;
  }

  const normalizedKind = kind.trim().toLowerCase();

  return (
    normalizedKind === "tv" ||
    normalizedKind === "tv сериал" ||
    normalizedKind === "tv series"
  );
}

export async function getAnimeFranchiseSeasons(
  id: number,
): Promise<AnimeFranchiseSeasonItem[]> {
  const response = await fetch(`${SHIKIMORI_API_BASE_URL}/animes/${id}/franchise`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 60 * 60,
    },
  });

  if (!response.ok) {
    throw new Error(`Shikimori franchise request failed for ID ${id}: ${response.status}`);
  }

  const payload = (await response.json()) as ShikimoriFranchiseResponse;
  const tvNodes = Array.isArray(payload.nodes)
    ? payload.nodes
        .filter(
          (node): node is ShikimoriFranchiseNode & { id: number } =>
            typeof node.id === "number" && isTvKind(node.kind),
        )
        .map((node, index) => ({
          id: node.id,
          year: typeof node.year === "number" ? node.year : null,
          title:
            node.russian?.trim() || node.name?.trim() || `${index + 1} сезон`,
          sourceIndex: index,
        }))
    : [];

  const deduplicatedNodes = Array.from(
    new Map(tvNodes.map((node) => [node.id, node])).values(),
  );

  deduplicatedNodes.sort((left, right) => {
    if (left.year !== null && right.year !== null && left.year !== right.year) {
      return left.year - right.year;
    }

    if (left.year !== null && right.year === null) {
      return -1;
    }

    if (left.year === null && right.year !== null) {
      return 1;
    }

    return left.sourceIndex - right.sourceIndex;
  });

  if (deduplicatedNodes.length === 0) {
    return [{ id, order: 1, year: null, title: "1 сезон" }];
  }

  return deduplicatedNodes.map((node, index) => ({
    id: node.id,
    order: index + 1,
    year: node.year,
    title: node.title,
  }));
}
