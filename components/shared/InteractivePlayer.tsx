"use client";

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  type TranslationOption,
  TranslationSidebar,
} from "@/components/shared/translation-sidebar";
import { cn } from "@/lib/utils";

interface InteractivePlayerProps {
  malId: number;
}

interface KodikPlayerResponse {
  link?: string;
  translations?: TranslationOption[];
  activeTranslationId?: number | null;
  seasons?: number[];
  activeSeason?: number;
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

function isSeasonNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeKodikPlayerLink(link: string): string {
  return link.startsWith("http://") || link.startsWith("https://") ? link : `https:${link}`;
}

function buildKodikIframeSrc(link: string, season: number | null): string {
  const url = new URL(normalizeKodikPlayerLink(link));

  url.searchParams.set("translations", "false");

  if (typeof season === "number") {
    url.searchParams.set("season", String(season));
  } else {
    url.searchParams.delete("season");
  }

  return url.toString();
}

function resolveActiveSeason(
  seasons: number[],
  preferredSeason: number | null,
  apiSeason: number | undefined,
): number {
  if (typeof apiSeason === "number" && seasons.includes(apiSeason)) {
    return apiSeason;
  }

  if (typeof preferredSeason === "number" && seasons.includes(preferredSeason)) {
    return preferredSeason;
  }

  return seasons[0] ?? 1;
}

export function InteractivePlayer({ malId }: InteractivePlayerProps) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslationOption[]>([]);
  const [activeTranslationId, setActiveTranslationId] = useState<number | null>(null);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([1]);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const [isTranslationSidebarOpen, setIsTranslationSidebarOpen] = useState(false);
  const [isEpisodeSidebarOpen, setIsEpisodeSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const loadPlayer = React.useCallback(
    async (translationId: number | null, preferredSeason: number | null) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setErrorMessage(null);
      setIframeSrc(null);

      if (translationId === null && preferredSeason === null) {
        setTranslations([]);
        setActiveTranslationId(null);
        setAvailableSeasons([1]);
        setActiveSeason(null);
      }

      try {
        const searchParams = new URLSearchParams({
          malId: String(malId),
        });

        if (typeof translationId === "number") {
          searchParams.set("translation_id", String(translationId));
        }

        if (typeof preferredSeason === "number") {
          searchParams.set("season", String(preferredSeason));
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

        const seasonsFromApi = Array.isArray(data.seasons)
          ? data.seasons.filter(isSeasonNumber)
          : [];

        const normalizedSeasons =
          seasonsFromApi.length > 0
            ? Array.from(new Set(seasonsFromApi)).sort((a, b) => a - b)
            : [1];

        const resolvedSeason = resolveActiveSeason(
          normalizedSeasons,
          preferredSeason,
          data.activeSeason,
        );

        const resolvedActiveTranslationId =
          typeof data.activeTranslationId === "number"
            ? data.activeTranslationId
            : availableTranslations[0]?.id ?? null;

        const normalizedLink = normalizeKodikPlayerLink(data.link);

        setTranslations(availableTranslations);
        setAvailableSeasons(normalizedSeasons);
        setActiveTranslationId(resolvedActiveTranslationId);
        setActiveSeason(resolvedSeason);
        setIframeSrc(buildKodikIframeSrc(normalizedLink, resolvedSeason));
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
    void loadPlayer(null, null);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadPlayer]);

  const handleTranslationSelect = React.useCallback(
    (translationId: number) => {
      setActiveTranslationId(translationId);
      setIsTranslationSidebarOpen(false);
      void loadPlayer(translationId, activeSeason);
    },
    [activeSeason, loadPlayer],
  );

  const handleEpisodeSelect = React.useCallback(
    (season: number) => {
      setActiveSeason(season);
      setIsEpisodeSidebarOpen(false);
      void loadPlayer(activeTranslationId, season);
    },
    [activeTranslationId, loadPlayer],
  );

  const activeTranslation =
    translations.find((translation) => translation.id === activeTranslationId) ?? null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="border border-neutral-700 bg-neutral-900/90 text-neutral-100 hover:bg-neutral-800"
            onClick={() => setIsTranslationSidebarOpen(true)}
          >
            {activeTranslation ? `Озвучка: ${activeTranslation.title}` : "Выбрать озвучку"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="border border-neutral-700 bg-neutral-900/90 text-neutral-100 hover:bg-neutral-800"
            onClick={() => setIsEpisodeSidebarOpen(true)}
          >
            {activeSeason ? `Серия: ${activeSeason}` : "Выбрать серию"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {isLoading ? "Загрузка плеера..." : errorMessage ? "Плеер недоступен" : "Kodik iframe"}
        </p>
      </div>

      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-black">
        {iframeSrc ? (
          <iframe
            key={activeSeason}
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
        open={isTranslationSidebarOpen}
        onOpenChange={setIsTranslationSidebarOpen}
        translations={translations}
        activeTranslationId={activeTranslationId}
        onSelectTranslation={handleTranslationSelect}
      />

      <Sheet open={isEpisodeSidebarOpen} onOpenChange={setIsEpisodeSidebarOpen}>
        <SheetContent
          side="right"
          className="w-[min(24rem,calc(100vw-1.5rem))] rounded-l-2xl border-l border-neutral-800 bg-neutral-900/95 p-0 text-neutral-100 backdrop-blur-md"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
            <SheetTitle className="text-base font-semibold tracking-wide text-neutral-100">
              Выбор серии
            </SheetTitle>

            <SheetClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-neutral-300 hover:bg-neutral-800 hover:text-white"
                />
              }
            >
              x
              <span className="sr-only">Закрыть</span>
            </SheetClose>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {availableSeasons.map((season) => (
                <button
                  key={season}
                  type="button"
                  onClick={() => handleEpisodeSelect(season)}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                    activeSeason === season
                      ? "border-cyan-400 bg-cyan-500/15 text-white"
                      : "border-neutral-800 bg-neutral-950/80 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800/80",
                  )}
                >
                  <p className="text-sm font-medium leading-tight">Серия {season}</p>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
