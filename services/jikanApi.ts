import { getPosterUrl, pickPosterUrl } from "@/lib/poster";

export interface AnimeShowcaseItem {
  id: number;
  name: string;
  russian?: string | null;
  title: string;
  image: {
    original?: string | null;
    preview?: string | null;
    x160?: string | null;
  } | null;
  image_url: string;
  score: number | null;
}

export interface AnimeSearchParams {
  search?: string;
  genre?: string;
  season?: string;
}

export interface AnimeDetailsItem extends AnimeShowcaseItem {
  synopsis: string;
  genres: string[];
  genreIds: number[];
}

export interface AnimeFranchiseSeasonItem {
  id: number;
  order: number;
  year: number | null;
  title: string;
}

interface ShikimoriGenre {
  id?: number | null;
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

export interface ShikimoriAnimeResponse {
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
    x160?: string | null;
    x96?: string | null;
    x48?: string | null;
  };
}

const SHIKIMORI_API_ORIGIN = "https://shikimori.one";
const SHIKIMORI_API_PATH = "/api";
const SHIKIMORI_REVALIDATE_SECONDS = 60 * 60;
const FALLBACK_POSTER = getPosterUrl("/assets/globals/missing_original.jpg");
const RESTRICTED_GENRE_NAMES = new Set([
  "ecchi",
  "hentai",
  "этти",
  "хентай",
]);

export class AdultContentBlockedError extends Error {
  constructor(message = "Adult content is restricted for the current viewer.") {
    super(message);
    this.name = "AdultContentBlockedError";
  }
}

interface ShikimoriFetchOptions {
  signal?: AbortSignal;
  revalidate?: number;
}

function getShikimoriApiBaseUrl(): string {
  return `${SHIKIMORI_API_ORIGIN}${SHIKIMORI_API_PATH}`;
}

type ShikimoriRequestInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

async function fetchShikimoriJson<T>(
  path: string,
  options: ShikimoriFetchOptions = {},
): Promise<T> {
  const requestInit: ShikimoriRequestInit = {
    method: "GET",
    signal: options.signal,
    headers: {
      Accept: "application/json",
    },
  };

  if (typeof window === "undefined") {
    requestInit.next = {
      revalidate: options.revalidate ?? SHIKIMORI_REVALIDATE_SECONDS,
    };
  } else {
    requestInit.cache = "no-store";
  }

  const response = await fetch(`${getShikimoriApiBaseUrl()}${path}`, requestInit);

  if (!response.ok) {
    throw new Error(`Shikimori API request failed for ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchShikimoriAnimeList(
  path: string,
  options: ShikimoriFetchOptions = {},
): Promise<ShikimoriAnimeResponse[]> {
  try {
    const payload = await fetchShikimoriJson<ShikimoriAnimeResponse[]>(
      path,
      options,
    );

    return Array.isArray(payload) ? payload.filter(Boolean) : [];
  } catch {
    return [];
  }
}

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
    resolveImageUrl(payload.image?.x160),
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

function resolveGenreIds(payload: ShikimoriAnimeResponse): number[] {
  if (!Array.isArray(payload.genres)) {
    return [];
  }

  return payload.genres
    .map((genre) => genre.id)
    .filter((genreId): genreId is number => typeof genreId === "number");
}

function normalizeGenreName(name: string | null | undefined): string {
  return name?.trim().toLowerCase() ?? "";
}

function hasRestrictedGenres(
  payload: Pick<ShikimoriAnimeResponse, "genres">,
): boolean {
  if (!Array.isArray(payload.genres)) {
    return false;
  }

  return payload.genres.some((genre) => {
    const englishName = normalizeGenreName(genre.name);
    const russianName = normalizeGenreName(genre.russian);

    return (
      RESTRICTED_GENRE_NAMES.has(englishName) ||
      RESTRICTED_GENRE_NAMES.has(russianName)
    );
  });
}

function assertAnimeAudienceAccess(
  payload: Pick<ShikimoriAnimeResponse, "genres">,
) {
  if (hasRestrictedGenres(payload)) {
    throw new AdultContentBlockedError();
  }
}

async function fetchAnimePayload(
  id: number,
  options: ShikimoriFetchOptions = {},
): Promise<ShikimoriAnimeResponse> {
  return fetchShikimoriJson<ShikimoriAnimeResponse>(`/animes/${id}`, options);
}

export function toAnimeShowcaseItem(
  payload: ShikimoriAnimeResponse,
): AnimeShowcaseItem {
  return {
    id: payload.id,
    name: payload.name,
    russian: payload.russian ?? null,
    title: resolveTitle(payload),
    image: payload.image
      ? {
          original: payload.image.original ?? null,
          preview: payload.image.preview ?? null,
          x160: payload.image.x160 ?? payload.image.x96 ?? null,
        }
      : null,
    image_url: resolvePosterUrl(payload),
    score: resolveScore(payload.score),
  };
}

export async function getAnimeById(
  id: number,
  options: ShikimoriFetchOptions = {},
): Promise<AnimeShowcaseItem> {
  const payload = await fetchAnimePayload(id, options);
  assertAnimeAudienceAccess(payload);

  return toAnimeShowcaseItem(payload);
}

export async function getAnimeDetailsById(
  id: number,
  options: ShikimoriFetchOptions = {},
): Promise<AnimeDetailsItem> {
  const payload = await fetchAnimePayload(id, options);
  assertAnimeAudienceAccess(payload);

  return {
    ...toAnimeShowcaseItem(payload),
    synopsis: resolveSynopsis(payload),
    genres: resolveGenres(payload),
    genreIds: resolveGenreIds(payload),
  };
}

export async function getPopularOngoing(
  limit = 24,
): Promise<ShikimoriAnimeResponse[]> {
  const searchParams = new URLSearchParams({
    status: "ongoing",
    order: "popularity",
    limit: String(limit),
  });

  return fetchShikimoriAnimeList(`/animes?${searchParams.toString()}`);
}

export async function getRecommendationsByGenres(
  genreIds: string | number | Array<string | number>,
  limit = 24,
): Promise<ShikimoriAnimeResponse[]> {
  const normalizedGenreIds = Array.isArray(genreIds)
    ? genreIds.join(",")
    : String(genreIds);

  if (!normalizedGenreIds.trim()) {
    return [];
  }

  const searchParams = new URLSearchParams({
    genre: normalizedGenreIds,
    order: "ranked",
    limit: String(limit),
  });

  return fetchShikimoriAnimeList(`/animes?${searchParams.toString()}`);
}

export async function searchAnime(
  params: AnimeSearchParams | string,
  limit = 20,
  options: ShikimoriFetchOptions = {},
): Promise<AnimeShowcaseItem[]> {
  const normalizedParams =
    typeof params === "string"
      ? { search: params }
      : params;
  const searchQuery = normalizedParams.search?.trim() || "";
  const genre = normalizedParams.genre?.trim() || "";
  const season = normalizedParams.season?.trim() || "";

  if (!searchQuery && !genre && !season) {
    return [];
  }

  const searchParams = new URLSearchParams({
    limit: String(limit),
    censored: "true",
  });

  if (searchQuery) {
    searchParams.set("search", searchQuery);
  }

  if (genre) {
    searchParams.set("genre", genre);
  }

  if (season) {
    searchParams.set("season", season);
  }

  const payload = await fetchShikimoriJson<ShikimoriAnimeResponse[]>(
    `/animes?${searchParams.toString()}`,
    options,
  );

  if (!Array.isArray(payload)) {
    return [];
  }

  const visiblePayload = payload.filter((anime) => !hasRestrictedGenres(anime));

  return visiblePayload.map(toAnimeShowcaseItem);
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
  options: ShikimoriFetchOptions = {},
): Promise<AnimeFranchiseSeasonItem[]> {
  const payload = await fetchShikimoriJson<ShikimoriFranchiseResponse>(
    `/animes/${id}/franchise`,
    options,
  );
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
