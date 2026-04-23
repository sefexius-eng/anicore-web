import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface HistoryRequestBody {
  animeId?: unknown;
  lastTime?: unknown;
}

function normalizeInteger(value: unknown): number | null {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  const normalizedValue = Math.floor(parsedValue);
  return normalizedValue >= 0 ? normalizedValue : null;
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = Number(session?.user?.id ?? Number.NaN);

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as HistoryRequestBody | null;
  const animeId = normalizeInteger(body?.animeId);
  const lastTime = normalizeInteger(body?.lastTime);

  if (!animeId || lastTime === null) {
    return NextResponse.json(
      { error: "Invalid history payload." },
      { status: 400 },
    );
  }

  await prisma.watchHistory.upsert({
    where: {
      userId_animeId: {
        userId,
        animeId,
      },
    },
    update: {
      lastTime,
    },
    create: {
      userId,
      animeId,
      lastTime,
      episodesWatched: 0,
    },
  });

  return NextResponse.json({ success: true });
}
