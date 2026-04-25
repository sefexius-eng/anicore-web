"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

interface UserAvatarProps {
  userLabel: string;
}

interface UserMeResponse {
  image?: string | null;
}

const USER_AVATAR_UPDATED_EVENT = "anicore:user-avatar-updated";

export function UserAvatar({ userLabel }: UserAvatarProps) {
  const [image, setImage] = useState<string | null>(null);
  const avatarSrc = image || "/default-avatar.jpg";

  useEffect(() => {
    let isMounted = true;

    async function loadAvatar() {
      try {
        const response = await fetch("/api/user/me", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (isMounted) {
            setImage(null);
          }
          return;
        }

        const data = (await response.json()) as UserMeResponse;

        if (isMounted) {
          setImage(typeof data.image === "string" ? data.image.trim() : null);
        }
      } catch {
        if (isMounted) {
          setImage(null);
        }
      }
    }

    void loadAvatar();

    const handleAvatarUpdated = () => {
      void loadAvatar();
    };

    window.addEventListener(USER_AVATAR_UPDATED_EVENT, handleAvatarUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener(
        USER_AVATAR_UPDATED_EVENT,
        handleAvatarUpdated,
      );
    };
  }, []);

  return (
    <img
      src={avatarSrc}
      alt={userLabel}
      className="h-8 w-8 rounded-full object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(event) => {
        if (!event.currentTarget.src.endsWith("/default-avatar.jpg")) {
          event.currentTarget.src = "/default-avatar.jpg";
        }
      }}
    />
  );
}
