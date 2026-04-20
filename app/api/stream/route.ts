import { ANIME } from "@consumet/extensions";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const JIKAN_ANIME_ENDPOINT = "https://api.jikan.moe/v4/anime";
const TEST_STREAM_URL =
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8";

const consumet = new ANIME.Gogoanime("https://anitaku.pe");

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

  console.log(`[stream] request malId=${malIdParam} episode=${episodeNumber}`);

  if (!Number.isInteger(malId) || malId <= 0) {
    return testStreamResponse("invalid malId parameter");
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

    console.log(`[stream] jikan title romaji: ${titleRomaji || "empty"}`);
    console.log(`[stream] jikan title english: ${titleEnglish || "empty"}`);

    const normalizedTitle = normalizeTitle(title);

    if (!normalizedTitle) {
      throw new Error("Failed to normalize anime title");
    }

    console.log(`[stream] normalized title: ${normalizedTitle}`);

    const searchQueries = [titleRomaji, titleEnglish, normalizedTitle].filter(
      (query, index, arr) => query.length > 0 && arr.indexOf(query) === index,
    );

    let searchResults: ParserSearchResponse = { results: [] };
    let selectedQuery = "";

    for (const query of searchQueries) {
      console.log(`[stream] parser search query: ${query}`);
      const currentSearchResults = (await consumet.search(query)) as ParserSearchResponse;
      console.log(
        `[stream] parser search results (${query}): ${safeJsonStringify(currentSearchResults)}`,
      );

      if (currentSearchResults.results?.length) {
        searchResults = currentSearchResults;
        selectedQuery = query;
        console.log(`[stream] parser search matched with query: ${query}`);
        break;
      }
    }

    if (!searchResults.results?.length) {
      throw new Error("Parser search returned empty results for all query variants");
    }

    console.log(`[stream] parser selected query: ${selectedQuery}`);

    const animeId = searchResults.results?.[0]?.id?.trim() || null;

    if (!animeId) {
      throw new Error("Parser search returned no anime id");
    }

    console.log(`[stream] parser anime id: ${animeId}`);

    const animeInfo = (await consumet.fetchAnimeInfo(animeId)) as ParserAnimeInfo;
    console.log(`[stream] parser anime info: ${safeJsonStringify(animeInfo)}`);

    const episodeId = resolveEpisodeId(animeInfo.episodes, episodeNumber);

    if (!episodeId) {
      throw new Error("Parser anime info returned no episode id");
    }

    console.log(`[stream] parser episode id: ${episodeId}`);

    const streamLinks = (await consumet.fetchEpisodeSources(
      episodeId,
    )) as ParserSourcesResponse;
    console.log(`[stream] parser stream links: ${safeJsonStringify(streamLinks)}`);
    console.log("Consumet Extracted Sources:", JSON.stringify(streamLinks.sources));

    const sources = streamLinks.sources ?? [];
    const streamUrl =
      sources.find((source) => source.isM3U8 === true && typeof source.url === "string")
        ?.url || sources[0]?.url;
    const streamHeaders = streamLinks.headers;

    if (!streamUrl) {
      throw new Error("Stream URL is empty or undefined");
    }

    console.log(`[stream] parser stream resolved: ${streamUrl}`);

    return NextResponse.json({
      stream: streamUrl,
      headers: streamHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parser error";
    console.log(`[stream] route failed: ${message}`);
    return testStreamResponse(message);
  }
}
