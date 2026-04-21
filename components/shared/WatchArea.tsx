"use client";

import React, { useState } from "react";

interface WatchAreaProps {
  malId: number | string;
}

type TranslationType = "voice" | "subtitles";

interface TranslationOption {
  id: number;
  title: string;
  type: TranslationType;
}

interface KodikPlayerResponse {
  link?: string;
  translations?: TranslationOption[];
  error?: string;
}

function isTranslationOption(value: unknown): value is TranslationOption {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<TranslationOption>;

  return (
    typeof candidate.id === "number" &&
    typeof candidate.title === "string" &&
    (candidate.type === "voice" || candidate.type === "subtitles")
  );
}

export function WatchArea({ malId }: WatchAreaProps) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    console.log("[WatchArea] Available translations:", translations);
  }, [translations]);

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadPlayer() {
      setIsLoading(true);
      setErrorMessage(null);
      setIframeSrc(null);
      setTranslations([]);

      try {
        const response = await fetch("/api/kodik?malId=" + malId, {
          method: "GET",
          signal: controller.signal,
        });

        const data = (await response.json()) as KodikPlayerResponse;

        if (!response.ok || !data.link) {
          throw new Error(data.error ?? `Kodik proxy request failed with status ${response.status}.`);
        }

        const availableTranslations = Array.isArray(data.translations)
          ? data.translations.filter(isTranslationOption)
          : [];

        setTranslations(availableTranslations);

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
        setTranslations([]);
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
