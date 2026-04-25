"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: number;
  initialIsFollowing: boolean;
  className?: string;
  buttonClassName?: string;
}

export function FollowButton({
  targetUserId,
  initialIsFollowing,
  className,
  buttonClassName,
}: FollowButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
        const queryString = searchParams.toString();
        const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;

        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        className={cn(
          "h-10 rounded-full border border-white/15 bg-white/10 px-5 text-white hover:bg-white/20",
          buttonClassName,
        )}
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
