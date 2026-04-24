import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWatchlistStatus } from "@/lib/watchlist";

interface WatchlistRequestBody {
  animeId?: unknown;
  status?: unknown;
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
  return normalizedValue > 0 ? normalizedValue : null;
}

async function getAuthorizedUserId() {
  const session = await auth();
  return normalizeInteger(session?.user?.id);
}

export async function GET(request: Request) {
  const userId = await getAuthorizedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const animeId = normalizeInteger(
    new URL(request.url).searchParams.get("animeId"),
  );

  if (new URL(request.url).searchParams.has("animeId") && !animeId) {
    return NextResponse.json({ error: "Invalid animeId." }, { status: 400 });
  }

  if (animeId) {
    const item = await prisma.watchlist.findUnique({
      where: {
        userId_animeId: {
          userId,
          animeId,
        },
      },
      select: {
        animeId: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ item });
  }

  const items = await prisma.watchlist.findMany({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      animeId: true,
      status: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const userId = await getAuthorizedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | WatchlistRequestBody
    | null;
  const animeId = normalizeInteger(body?.animeId);
  const status = body?.status;

  if (!animeId || !isWatchlistStatus(status)) {
    return NextResponse.json(
      { error: "Invalid watchlist payload." },
      { status: 400 },
    );
  }

  const item = await prisma.watchlist.upsert({
    where: {
      userId_animeId: {
        userId,
        animeId,
      },
    },
    update: {
      status,
    },
    create: {
      userId,
      animeId,
      status,
    },
    select: {
      animeId: true,
      status: true,
      updatedAt: true,
    },
  });

  revalidatePath("/profile");

  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const userId = await getAuthorizedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | WatchlistRequestBody
    | null;
  const animeId = normalizeInteger(body?.animeId);

  if (!animeId) {
    return NextResponse.json(
      { error: "Invalid watchlist payload." },
      { status: 400 },
    );
  }

  await prisma.watchlist.deleteMany({
    where: {
      userId,
      animeId,
    },
  });

  revalidatePath("/profile");

  return NextResponse.json({ success: true });
}
