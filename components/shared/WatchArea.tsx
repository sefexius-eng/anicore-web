"use client";

import React, { useState } from "react";

import {
  type TranslationOption,
  TranslationSidebar,
} from "@/components/shared/translation-sidebar";
import { Button } from "@/components/ui/button";

interface WatchAreaProps {
  malId: number | string;
}

interface KodikPlayerResponse {
  link?: string;
  translations?: TranslationOption[];
  activeTranslationId?: number | null;
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
  const [activeTranslationId, setActiveTranslationId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    console.log("[WatchArea] Available translations:", translations);
  }, [translations]);

  const loadPlayer = React.useCallback(
    async (translationId: number | null) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setErrorMessage(null);
      setIframeSrc(null);

      if (translationId === null) {
        setTranslations([]);
        setActiveTranslationId(null);
      }

      try {
        const searchParams = new URLSearchParams({
          malId: String(malId),
        });

        if (typeof translationId === "number") {
          searchParams.set("translation_id", String(translationId));
        }

        const response = await fetch(`/api/kodik?${searchParams.toString()}`, {
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

        const resolvedActiveTranslationId =
          typeof data.activeTranslationId === "number"
            ? data.activeTranslationId
            : availableTranslations[0]?.id ?? null;

        setActiveTranslationId(resolvedActiveTranslationId);
        setIframeSrc(`https:${data.link}?translations=false`);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load the Kodik player.",
        );
        setIframeSrc(null);
      } finally {
        if (abortControllerRef.current === controller && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [malId],
  );

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPlayer(null);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadPlayer]);

  const handleTranslationSelect = React.useCallback(
    (translationId: number) => {
      setActiveTranslationId(translationId);
      setIsSidebarOpen(false);
      void loadPlayer(translationId);
    },
    [loadPlayer],
  );

  const activeTranslation =
    translations.find((translation) => translation.id === activeTranslationId) ?? null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Смотреть онлайн
          </h2>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Загрузка плеера..." : errorMessage ? "Плеер недоступен" : "Kodik iframe"}
          </p>
          {activeTranslation && (
            <p className="text-xs text-cyan-300">
              Активная озвучка: {activeTranslation.title}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          className="border border-neutral-700 bg-neutral-900/90 text-neutral-100 hover:bg-neutral-800"
          onClick={() => setIsSidebarOpen(true)}
        >
          Озвучки
        </Button>
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

      <TranslationSidebar
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        translations={translations}
        activeTranslationId={activeTranslationId}
        onSelectTranslation={handleTranslationSelect}
      />
    </section>
  );
}
