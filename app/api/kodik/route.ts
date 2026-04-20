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
    const response = await fetch(
      `https://kodikapi.com/search?token=${process.env.KODIK_TOKEN || "test_token"}&shikimori_id=${malId}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
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
    const link = data.results?.[0]?.link;

    if (!link) {
      return NextResponse.json(
        {
          error: "Kodik API returned no playable link.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({ link });
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
