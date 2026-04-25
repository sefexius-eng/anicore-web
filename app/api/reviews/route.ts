import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { normalizePositiveInteger } from "@/lib/profile-data";
import { prisma } from "@/lib/prisma";

const MAX_REVIEW_LENGTH = 2000;

interface ReviewRequestBody {
  animeId?: unknown;
  rating?: unknown;
  text?: unknown;
}

function normalizeRating(value: unknown): number | null {
  const rating = normalizePositiveInteger(value);

  if (!rating || rating < 1 || rating > 10) {
    return null;
  }

  return rating;
}

function normalizeReviewText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(0, MAX_REVIEW_LENGTH);
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

  const viewerUserId = await getAuthorizedUserId();
  const reviews = await prisma.review.findMany({
    where: {
      animeId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      animeId: true,
      rating: true,
      text: true,
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

  const viewerReview =
    viewerUserId !== null
      ? reviews.find((review) => review.user.id === viewerUserId) ?? null
      : null;
  const otherReviews =
    viewerUserId !== null
      ? reviews.filter((review) => review.user.id !== viewerUserId)
      : reviews;
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null;

  return NextResponse.json({
    averageRating,
    reviewCount: reviews.length,
    reviews: otherReviews,
    viewerReview,
  });
}

export async function POST(request: Request) {
  const userId = await getAuthorizedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | ReviewRequestBody
    | null;
  const animeId = normalizePositiveInteger(body?.animeId);
  const rating = normalizeRating(body?.rating);
  const text = normalizeReviewText(body?.text);

  if (!animeId || !rating) {
    return NextResponse.json(
      { error: "Invalid review payload." },
      { status: 400 },
    );
  }

  const review = await prisma.review.upsert({
    where: {
      userId_animeId: {
        userId,
        animeId,
      },
    },
    update: {
      rating,
      text,
    },
    create: {
      userId,
      animeId,
      rating,
      text,
    },
    select: {
      id: true,
      animeId: true,
      rating: true,
      text: true,
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

  revalidatePath("/");
  revalidatePath(`/anime/${animeId}`);

  return NextResponse.json({ review }, { status: 201 });
}
