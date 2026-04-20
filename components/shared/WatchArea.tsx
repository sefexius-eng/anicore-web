"use client";

import { useMemo, useState, useEffect } from "react";

import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface WatchAreaProps {
  malId: number | string;
  totalEpisodes: number;
}

interface StreamResponse {
  stream?: string;
  error?: string;
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
  const [streamSrc, setStreamSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedEpisode = Math.min(currentEp, episodes.length);

  useEffect(() => {
    const controller = new AbortController();

    const loadStream = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setStreamSrc(null);

      try {
        const response = await fetch(
          `/api/stream?malId=${encodeURIComponent(String(malId))}&ep=${selectedEpisode}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as StreamResponse;

        if (!response.ok || typeof payload.stream !== "string") {
          throw new Error(payload.error ?? "Не удалось получить поток видео.");
        }

        setStreamSrc(payload.stream);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setStreamSrc(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Ошибка загрузки потока.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadStream();

    return () => {
      controller.abort();
    };
  }, [malId, selectedEpisode]);

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

        {isLoading && <Skeleton className="aspect-video w-full rounded-2xl" />}

        {!isLoading && streamSrc && (
          <VideoPlayer src={streamSrc} title={`Эпизод ${selectedEpisode}`} />
        )}

        {!isLoading && !streamSrc && (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-destructive">
              {errorMessage ?? "Поток для выбранного эпизода недоступен."}
            </p>
          </div>
        )}
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
