import { NextRequest, NextResponse } from "next/server";

interface KodikSearchResult {
  link?: string;
}

interface KodikSearchResponse {
  results?: KodikSearchResult[];
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const malId = request.nextUrl.searchParams.get("malId");

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

    if (!Array.isArray(data.results) || !data.results[0]?.link) {
      return NextResponse.json(
        {
          error: "Kodik API returned no playable link.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({ link: data.results[0].link });
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
