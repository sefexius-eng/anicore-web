import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { MARATHONER_ACHIEVEMENT_ID } from "@/lib/achievements";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface HistoryRequestBody {
  animeId?: unknown;
  time?: unknown;
  episodeNumber?: unknown;
  totalAvailable?: unknown;
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
  const episodeNumber =
    typeof body?.episodeNumber === "undefined"
      ? undefined
      : normalizeInteger(body.episodeNumber);
  const totalAvailable =
    typeof body?.totalAvailable === "undefined"
      ? undefined
      : normalizeInteger(body.totalAvailable);

  if (!animeId || time === null || episodeNumber === null || totalAvailable === null) {
    return NextResponse.json(
      { error: "Invalid history payload." },
      { status: 400 },
    );
  }

  const existingHistory = await prisma.watchHistory.findUnique({
    where: {
      userId_animeId: {
        userId,
        animeId,
      },
    },
    select: {
      episodesWatched: true,
      totalAvailable: true,
    },
  });

  await prisma.watchHistory.upsert({
    where: {
      userId_animeId: {
        userId,
        animeId,
      },
    },
    update: {
      lastTime: time,
      ...(typeof episodeNumber === "number"
        ? {
            episodesWatched: Math.max(
              existingHistory?.episodesWatched ?? 0,
              episodeNumber,
            ),
          }
        : {}),
      ...(typeof totalAvailable === "number"
        ? {
            totalAvailable,
          }
        : {}),
    },
    create: {
      userId,
      animeId,
      lastTime: time,
      episodesWatched: episodeNumber ?? 0,
      totalAvailable: totalAvailable ?? 0,
    },
  });

  const watchedTitlesCount = await prisma.watchHistory.count({
    where: {
      userId,
    },
  });

  if (watchedTitlesCount > 10) {
    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId,
          achievementId: MARATHONER_ACHIEVEMENT_ID,
        },
      },
      update: {},
      create: {
        userId,
        achievementId: MARATHONER_ACHIEVEMENT_ID,
      },
    });
  }

  revalidatePath("/");
  revalidatePath(`/anime/${animeId}`);
  revalidatePath("/profile");
  revalidatePath(`/user/${userId}`);

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
  revalidatePath("/profile");
  revalidatePath(`/user/${userId}`);

  return NextResponse.json({ success: true });
}
