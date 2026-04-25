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

export interface AnimeFranchiseGuideItem {
  id: number;
  order: number;
  title: string;
  kind: string;
  year: number | null;
  href: string;
  isCurrent: boolean;
  relationLabels: string[];
}

export interface AnimeFranchiseGuide {
  currentId: number;
  watchOrder: AnimeFranchiseGuideItem[];
  movies: AnimeFranchiseGuideItem[];
  ova: AnimeFranchiseGuideItem[];
  spinOffs: AnimeFranchiseGuideItem[];
}

export interface AnimeEpisodeSnapshot {
  id: number;
  title: string;
  status: string | null;
  episodesTotal: number | null;
  episodesAired: number | null;
  nextEpisodeAt: string | null;
}

interface ShikimoriGenre {
  id?: number | null;
  name?: string | null;
  russian?: string | null;
}

interface ShikimoriFranchiseNode {
  id?: number;
  date?: number | null;
  image_url?: string | null;
  kind?: string | null;
  name?: string | null;
  russian?: string | null;
  url?: string | null;
  weight?: number | null;
  year?: number | null;
}

interface ShikimoriFranchiseLink {
  source_id?: number | null;
  target_id?: number | null;
  relation?: string | null;
}

interface ShikimoriFranchiseResponse {
  current_id?: number;
  nodes?: ShikimoriFranchiseNode[];
  links?: ShikimoriFranchiseLink[];
}

export interface ShikimoriAnimeResponse {
  id: number;
  name: string;
  russian?: string | null;
  score?: string | number | null;
  status?: string | null;
  episodes?: number | null;
  episodes_aired?: number | null;
  next_episode_at?: string | null;
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

export async function getShikimoriTitles(
  malIds: number[],
): Promise<Record<number, string>> {
  const uniqueIds = Array.from(
    new Set(
      malIds.filter((malId) => Number.isInteger(malId) && malId > 0),
    ),
  );
  const titleMap: Record<number, string> = {};

  for (let index = 0; index < uniqueIds.length; index += 50) {
    const batch = uniqueIds.slice(index, index + 50);
    const searchParams = new URLSearchParams({
      ids: batch.join(","),
      limit: "50",
    });
    const animeList = await fetchShikimoriAnimeList(
      `/animes?${searchParams.toString()}`,
    );

    animeList.forEach((anime) => {
      const russianTitle = anime.russian?.trim();

      if (typeof anime.id === "number" && russianTitle) {
        titleMap[anime.id] = russianTitle;
      }
    });
  }

  return titleMap;
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

const FRANCHISE_RELATION_LABELS: Record<string, string> = {
  sequel: "Продолжение",
  prequel: "Предыстория",
  spin_off: "Спин-офф",
  parent_story: "Основная история",
  side_story: "Побочная история",
  summary: "Пересказ",
  alternative_version: "Альтернативная версия",
  character: "История персонажей",
  full_story: "Полная история",
  other: "Связанный тайтл",
};

const SPIN_OFF_RELATIONS = new Set([
  "spin_off",
  "parent_story",
  "side_story",
  "character",
]);

function normalizeFranchiseValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function isFranchiseTvKind(kind: string | null | undefined): boolean {
  const normalizedKind = normalizeFranchiseValue(kind);

  return (
    normalizedKind === "tv" ||
    normalizedKind === "tv СЃРµСЂРёР°Р»" ||
    normalizedKind === "tv сериал" ||
    normalizedKind === "tv series"
  );
}

function isFranchiseMovieKind(kind: string | null | undefined): boolean {
  const normalizedKind = normalizeFranchiseValue(kind);

  return normalizedKind === "movie" || normalizedKind === "фильм";
}

function isFranchiseOvaKind(kind: string | null | undefined): boolean {
  const normalizedKind = normalizeFranchiseValue(kind);

  return (
    normalizedKind === "ova" ||
    normalizedKind === "ona" ||
    normalizedKind === "special" ||
    normalizedKind === "спецвыпуск" ||
    normalizedKind === "tv special" ||
    normalizedKind === "tv спецвыпуск"
  );
}

function buildRelationMap(
  links: ShikimoriFranchiseLink[] | undefined,
): Map<number, Set<string>> {
  const relationMap = new Map<number, Set<string>>();

  if (!Array.isArray(links)) {
    return relationMap;
  }

  links.forEach((link) => {
    const relation = normalizeFranchiseValue(link.relation);

    if (!relation) {
      return;
    }

    [link.source_id, link.target_id].forEach((animeId) => {
      if (typeof animeId !== "number") {
        return;
      }

      const relations = relationMap.get(animeId) ?? new Set<string>();
      relations.add(relation);
      relationMap.set(animeId, relations);
    });
  });

  return relationMap;
}

function getFranchiseNodeDate(node: ShikimoriFranchiseNode): number {
  if (typeof node.date === "number") {
    return node.date;
  }

  if (typeof node.year === "number") {
    return new Date(`${node.year}-01-01T00:00:00.000Z`).getTime() / 1000;
  }

  return Number.MAX_SAFE_INTEGER;
}

function sortFranchiseNodes(
  left: ShikimoriFranchiseNode,
  right: ShikimoriFranchiseNode,
): number {
  const dateDelta = getFranchiseNodeDate(left) - getFranchiseNodeDate(right);

  if (dateDelta !== 0) {
    return dateDelta;
  }

  const leftWeight = typeof left.weight === "number" ? left.weight : 0;
  const rightWeight = typeof right.weight === "number" ? right.weight : 0;

  if (leftWeight !== rightWeight) {
    return rightWeight - leftWeight;
  }

  return (left.name ?? "").localeCompare(right.name ?? "", "ru");
}

function toFranchiseGuideItem(
  node: ShikimoriFranchiseNode & { id: number },
  currentId: number,
  relationMap: Map<number, Set<string>>,
  order: number,
): AnimeFranchiseGuideItem {
  const relations = Array.from(relationMap.get(node.id) ?? []);
  const relationLabels = relations
    .map((relation) => FRANCHISE_RELATION_LABELS[relation] ?? relation)
    .filter(Boolean);

  return {
    id: node.id,
    order,
    title: node.russian?.trim() || node.name?.trim() || `Anime #${node.id}`,
    kind: node.kind?.trim() || "Аниме",
    year: typeof node.year === "number" ? node.year : null,
    href: `/anime/${node.id}`,
    isCurrent: node.id === currentId,
    relationLabels: Array.from(new Set(relationLabels)),
  };
}

function hasSpinOffRelation(
  node: ShikimoriFranchiseNode & { id: number },
  relationMap: Map<number, Set<string>>,
): boolean {
  const relations = relationMap.get(node.id);

  if (!relations) {
    return false;
  }

  return Array.from(relations).some((relation) => SPIN_OFF_RELATIONS.has(relation));
}

function dedupeFranchiseItems(
  items: AnimeFranchiseGuideItem[],
): AnimeFranchiseGuideItem[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values()).map(
    (item, index) => ({
      ...item,
      order: index + 1,
    }),
  );
}

export async function getAnimeFranchiseGuide(
  id: number,
  options: ShikimoriFetchOptions = {},
): Promise<AnimeFranchiseGuide> {
  const payload = await fetchShikimoriJson<ShikimoriFranchiseResponse>(
    `/animes/${id}/franchise`,
    options,
  );
  const relationMap = buildRelationMap(payload.links);
  const currentId = typeof payload.current_id === "number" ? payload.current_id : id;
  const nodes = Array.isArray(payload.nodes)
    ? payload.nodes
        .filter(
          (node): node is ShikimoriFranchiseNode & { id: number } =>
            typeof node.id === "number",
        )
        .sort(sortFranchiseNodes)
    : [];
  const fallbackNode: ShikimoriFranchiseNode & { id: number } = {
    id,
    name: `Anime #${id}`,
    kind: "tv",
    year: null,
  };
  const normalizedNodes = nodes.length > 0 ? nodes : [fallbackNode];
  const allItems = normalizedNodes.map((node, index) =>
    toFranchiseGuideItem(node, currentId, relationMap, index + 1),
  );
  const itemById = new Map(allItems.map((item) => [item.id, item]));
  const buildItems = (
    predicate: (node: ShikimoriFranchiseNode & { id: number }) => boolean,
  ) =>
    dedupeFranchiseItems(
      normalizedNodes
        .filter(predicate)
        .map((node) => itemById.get(node.id))
        .filter((item): item is AnimeFranchiseGuideItem => Boolean(item)),
    );
  const watchOrder = buildItems((node) => isFranchiseTvKind(node.kind));

  return {
    currentId,
    watchOrder: watchOrder.length > 0 ? watchOrder : dedupeFranchiseItems(allItems),
    movies: buildItems((node) => isFranchiseMovieKind(node.kind)),
    ova: buildItems((node) => isFranchiseOvaKind(node.kind)),
    spinOffs: buildItems((node) => hasSpinOffRelation(node, relationMap)),
  };
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

function toEpisodeSnapshot(payload: ShikimoriAnimeResponse): AnimeEpisodeSnapshot {
  return {
    id: payload.id,
    title: payload.russian?.trim() || payload.name?.trim() || `Anime #${payload.id}`,
    status: payload.status?.trim() || null,
    episodesTotal:
      typeof payload.episodes === "number" && Number.isFinite(payload.episodes)
        ? payload.episodes
        : null,
    episodesAired:
      typeof payload.episodes_aired === "number" &&
      Number.isFinite(payload.episodes_aired)
        ? payload.episodes_aired
        : null,
    nextEpisodeAt: payload.next_episode_at?.trim() || null,
  };
}

export async function getAnimeEpisodeSnapshots(
  animeIds: number[],
): Promise<Map<number, AnimeEpisodeSnapshot>> {
  const uniqueIds = Array.from(
    new Set(
      animeIds.filter((animeId) => Number.isInteger(animeId) && animeId > 0),
    ),
  );
  const snapshotMap = new Map<number, AnimeEpisodeSnapshot>();

  for (let index = 0; index < uniqueIds.length; index += 50) {
    const batch = uniqueIds.slice(index, index + 50);
    const searchParams = new URLSearchParams({
      ids: batch.join(","),
      limit: "50",
    });
    const animeList = await fetchShikimoriAnimeList(
      `/animes?${searchParams.toString()}`,
    );

    animeList.forEach((anime) => {
      snapshotMap.set(anime.id, toEpisodeSnapshot(anime));
    });
  }

  return snapshotMap;
}
