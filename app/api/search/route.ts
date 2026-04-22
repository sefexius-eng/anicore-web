import { NextResponse } from "next/server";

import { searchAnime } from "@/services/jikanApi";

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;

function resolveLimit(rawLimit: string | null): number {
  const parsedLimit = Number(rawLimit);

  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsedLimit, MAX_LIMIT);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (!query) {
    return NextResponse.json(
      { results: [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const limit = resolveLimit(searchParams.get("limit"));

  try {
    const results = await searchAnime(query, limit);

    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { results: [], error: "Search request failed" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
