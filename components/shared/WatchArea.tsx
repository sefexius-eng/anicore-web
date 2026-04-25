"use client";

import Link from "next/link";

import { InteractivePlayer } from "@/components/shared/InteractivePlayer";
import { WatchlistDropdown } from "@/components/shared/watchlist-dropdown";
import type { WatchHistoryItem } from "@/lib/watch-history";
import { cn } from "@/lib/utils";

export interface WatchAreaSeasonLink {
  id: number;
  href: string;
  label: string;
  isCurrent: boolean;
}

interface WatchAreaProps {
  malId: number;
  seasonLinks: WatchAreaSeasonLink[];
  history: WatchAreaHistory | null;
  episodesTotal: number | null;
  progress: {
    episodesWatched: number;
    lastTime: number;
    totalAvailable: number | null;
  } | null;
}

type WatchAreaHistory = Pick<WatchHistoryItem, "id" | "name" | "image">;

export function WatchArea({
  malId,
  seasonLinks,
  history,
  episodesTotal,
  progress,
}: WatchAreaProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Смотреть онлайн
          </h2>
        </div>

        <WatchlistDropdown animeId={malId} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {seasonLinks.map((season) => {
          const seasonClasses = cn(
            "inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-sm font-medium transition-colors",
            season.isCurrent
              ? "bg-white/20 text-white"
              : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
          );

          if (season.isCurrent) {
            return (
              <span
                key={season.id}
                className={seasonClasses}
                title={season.label}
              >
                {season.label}
              </span>
            );
          }

          return (
            <Link
              key={season.id}
              href={season.href}
              className={seasonClasses}
              title={season.label}
            >
              {season.label}
            </Link>
          );
        })}
      </div>

      <InteractivePlayer
        malId={malId}
        history={history}
        episodesTotal={episodesTotal}
        progress={progress}
      />
    </section>
  );
}
