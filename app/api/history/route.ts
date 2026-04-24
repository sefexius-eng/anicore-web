import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface HistoryRequestBody {
  animeId?: unknown;
  time?: unknown;
}

function hasOwnProperty(value: object, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
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
  const session = await getServerSession(authOptions);
  const userId = normalizeInteger(session?.user?.id);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as HistoryRequestBody | null;
  const animeId = normalizeInteger(body?.animeId);
  const time = normalizeInteger(body?.time);

  if (!animeId || time === null) {
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
      lastTime: time,
    },
    create: {
      userId,
      animeId,
      lastTime: time,
      episodesWatched: 0,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = normalizeInteger(session?.user?.id);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | HistoryRequestBody
    | null;
  const hasAnimeId = body !== null && hasOwnProperty(body, "animeId");

  if (hasAnimeId) {
    const animeId = normalizeInteger(body?.animeId);

    if (!animeId) {
      return NextResponse.json(
        { error: "Invalid history payload." },
        { status: 400 },
      );
    }

    await prisma.watchHistory.deleteMany({
      where: {
        userId,
        animeId,
      },
    });
  } else {
    await prisma.watchHistory.deleteMany({
      where: {
        userId,
      },
    });
  }

  revalidatePath("/");

  return NextResponse.json({ success: true });
}
