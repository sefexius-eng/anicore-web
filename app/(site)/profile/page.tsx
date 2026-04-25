import { redirect } from "next/navigation";

import { ProfilePageView } from "@/components/shared/profile-page-view";
import { auth } from "@/lib/auth";
import {
  getProfileViewData,
  normalizePositiveInteger,
} from "@/lib/profile-data";

export default async function ProfilePage() {
  const session = await auth();
  const sessionUserId = normalizePositiveInteger(session?.user?.id);

  if (!sessionUserId) {
    redirect("/login");
  }

  const profileData = await getProfileViewData(sessionUserId, sessionUserId);

  if (!profileData) {
    redirect("/login");
  }

  return <ProfilePageView data={profileData} editableAvatar />;
}
