import { notFound } from "next/navigation";

import { FollowButton } from "@/components/shared/FollowButton";
import { ProfilePageView } from "@/components/shared/profile-page-view";
import { auth } from "@/lib/auth";
import {
  getProfileViewData,
  normalizePositiveInteger,
} from "@/lib/profile-data";

interface PublicProfilePageProps {
  params: Promise<{
    id?: string | string[];
  }>;
}

function getRouteUserId(value: string | string[] | undefined): number | null {
  const rawId = Array.isArray(value) ? value[0] : value;
  return normalizePositiveInteger(rawId);
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const resolvedParams = await params;
  const targetUserId = getRouteUserId(resolvedParams.id);

  if (!targetUserId) {
    notFound();
  }

  const session = await auth();
  const viewerUserId = normalizePositiveInteger(session?.user?.id);
  const profileData = await getProfileViewData(targetUserId, viewerUserId);

  if (!profileData) {
    notFound();
  }

  return (
    <ProfilePageView
      data={profileData}
      eyebrow="Публичный профиль AniMirok"
      headerAction={
        profileData.isOwnProfile ? null : (
          <FollowButton
            targetUserId={targetUserId}
            initialIsFollowing={profileData.isFollowing}
          />
        )
      }
    />
  );
}
