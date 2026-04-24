import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_COMMENT_LENGTH = 1000;

interface CommentRequestBody {
  animeId?: unknown;
  content?: unknown;
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

function normalizeCommentContent(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue || normalizedValue.length > MAX_COMMENT_LENGTH) {
    return null;
  }

  return normalizedValue;
}

async function getAuthorizedUserId() {
  const session = await auth();
  return normalizeInteger(session?.user?.id);
}

export async function GET(request: Request) {
  const animeId = normalizeInteger(
    new URL(request.url).searchParams.get("animeId"),
  );

  if (!animeId) {
    return NextResponse.json({ error: "Invalid animeId." }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: {
      animeId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      content: true,
      animeId: true,
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

  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const userId = await getAuthorizedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | CommentRequestBody
    | null;
  const animeId = normalizeInteger(body?.animeId);
  const content = normalizeCommentContent(body?.content);

  if (!animeId || !content) {
    return NextResponse.json(
      { error: "Invalid comment payload." },
      { status: 400 },
    );
  }

  const comment = await prisma.comment.create({
    data: {
      animeId,
      content,
      userId,
    },
    select: {
      id: true,
      content: true,
      animeId: true,
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

  revalidatePath(`/anime/${animeId}`);

  return NextResponse.json({ comment }, { status: 201 });
}
