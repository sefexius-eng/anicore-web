import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePositiveInteger } from "@/lib/profile-data";

const MAX_MESSAGE_LENGTH = 700;
const MESSAGE_LIMIT = 80;

interface MessageRequestBody {
  roomId?: unknown;
  content?: unknown;
}

function normalizeRoomId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeMessageContent(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(0, MAX_MESSAGE_LENGTH);
}

async function getAuthorizedUserId() {
  const session = await auth();
  return normalizePositiveInteger(session?.user?.id);
}

export async function GET(request: Request) {
  const roomId = normalizeRoomId(new URL(request.url).searchParams.get("roomId"));

  if (!roomId) {
    return NextResponse.json({ error: "Invalid roomId." }, { status: 400 });
  }

  const messages = await prisma.watchPartyMessage.findMany({
    where: {
      roomId,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: MESSAGE_LIMIT,
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const userId = await getAuthorizedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as MessageRequestBody | null;
  const roomId = normalizeRoomId(body?.roomId);
  const content = normalizeMessageContent(body?.content);

  if (!roomId || !content) {
    return NextResponse.json(
      { error: "Invalid watch-party message payload." },
      { status: 400 },
    );
  }

  const room = await prisma.watchPartyRoom.findUnique({
    where: {
      id: roomId,
    },
    select: {
      animeId: true,
      isOpen: true,
    },
  });

  if (!room?.isOpen) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.watchPartyMessage.create({
      data: {
        roomId,
        userId,
        content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    }),
    prisma.watchPartyRoom.update({
      where: {
        id: roomId,
      },
      data: {
        lastActivityAt: now,
      },
      select: {
        id: true,
      },
    }),
  ]);

  revalidatePath(`/anime/${room.animeId}`);

  return NextResponse.json({ message }, { status: 201 });
}
