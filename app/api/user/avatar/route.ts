import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_AVATAR_LENGTH = 2_000_000;

interface AvatarRequestBody {
  image?: unknown;
}

function isSupportedAvatar(value: string): boolean {
  return value.startsWith("data:image/") || /^https?:\/\//.test(value);
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = Number(session?.user?.id ?? Number.NaN);

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as AvatarRequestBody | null;
  const image = typeof body?.image === "string" ? body.image.trim() : "";

  if (!image) {
    return NextResponse.json(
      { error: "Image is required." },
      { status: 400 },
    );
  }

  if (image.length > MAX_AVATAR_LENGTH || !isSupportedAvatar(image)) {
    return NextResponse.json(
      { error: "Unsupported avatar format." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      image,
    },
  });

  return NextResponse.json({ success: true });
}
