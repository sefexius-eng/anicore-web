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

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const malId = request.nextUrl.searchParams.get("malId");
  const translationIdParam = request.nextUrl.searchParams.get("translation_id");

  let requestedTranslationId: number | null = null;

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
    const token = process.env.KODIK_TOKEN || "56a768d08f43091901c44b54fe970049";

    if (!process.env.KODIK_TOKEN) {
      console.warn("[kodik] Using public fallback token; set KODIK_TOKEN in the environment.");
    }

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

    return NextResponse.json({
      link: selectedResult.link,
      activeTranslationId:
        typeof selectedResult.translation?.id === "number"
          ? selectedResult.translation.id
          : null,
      translations: Array.from(translationsMap.values()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch data from Kodik API.",
      },
      {
        status: 500,
      },
    );
  }
}
