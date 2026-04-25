import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePositiveInteger } from "@/lib/profile-data";

const MAX_ROOM_TITLE_LENGTH = 80;
const MAX_ROOM_DESCRIPTION_LENGTH = 240;
const ROOM_LIMIT = 20;

interface RoomRequestBody {
  animeId?: unknown;
  title?: unknown;
  description?: unknown;
  startsAt?: unknown;
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(0, maxLength);
}

function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue.slice(0, maxLength) : null;
}

function normalizeOptionalDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

async function getAuthorizedUserId() {
  const session = await auth();
  return normalizePositiveInteger(session?.user?.id);
}

export async function GET(request: Request) {
  const animeId = normalizePositiveInteger(
    new URL(request.url).searchParams.get("animeId"),
  );

  if (!animeId) {
    return NextResponse.json({ error: "Invalid animeId." }, { status: 400 });
  }

  const rooms = await prisma.watchPartyRoom.findMany({
    where: {
      animeId,
      isOpen: true,
    },
    orderBy: {
      lastActivityAt: "desc",
    },
    take: ROOM_LIMIT,
    select: {
      id: true,
      animeId: true,
      title: true,
      description: true,
      startsAt: true,
      lastActivityAt: true,
      createdAt: true,
      host: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          content: true,
          createdAt: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    rooms: rooms.map((room) => ({
      ...room,
      messageCount: room._count.messages,
      lastMessage: room.messages[0] ?? null,
      _count: undefined,
      messages: undefined,
    })),
  });
}

export async function POST(request: Request) {
  const userId = await getAuthorizedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as RoomRequestBody | null;
  const animeId = normalizePositiveInteger(body?.animeId);
  const title = normalizeText(body?.title, MAX_ROOM_TITLE_LENGTH);
  const description = normalizeOptionalText(
    body?.description,
    MAX_ROOM_DESCRIPTION_LENGTH,
  );
  const startsAt = normalizeOptionalDate(body?.startsAt);

  if (!animeId || !title) {
    return NextResponse.json(
      { error: "Invalid watch-party room payload." },
      { status: 400 },
    );
  }

  const room = await prisma.watchPartyRoom.create({
    data: {
      animeId,
      hostId: userId,
      title,
      description,
      startsAt,
    },
    select: {
      id: true,
      animeId: true,
      title: true,
      description: true,
      startsAt: true,
      lastActivityAt: true,
      createdAt: true,
      host: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  revalidatePath(`/anime/${animeId}`);

  return NextResponse.json(
    {
      room: {
        ...room,
        messageCount: 0,
        lastMessage: null,
      },
    },
    { status: 201 },
  );
}
