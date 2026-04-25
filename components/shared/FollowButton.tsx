"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

interface FollowButtonProps {
  targetUserId: number;
  initialIsFollowing: boolean;
}

export function FollowButton({
  targetUserId,
  initialIsFollowing,
}: FollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleToggleFollow() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/users/${targetUserId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/user/${targetUserId}`)}`);
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        isFollowing?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error || "Не удалось обновить подписку.");
      }

      setIsFollowing(data.isFollowing ?? !isFollowing);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось обновить подписку.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="h-10 rounded-full border border-white/15 bg-white/10 px-5 text-white hover:bg-white/20"
        onClick={() => void handleToggleFollow()}
        disabled={isSubmitting}
        aria-pressed={isFollowing}
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {isFollowing ? "Отписаться" : "Подписаться"}
      </Button>

      {errorMessage ? (
        <p className="text-xs font-medium text-red-200">{errorMessage}</p>
      ) : null}
    </div>
  );
}
