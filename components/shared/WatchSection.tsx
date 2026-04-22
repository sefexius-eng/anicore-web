"use client";

import { useCallback, useState } from "react";

import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface WatchSectionProps {
  animeId?: number;
  animeImage?: string;
  animeTitle: string;
  episodeId: string;
}

interface StreamResponse {
  stream?: string;
  error?: string;
}

export function WatchSection({
  animeId,
  animeImage,
  animeTitle,
  episodeId,
}: WatchSectionProps) {
  const [streamSrc, setStreamSrc] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const watchHistoryMeta =
    typeof animeId === "number" && animeId > 0 && typeof animeImage === "string"
      ? {
          id: animeId,
          name: animeTitle,
          image: animeImage,
        }
      : undefined;

  const loadStream = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setStreamSrc(null);

    try {
      const response = await fetch(
        `/api/stream?id=${encodeURIComponent(episodeId)}`,
        {
          method: "GET",
        },
      );

      const payload = (await response.json()) as StreamResponse;

      if (!response.ok || !payload.stream) {
        throw new Error(payload.error ?? "Не удалось получить поток.");
      }

      setStreamSrc(payload.stream);
      setErrorMessage(null);
    } catch (error) {
      setStreamSrc(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Ошибка загрузки видео.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [episodeId]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Смотреть онлайн
        </h2>
        <p className="text-sm text-muted-foreground">Тестовый эпизод: Episode 1</p>
      </div>

      {isLoading && <Skeleton className="aspect-video w-full rounded-2xl" />}

      {streamSrc && (
        <VideoPlayer
          src={streamSrc}
          title={`${animeTitle} - Episode 1`}
          history={watchHistoryMeta}
        />
      )}

      {!isLoading && !streamSrc && (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="max-w-2xl text-sm text-destructive">
            {errorMessage ?? "Нажмите кнопку ниже, чтобы загрузить поток."}
          </p>
          <Button variant="outline" onClick={() => void loadStream()}>
            {errorMessage ? "Попробовать снова" : "Запустить плеер"}
          </Button>
        </div>
      )}
    </section>
  );
}
