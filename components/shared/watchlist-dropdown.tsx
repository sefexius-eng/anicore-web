"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookmarkPlus, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import {
  WATCHLIST_OPTIONS,
  WATCHLIST_STATUS_LABELS,
  type WatchlistStatus,
} from "@/lib/watchlist";
import { cn } from "@/lib/utils";

interface WatchlistDropdownProps {
  animeId: number;
}

type AuthState = "loading" | "authenticated" | "guest";

interface WatchlistGetResponse {
  item?: {
    animeId: number;
    status: WatchlistStatus;
  } | null;
}

export function WatchlistDropdown({ animeId }: WatchlistDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [currentStatus, setCurrentStatus] = useState<WatchlistStatus | null>(
    null,
  );

  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  useOnClickOutside(dropdownRef, closeDropdown, isOpen);

  useEffect(() => {
    let isMounted = true;

    async function loadWatchlistState() {
      try {
        const response = await fetch(`/api/watchlist?animeId=${animeId}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!isMounted) {
          return;
        }

        if (response.status === 401) {
          setAuthState("guest");
          setCurrentStatus(null);
          return;
        }

        if (!response.ok) {
          setAuthState("authenticated");
          setCurrentStatus(null);
          return;
        }

        const data = (await response.json()) as WatchlistGetResponse;
        setAuthState("authenticated");
        setCurrentStatus(data.item?.status ?? null);
      } catch {
        if (!isMounted) {
          return;
        }

        setAuthState("authenticated");
        setCurrentStatus(null);
      }
    }

    void loadWatchlistState();

    return () => {
      isMounted = false;
    };
  }, [animeId]);

  const handleToggle = () => {
    if (authState === "guest") {
      router.push(`/login?callbackUrl=/anime/${animeId}`);
      return;
    }

    if (authState === "loading" || isSaving) {
      return;
    }

    setIsOpen((current) => !current);
  };

  const handleSelectStatus = async (status: WatchlistStatus) => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          animeId,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update watchlist.");
      }

      setCurrentStatus(status);
      closeDropdown();
      router.refresh();
    } catch {
      return;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          animeId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete watchlist item.");
      }

      setCurrentStatus(null);
      closeDropdown();
      router.refresh();
    } catch {
      return;
    } finally {
      setIsSaving(false);
    }
  };

  const buttonLabel =
    currentStatus !== null
      ? WATCHLIST_STATUS_LABELS[currentStatus]
      : "Добавить в список";

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-[#222222] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#303030]",
          isSaving && "cursor-wait opacity-80",
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={handleToggle}
      >
        {isSaving || authState === "loading" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BookmarkPlus className="size-4" />
        )}
        <span>{buttonLabel}</span>
        <ChevronDown className="size-4 text-neutral-400" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-neutral-700 bg-[#1f1f1f] shadow-2xl">
          <div className="border-b border-neutral-700 px-4 py-3 text-xs uppercase tracking-[0.16em] text-neutral-400">
            Мой список
          </div>

          <div className="p-1.5">
            {WATCHLIST_OPTIONS.map((option) => (
              <button
                key={option.status}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  currentStatus === option.status
                    ? "bg-blue-600/20 text-blue-200"
                    : "text-neutral-200 hover:bg-neutral-800 hover:text-white",
                )}
                onClick={() => void handleSelectStatus(option.status)}
              >
                <span>{option.label}</span>
                {currentStatus === option.status ? (
                  <span className="text-[10px] uppercase tracking-[0.14em] text-blue-300">
                    Выбрано
                  </span>
                ) : null}
              </button>
            ))}

            <div className="my-1 border-t border-neutral-700" />

            <button
              type="button"
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
              onClick={() => void handleDelete()}
            >
              Удалить из списка
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
