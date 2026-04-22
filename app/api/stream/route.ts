import { ANIME } from "@consumet/extensions";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const JIKAN_ANIME_ENDPOINT = "https://api.jikan.moe/v4/anime";
const TEST_STREAM_URL =
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8";

const consumet = new ANIME.Gogoanime();
(consumet as unknown as { baseUrl: string }).baseUrl = "https://anitaku.pe";

type JikanAnimeResponse = {
  data?: {
    title?: string | null;
    title_english?: string | null;
  };
};

type ParserSearchResult = {
  id?: string;
  title?: string;
};

type ParserSearchResponse = {
  results?: ParserSearchResult[];
};

type ParserEpisode = {
  id?: string;
  number?: number | string;
  episodeNumber?: number | string;
};

type ParserAnimeInfo = {
  episodes?: ParserEpisode[];
};

type ParserSource = {
  url?: string;
  isM3U8?: boolean;
};

type ParserSourcesResponse = {
  sources?: ParserSource[];
  headers?: Record<string, string>;
};

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

function testStreamResponse(): NextResponse {
  return NextResponse.json({
    stream: TEST_STREAM_URL,
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function resolveEpisodeId(
  episodes: ParserEpisode[] | undefined,
  requestedEpisode: number,
): string | null {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    return null;
  }

  const matchingEpisode = episodes.find((episode) => {
    const numberCandidate =
      typeof episode.number !== "undefined"
        ? episode.number
        : episode.episodeNumber;

    const resolvedNumber =
      typeof numberCandidate === "string"
        ? Number(numberCandidate)
        : numberCandidate;

    return Number.isFinite(resolvedNumber) && Number(resolvedNumber) === requestedEpisode;
  });

  if (matchingEpisode?.id?.trim()) {
    return matchingEpisode.id.trim();
  }

  return episodes[requestedEpisode - 1]?.id?.trim() || null;
}

export async function GET(request: NextRequest) {
  const malIdParam = request.nextUrl.searchParams.get("malId");
  const malId = Number(malIdParam);
  const episodeNumber = parseEpisodeParam(request.nextUrl.searchParams.get("ep"));

  if (!Number.isInteger(malId) || malId <= 0) {
    return testStreamResponse();
  }

  try {
    const jikanPayload = await fetchJson<JikanAnimeResponse>(
      `${JIKAN_ANIME_ENDPOINT}/${malId}`,
    );

    const titleRomaji = jikanPayload?.data?.title?.trim() || "";
    const titleEnglish = jikanPayload?.data?.title_english?.trim() || "";
    const title = titleRomaji || titleEnglish;

    if (!title) {
      throw new Error("Failed to resolve anime title from Jikan");
    }

    const normalizedTitle = normalizeTitle(title);

    if (!normalizedTitle) {
      throw new Error("Failed to normalize anime title");
    }

    const searchQueries = [titleRomaji, titleEnglish, normalizedTitle].filter(
      (query, index, arr) => query.length > 0 && arr.indexOf(query) === index,
    );

    let searchResults: ParserSearchResponse = { results: [] };

    for (const query of searchQueries) {
      const currentSearchResults = (await consumet.search(query)) as ParserSearchResponse;

      if (currentSearchResults.results?.length) {
        searchResults = currentSearchResults;
        break;
      }
    }

    if (!searchResults.results?.length) {
      throw new Error("Parser search returned empty results for all query variants");
    }

    const animeId = searchResults.results?.[0]?.id?.trim() || null;

    if (!animeId) {
      throw new Error("Parser search returned no anime id");
    }

    const animeInfo = (await consumet.fetchAnimeInfo(animeId)) as ParserAnimeInfo;

    const episodeId = resolveEpisodeId(animeInfo.episodes, episodeNumber);

    if (!episodeId) {
      throw new Error("Parser anime info returned no episode id");
    }

    const streamLinks = (await consumet.fetchEpisodeSources(
      episodeId,
    )) as ParserSourcesResponse;

    const sources = streamLinks.sources ?? [];
    const streamUrl =
      sources.find((source) => source.isM3U8 === true && typeof source.url === "string")
        ?.url || sources[0]?.url;
    const streamHeaders = streamLinks.headers;

    if (!streamUrl) {
      throw new Error("Stream URL is empty or undefined");
    }

    return NextResponse.json({
      stream: streamUrl,
      headers: streamHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parser error";
    console.error("[stream] failed to resolve stream", {
      malId: malIdParam,
      episodeNumber,
      error: message,
    });
    return testStreamResponse();
  }
}
