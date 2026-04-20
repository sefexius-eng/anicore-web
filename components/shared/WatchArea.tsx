"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

interface WatchAreaProps {
  malId: number | string;
  totalEpisodes: number;
}

function getEpisodes(totalEpisodes: number): number[] {
  if (!Number.isFinite(totalEpisodes) || totalEpisodes <= 0) {
    return [1];
  }

  return Array.from({ length: Math.floor(totalEpisodes) }, (_, index) => index + 1);
}

export function WatchArea({ malId, totalEpisodes }: WatchAreaProps) {
  const episodes = useMemo(() => getEpisodes(totalEpisodes), [totalEpisodes]);
  const [currentEp, setCurrentEp] = useState(1);
  const selectedEpisode = Math.min(currentEp, episodes.length);
  const embedUrl = `https://vidsrc.to/embed/anime/${encodeURIComponent(
    String(malId),
  )}/${selectedEpisode}`;

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Смотреть онлайн
          </h2>
          <p className="text-sm text-muted-foreground">
            Эпизод {selectedEpisode} из {episodes.length}
          </p>
        </div>

        <iframe
          key={embedUrl}
          src={embedUrl}
          title={`Эпизод ${selectedEpisode}`}
          className="w-full aspect-video rounded-xl bg-black border-0"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>

      <aside className="rounded-2xl border border-border/60 bg-card/40 p-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Эпизоды
          </h3>
          <p className="text-sm text-muted-foreground">
            Выберите серию, чтобы переключить плеер.
          </p>
        </div>

        <div className="mt-4 h-[min(70vh,34rem)] overflow-y-auto pr-2">
          <div className="grid gap-2">
            {episodes.map((episodeNumber) => (
              <Button
                key={episodeNumber}
                variant={episodeNumber === selectedEpisode ? "default" : "secondary"}
                className="w-full justify-start"
                onClick={() => setCurrentEp(episodeNumber)}
              >
                Эпизод {episodeNumber}
              </Button>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}
