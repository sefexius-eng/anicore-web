import { NextRequest, NextResponse } from "next/server";

type TranslationType = "voice" | "subtitles";

interface KodikSearchTranslation {
  id?: number;
  title?: string;
  type?: TranslationType | string;
}

interface KodikSearchResult {
  link?: string;
  translation?: KodikSearchTranslation;
  last_season?: number | string | null;
  blocked_seasons?: unknown;
}

interface KodikSearchResponse {
  results?: KodikSearchResult[];
}

interface TranslationOption {
  id: number;
  title: string;
  type: TranslationType;
}

function isTranslationType(value: unknown): value is TranslationType {
  return value === "voice" || value === "subtitles";
}

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function collectBlockedSeasons(value: unknown): Set<number> {
  const blocked = new Set<number>();

  if (Array.isArray(value)) {
    for (const season of value) {
      const parsedSeason = parsePositiveInteger(season);
      if (parsedSeason !== null) {
        blocked.add(parsedSeason);
      }
    }

    return blocked;
  }

  if (typeof value === "object" && value !== null) {
    for (const key of Object.keys(value)) {
      const parsedSeason = parsePositiveInteger(key);
      if (parsedSeason !== null) {
        blocked.add(parsedSeason);
      }
    }
  }

  return blocked;
}

function buildAvailableSeasons(result: KodikSearchResult): number[] {
  const lastSeason = parsePositiveInteger(result.last_season) ?? 1;
  const blockedSeasons = collectBlockedSeasons(result.blocked_seasons);

  const seasons = Array.from({ length: lastSeason }, (_, index) => index + 1).filter(
    (season) => !blockedSeasons.has(season),
  );

  return seasons.length > 0 ? seasons : [1];
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const malId = request.nextUrl.searchParams.get("malId");
  const translationIdParam = request.nextUrl.searchParams.get("translation_id");
  const seasonParam = request.nextUrl.searchParams.get("season");

  let requestedTranslationId: number | null = null;
  let requestedSeason: number | null = null;

  if (translationIdParam !== null) {
    const parsedTranslationId = Number(translationIdParam);

    if (!Number.isInteger(parsedTranslationId) || parsedTranslationId <= 0) {
      return NextResponse.json(
        {
          error: "Invalid translation_id search parameter.",
        },
        {
          status: 400,
        },
      );
    }

    requestedTranslationId = parsedTranslationId;
  }

  if (seasonParam !== null) {
    const parsedSeason = Number(seasonParam);

    if (!Number.isInteger(parsedSeason) || parsedSeason <= 0) {
      return NextResponse.json(
        {
          error: "Invalid season search parameter.",
        },
        {
          status: 400,
        },
      );
    }

    requestedSeason = parsedSeason;
  }

  if (!malId) {
    return NextResponse.json(
      {
        error: "Missing malId search parameter.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const numericMalId = Number(malId);

    if (!Number.isInteger(numericMalId) || numericMalId <= 0) {
      return NextResponse.json(
        {
          error: "Invalid malId search parameter.",
        },
        {
          status: 400,
        },
      );
    }

    const token = process.env.KODIK_TOKEN || "56a768d08f43091901c44b54fe970049";

    const response = await fetch(
      `https://kodik-api.com/search?token=${token}&shikimori_id=${malId}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Origin: "https://anicore.me",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Kodik API request failed with status ${response.status}.`,
        },
        {
          status: response.status,
        },
      );
    }

    const data = (await response.json()) as KodikSearchResponse;

    const playableResults = (data.results ?? []).filter(
      (result): result is KodikSearchResult & { link: string } =>
        typeof result.link === "string" && result.link.length > 0,
    );

    const selectedResult =
      requestedTranslationId === null
        ? playableResults[0]
        : playableResults.find(
            (result) => result.translation?.id === requestedTranslationId,
          ) ?? playableResults[0];

    if (!selectedResult?.link) {
      return NextResponse.json(
        {
          error: "Kodik API returned no playable link.",
        },
        {
          status: 404,
        },
      );
    }

    const translationsMap = new Map<string, TranslationOption>();

    for (const result of data.results ?? []) {
      const translation = result.translation;

      if (
        typeof translation?.id !== "number" ||
        typeof translation.title !== "string" ||
        !isTranslationType(translation.type)
      ) {
        continue;
      }

      const title = translation.title.trim();

      if (!title) {
        continue;
      }

      const key = `${translation.type}:${translation.id}`;

      if (!translationsMap.has(key)) {
        translationsMap.set(key, {
          id: translation.id,
          title,
          type: translation.type,
        });
      }
    }

    const seasons = buildAvailableSeasons(selectedResult);
    const activeSeason =
      requestedSeason !== null && seasons.includes(requestedSeason)
        ? requestedSeason
        : seasons[0];

    return NextResponse.json({
      link: selectedResult.link,
      activeTranslationId:
        typeof selectedResult.translation?.id === "number"
          ? selectedResult.translation.id
          : null,
      seasons,
      activeSeason,
      translations: Array.from(translationsMap.values()),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch data from Kodik API.";
    console.error("[kodik] failed to fetch player data", {
      malId,
      translationId: translationIdParam,
      season: seasonParam,
      error: message,
    });

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
