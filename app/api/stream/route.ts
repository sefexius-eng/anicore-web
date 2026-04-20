import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const JIKAN_ANIME_ENDPOINT = "https://api.jikan.moe/v4/anime";

const CONSUMET_PROVIDER_ENDPOINTS = {
  gogoanime: {
    search: "https://api.consumet.org/anime/gogoanime",
    info: "https://api.consumet.org/anime/gogoanime/info",
    watch: "https://api.consumet.org/anime/gogoanime/watch",
  },
  zoro: {
    search: "https://api.consumet.org/anime/zoro",
    info: "https://api.consumet.org/anime/zoro/info",
    watch: "https://api.consumet.org/anime/zoro/watch",
  },
} as const;

type ConsumetProvider = keyof typeof CONSUMET_PROVIDER_ENDPOINTS;

type JikanAnimeResponse = {
  data?: {
    title?: string | null;
    title_english?: string | null;
  };
};

type ConsumetSearchResult = {
  id?: string;
};

type ConsumetSearchResponse = {
  results?: ConsumetSearchResult[];
  data?: {
    results?: ConsumetSearchResult[];
  };
};

type ConsumetEpisode = {
  id?: string;
  episodeId?: string;
  number?: number | string;
};

type ConsumetInfoResponse = {
  episodes?: ConsumetEpisode[];
  data?: {
    episodes?: ConsumetEpisode[];
  };
};

type ConsumetSource = {
  url?: string;
  isM3U8?: boolean;
};

type ConsumetWatchResponse = {
  sources?: ConsumetSource[];
  data?: {
    sources?: ConsumetSource[];
  };
};

type ProviderStreamResult = {
  stream: string;
  episodeId: string;
  provider: ConsumetProvider;
};

class UpstreamRequestError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "UpstreamRequestError";
    this.status = status;
  }
}

function normalizeTitle(title: string): string {
  const withoutDiacritics = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const normalizedDelimiters = withoutDiacritics.replace(/[–—]/g, "-");

  // Remove subtitle parts separated by colon/dash markers, but keep inline cases like "Re:Zero".
  const titleWithoutSubtitle =
    normalizedDelimiters.split(/\s[-:]\s|:\s+|-\s+/)[0] ?? normalizedDelimiters;

  const titleWithoutSeasonSuffix = titleWithoutSubtitle
    .replace(/\b(?:\d+(?:st|nd|rd|th)?\s+)?(?:season|part|cour)\b.*$/i, "")
    .replace(/\b(?:season|part|cour)\s*\d+\b.*$/i, "");

  return titleWithoutSeasonSuffix
    .replace(/["'`’]/g, "")
    .replace(/[()\[\]{}]/g, " ")
    .replace(/-/g, " ")
    .replace(/[^a-zA-Z0-9\s:]/g, " ")
    .replace(/:/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toKebabCase(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractWords(value: string): string[] {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function buildSearchQueries(
  provider: ConsumetProvider,
  normalizedTitle: string,
): string[] {
  const words = extractWords(normalizedTitle);
  const queries: string[] = [];

  const pushUnique = (query: string) => {
    const cleaned = query.trim();

    if (cleaned && !queries.includes(cleaned)) {
      queries.push(cleaned);
    }
  };

  const fullPhrase = words.join(" ");
  pushUnique(toKebabCase(fullPhrase));
  pushUnique(fullPhrase);

  if (provider === "gogoanime") {
    if (words.length >= 3) {
      const firstThreeWords = words.slice(0, 3).join(" ");
      pushUnique(toKebabCase(firstThreeWords));
      pushUnique(firstThreeWords);
    }

    if (words.length >= 2) {
      const firstTwoWords = words.slice(0, 2).join(" ");
      pushUnique(toKebabCase(firstTwoWords));
      pushUnique(firstTwoWords);
    }
  }

  return queries;
}

function parseEpisodeParam(value: string | null): number {
  const parsed = Number(value ?? "1");

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function extractSearchResults(payload: ConsumetSearchResponse): ConsumetSearchResult[] {
  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (Array.isArray(payload.data?.results)) {
    return payload.data.results;
  }

  return [];
}

function extractEpisodes(payload: ConsumetInfoResponse): ConsumetEpisode[] {
  if (Array.isArray(payload.episodes)) {
    return payload.episodes;
  }

  if (Array.isArray(payload.data?.episodes)) {
    return payload.data.episodes;
  }

  return [];
}

function extractSources(payload: ConsumetWatchResponse): ConsumetSource[] {
  if (Array.isArray(payload.sources)) {
    return payload.sources;
  }

  if (Array.isArray(payload.data?.sources)) {
    return payload.data.sources;
  }

  return [];
}

function isM3u8Source(source: ConsumetSource): boolean {
  if (typeof source.url !== "string") {
    return false;
  }

  return source.isM3U8 === true || source.url.toLowerCase().includes(".m3u8");
}

function resolveEpisodeId(episodes: ConsumetEpisode[], requestedEpisode: number): string | null {
  const matchingEpisode = episodes.find((episode) => {
    const number =
      typeof episode.number === "string" ? Number(episode.number) : episode.number;

    return Number.isFinite(number) && Number(number) === requestedEpisode;
  });

  const directEpisodeId =
    matchingEpisode?.id?.trim() || matchingEpisode?.episodeId?.trim();

  if (directEpisodeId) {
    return directEpisodeId;
  }

  const fallbackEpisode = episodes[requestedEpisode - 1];

  return fallbackEpisode?.id?.trim() || fallbackEpisode?.episodeId?.trim() || null;
}

async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    throw new UpstreamRequestError("Network error while requesting upstream API");
  }

  if (!response.ok) {
    throw new UpstreamRequestError(
      `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

function getProviderErrorMessage(error: unknown): string {
  if (error instanceof UpstreamRequestError) {
    if (typeof error.status === "number") {
      return `upstream status ${error.status}`;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown upstream error";
}

async function resolveProviderStream(
  provider: ConsumetProvider,
  normalizedTitle: string,
  episodeNumber: number,
): Promise<ProviderStreamResult> {
  const endpoints = CONSUMET_PROVIDER_ENDPOINTS[provider];

  const searchQueries = buildSearchQueries(provider, normalizedTitle);
  let animeId: string | null = null;

  for (const query of searchQueries) {
    console.log(`[stream] ${provider} search query: ${query}`);

    const searchPayload = await fetchJson<ConsumetSearchResponse>(
      `${endpoints.search}/${encodeURIComponent(query)}`,
    );

    animeId = extractSearchResults(searchPayload)[0]?.id?.trim() ?? null;

    if (animeId) {
      console.log(`[stream] ${provider} animeId found: ${animeId}`);
      break;
    }

    console.log(`[stream] ${provider} no matches for query: ${query}`);
  }

  if (!animeId) {
    throw new Error("Anime not found in provider search results");
  }

  const infoPayload = await fetchJson<ConsumetInfoResponse>(
    `${endpoints.info}/${encodeURIComponent(animeId)}`,
  );

  const episodes = extractEpisodes(infoPayload);
  const episodeId = resolveEpisodeId(episodes, episodeNumber);

  if (!episodeId) {
    throw new Error("Episode not found in provider episode list");
  }

  const watchPayload = await fetchJson<ConsumetWatchResponse>(
    `${endpoints.watch}/${encodeURIComponent(episodeId)}`,
  );

  const streamSource = extractSources(watchPayload).find(isM3u8Source);

  if (!streamSource?.url) {
    throw new Error("M3U8 stream source not found");
  }

  return {
    stream: streamSource.url,
    episodeId,
    provider,
  };
}

export async function GET(request: NextRequest) {
  const malIdParam = request.nextUrl.searchParams.get("malId");
  const malId = Number(malIdParam);
  const episodeNumber = parseEpisodeParam(request.nextUrl.searchParams.get("ep"));

  console.log(`[stream] request malId=${malIdParam} episode=${episodeNumber}`);

  if (!Number.isInteger(malId) || malId <= 0) {
    return NextResponse.json(
      { error: "Параметр malId обязателен и должен быть положительным числом." },
      { status: 400 },
    );
  }

  try {
    const jikanPayload = await fetchJson<JikanAnimeResponse>(
      `${JIKAN_ANIME_ENDPOINT}/${malId}`,
    );

    const title =
      jikanPayload.data?.title_english?.trim() || jikanPayload.data?.title?.trim();

    if (!title) {
      return NextResponse.json(
        { error: "Не удалось определить название аниме в Jikan." },
        { status: 404 },
      );
    }

    console.log(`[stream] jikan title: ${title}`);

    const normalizedTitle = normalizeTitle(title);

    if (!normalizedTitle) {
      return NextResponse.json(
        { error: "Не удалось нормализовать название для поиска в Consumet." },
        { status: 404 },
      );
    }

    console.log(`[stream] normalized title: ${normalizedTitle}`);

    const providerErrors: string[] = [];
    let streamResult: ProviderStreamResult | null = null;

    // Primary attempt through Gogoanime. Any upstream error (including 451) triggers fallback.
    try {
      streamResult = await resolveProviderStream(
        "gogoanime",
        normalizedTitle,
        episodeNumber,
      );
      console.log("[stream] provider selected: gogoanime");
    } catch (error) {
      console.log(
        `[stream] gogoanime failed, switching to zoro: ${getProviderErrorMessage(error)}`,
      );
      providerErrors.push(`gogoanime: ${getProviderErrorMessage(error)}`);
    }

    if (!streamResult) {
      try {
        streamResult = await resolveProviderStream(
          "zoro",
          normalizedTitle,
          episodeNumber,
        );
        console.log("[stream] provider selected: zoro");
      } catch (error) {
        console.log(
          `[stream] zoro failed: ${getProviderErrorMessage(error)}`,
        );
        providerErrors.push(`zoro: ${getProviderErrorMessage(error)}`);
      }
    }

    if (!streamResult) {
      return NextResponse.json(
        {
          error: "Не удалось получить поток ни от Gogoanime, ни от Zoro.",
          details: providerErrors,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      stream: streamResult.stream,
      episodeId: streamResult.episodeId,
      episode: episodeNumber,
      provider: streamResult.provider,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Внутренняя ошибка при получении потока.",
      },
      { status: 500 },
    );
  }
}
