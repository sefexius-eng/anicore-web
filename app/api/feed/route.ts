import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { normalizePositiveInteger } from "@/lib/profile-data";
import { getSocialFeedItems } from "@/lib/social-feed";

export async function GET() {
  const session = await auth();
  const viewerUserId = normalizePositiveInteger(session?.user?.id);

  if (!viewerUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await getSocialFeedItems(viewerUserId);

  return NextResponse.json({ items });
}
