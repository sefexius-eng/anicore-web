"use client";

import Link from "next/link";

import { AnimeComments } from "@/components/shared/AnimeComments";
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
          <p className="text-sm text-muted-foreground">
            Выберите озвучку или сразу запускайте встроенный плеер Kodik.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <WatchlistDropdown animeId={malId} />

          <div className="rounded-xl border border-neutral-700/80 bg-neutral-950/80 p-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Сезоны франшизы
              </span>

              <div className="flex flex-wrap gap-1">
                {seasonLinks.map((season) => {
                  const seasonClasses = cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    season.isCurrent
                      ? "bg-cyan-500/20 text-cyan-200"
                      : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white",
                  );

                  if (season.isCurrent) {
                    return (
                      <span key={season.id} className={seasonClasses} title={season.label}>
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
            </div>
          </div>
        </div>
      </div>

      <InteractivePlayer
        malId={malId}
        history={history}
        episodesTotal={episodesTotal}
        progress={progress}
      />

      <AnimeComments animeId={malId} />
    </section>
  );
}
