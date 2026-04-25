import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizePositiveInteger(value: unknown): number | null {
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
  return normalizePositiveInteger(session?.user?.id);
}

async function getTargetUserId(params: Promise<{ id: string }>) {
  const { id } = await params;
  return normalizePositiveInteger(id);
}

async function ensureTargetUserExists(targetUserId: number) {
  return prisma.user.findUnique({
    where: {
      id: targetUserId,
    },
    select: {
      id: true,
    },
  });
}

function revalidateFollowPaths(followerId: number, targetUserId: number) {
  revalidatePath("/profile");
  revalidatePath(`/user/${followerId}`);
  revalidatePath(`/user/${targetUserId}`);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const followerId = await getAuthorizedUserId();

  if (!followerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetUserId = await getTargetUserId(params);

  if (!targetUserId) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  if (followerId === targetUserId) {
    return NextResponse.json(
      { error: "You cannot follow yourself." },
      { status: 400 },
    );
  }

  const targetUser = await ensureTargetUserExists(targetUserId);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await prisma.follows.upsert({
    where: {
      followerId_followingId: {
        followerId,
        followingId: targetUserId,
      },
    },
    update: {},
    create: {
      followerId,
      followingId: targetUserId,
    },
  });

  revalidateFollowPaths(followerId, targetUserId);

  return NextResponse.json({ isFollowing: true }, { status: 201 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const followerId = await getAuthorizedUserId();

  if (!followerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetUserId = await getTargetUserId(params);

  if (!targetUserId) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  if (followerId === targetUserId) {
    return NextResponse.json(
      { error: "You cannot unfollow yourself." },
      { status: 400 },
    );
  }

  const targetUser = await ensureTargetUserExists(targetUserId);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await prisma.follows.deleteMany({
    where: {
      followerId,
      followingId: targetUserId,
    },
  });

  revalidateFollowPaths(followerId, targetUserId);

  return NextResponse.json({ isFollowing: false });
}
