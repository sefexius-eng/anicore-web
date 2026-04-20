import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const JIKAN_ANIME_ENDPOINT = "https://api.jikan.moe/v4/anime";
const ROUGE_SEARCH_ENDPOINT =
  "https://api-anime-rouge.vercel.app/aniwatch/search";
const ROUGE_EPISODES_ENDPOINT =
  "https://api-anime-rouge.vercel.app/aniwatch/episodes";
const ROUGE_EPISODE_SRCS_ENDPOINT =
  "https://api-anime-rouge.vercel.app/aniwatch/episode-srcs";
const TEST_STREAM_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

type JikanAnimeResponse = {
  data?: {
    title?: string | null;
    title_english?: string | null;
  };
};

type RougeAnimeSearchItem = {
  id?: string;
};

type RougeSearchResponse = {
  animes?: RougeAnimeSearchItem[];
  data?: {
    animes?: RougeAnimeSearchItem[];
  };
};

type RougeEpisode = {
  id?: string;
  episodeId?: string;
  number?: number | string;
};

type RougeEpisodesResponse = {
  episodes?: RougeEpisode[];
  data?: {
    episodes?: RougeEpisode[];
  };
};

type RougeSource = {
  url?: string;
};

type RougeEpisodeSrcsResponse = {
  sources?: RougeSource[];
  data?: {
    sources?: RougeSource[];
  };
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

function parseEpisodeParam(value: string | null): number {
  const parsed = Number(value ?? "1");

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function extractRougeAnimes(payload: RougeSearchResponse): RougeAnimeSearchItem[] {
  if (Array.isArray(payload.animes)) {
    return payload.animes;
  }

  if (Array.isArray(payload.data?.animes)) {
    return payload.data.animes;
  }

  return [];
}

function extractRougeEpisodes(payload: RougeEpisodesResponse): RougeEpisode[] {
  if (Array.isArray(payload.episodes)) {
    return payload.episodes;
  }

  if (Array.isArray(payload.data?.episodes)) {
    return payload.data.episodes;
  }

  return [];
}

function extractRougeSources(payload: RougeEpisodeSrcsResponse): RougeSource[] {
  if (Array.isArray(payload.sources)) {
    return payload.sources;
  }

  if (Array.isArray(payload.data?.sources)) {
    return payload.data.sources;
  }

  return [];
}

function resolveEpisodeId(episodes: RougeEpisode[], requestedEpisode: number): string | null {
  const matchingEpisode = episodes.find((episode) => {
    const number =
      typeof episode.number === "string" ? Number(episode.number) : episode.number;

    return Number.isFinite(number) && Number(number) === requestedEpisode;
  });

  const directEpisodeId =
    matchingEpisode?.episodeId?.trim() || matchingEpisode?.id?.trim();

  if (directEpisodeId) {
    return directEpisodeId;
  }

  const fallbackEpisode = episodes[requestedEpisode - 1];

  return fallbackEpisode?.episodeId?.trim() || fallbackEpisode?.id?.trim() || null;
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

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable-json]";
  }
}

function testStreamResponse(reason: string): NextResponse {
  console.log(`[stream] fallback test stream reason: ${reason}`);

  return NextResponse.json({
    stream: TEST_STREAM_URL,
  });
}

export async function GET(request: NextRequest) {
  const malIdParam = request.nextUrl.searchParams.get("malId");
  const malId = Number(malIdParam);
  const episodeNumber = parseEpisodeParam(request.nextUrl.searchParams.get("ep"));

  console.log(`[stream] request malId=${malIdParam} episode=${episodeNumber}`);

  if (!Number.isInteger(malId) || malId <= 0) {
    return testStreamResponse("invalid malId parameter");
  }

  try {
    const jikanPayload = await fetchJson<JikanAnimeResponse>(
      `${JIKAN_ANIME_ENDPOINT}/${malId}`,
    );

    const title =
      jikanPayload.data?.title_english?.trim() || jikanPayload.data?.title?.trim();

    if (!title) {
      throw new Error("Failed to resolve anime title from Jikan");
    }

    console.log(`[stream] jikan title: ${title}`);

    const normalizedTitle = normalizeTitle(title);

    if (!normalizedTitle) {
      throw new Error("Failed to normalize anime title");
    }

    console.log(`[stream] normalized title: ${normalizedTitle}`);

    const searchUrl = `${ROUGE_SEARCH_ENDPOINT}?keyword=${encodeURIComponent(normalizedTitle)}`;
    console.log(`[stream] rouge search url: ${searchUrl}`);

    const searchPayload = await fetchJson<RougeSearchResponse>(searchUrl);
    console.log(
      `[stream] Rouge API Search Result: ${safeJsonStringify(searchPayload)}`,
    );

    const animeId = extractRougeAnimes(searchPayload)[0]?.id?.trim() ?? null;

    console.log(`[stream] rouge animeId: ${animeId ?? "not-found"}`);

    if (!animeId) {
      throw new Error("Rouge search returned no animeId");
    }

    const episodesUrl = `${ROUGE_EPISODES_ENDPOINT}/${encodeURIComponent(animeId)}`;
    console.log(`[stream] rouge episodes url: ${episodesUrl}`);

    const episodesPayload = await fetchJson<RougeEpisodesResponse>(episodesUrl);
    console.log(
      `[stream] Rouge API Episodes Result: ${safeJsonStringify(episodesPayload)}`,
    );

    const episodes = extractRougeEpisodes(episodesPayload);
    const episodeId = resolveEpisodeId(episodes, episodeNumber);

    console.log(
      `[stream] rouge episodeId for episode ${episodeNumber}: ${episodeId ?? "not-found"}`,
    );

    if (!episodeId) {
      throw new Error("Rouge episodes returned no episodeId");
    }

    const streamUrl = `${ROUGE_EPISODE_SRCS_ENDPOINT}?id=${encodeURIComponent(episodeId)}&server=vidstreaming&category=sub`;
    console.log(`[stream] rouge stream url: ${streamUrl}`);

    const streamPayload = await fetchJson<RougeEpisodeSrcsResponse>(streamUrl);
    console.log(
      `[stream] Rouge API Stream Result: ${safeJsonStringify(streamPayload)}`,
    );

    const sources = extractRougeSources(streamPayload);
    const source =
      sources.find(
        (streamSource) =>
          typeof streamSource.url === "string" &&
          streamSource.url.toLowerCase().includes(".m3u8"),
      ) ?? sources.find((streamSource) => typeof streamSource.url === "string");

    if (!source?.url) {
      throw new Error("Rouge stream response has no playable source url");
    }

    console.log(`[stream] rouge stream resolved: ${source.url}`);

    return NextResponse.json({
      stream: source.url,
    });
  } catch (error) {
    console.log(`[stream] route failed: ${getProviderErrorMessage(error)}`);
    return testStreamResponse(getProviderErrorMessage(error));
  }
}
