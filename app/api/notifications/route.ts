import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getNotificationCenterData } from "@/lib/notifications";
import { normalizePositiveInteger } from "@/lib/profile-data";

export async function GET() {
  const session = await auth();
  const viewerUserId = normalizePositiveInteger(session?.user?.id);

  if (!viewerUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getNotificationCenterData(viewerUserId);

  return NextResponse.json(data);
}
