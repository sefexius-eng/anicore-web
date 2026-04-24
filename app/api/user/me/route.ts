import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = Number(session?.user?.id ?? Number.NaN);

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      image: true,
    },
  });

  return NextResponse.json(
    {
      image: user?.image ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
