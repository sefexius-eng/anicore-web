"use client";

import React, { useState } from "react";

interface WatchAreaProps {
  malId: number | string;
}

interface KodikPlayerResponse {
  link?: string;
  error?: string;
}

export function WatchArea({ malId }: WatchAreaProps) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadPlayer() {
      setIsLoading(true);
      setErrorMessage(null);
      setIframeSrc(null);

      try {
        const response = await fetch("/api/kodik?malId=" + malId, {
          method: "GET",
          signal: controller.signal,
        });

        const data = (await response.json()) as KodikPlayerResponse;

        if (!response.ok || !data.link) {
          throw new Error(data.error ?? `Kodik proxy request failed with status ${response.status}.`);
        }

        const iframeSrc = `https:${data.link}?translations=false`;

        setIframeSrc(iframeSrc);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load the Kodik player.",
        );
        setIframeSrc(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadPlayer();

    return () => controller.abort();
  }, [malId]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Смотреть онлайн
        </h2>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Загрузка плеера..." : errorMessage ? "Плеер недоступен" : "Kodik iframe"}
        </p>
      </div>

      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-black">
        {iframeSrc ? (
          <iframe
            src={iframeSrc}
            title="Kodik player"
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-sm text-muted-foreground">
            {isLoading ? "Загрузка плеера..." : errorMessage ?? "Плеер не найден."}
          </div>
        )}
      </div>
    </section>
  );
}
