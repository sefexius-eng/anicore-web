"use client";

import React, { useState } from "react";
import Link from "next/link";

import {
  type TranslationOption,
  TranslationSidebar,
} from "@/components/shared/translation-sidebar";
import { Button } from "@/components/ui/button";
import type { AnimeFranchiseSeasonItem } from "@/services/jikanApi";
import { cn } from "@/lib/utils";

interface WatchAreaProps {
  malId: number | string;
  franchiseSeasons: AnimeFranchiseSeasonItem[];
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

export function WatchArea({ malId, franchiseSeasons }: WatchAreaProps) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslationOption[]>([]);
  const [activeTranslationId, setActiveTranslationId] = useState<number | null>(null);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    console.log("[WatchArea] Available translations:", translations);
  }, [translations]);

  const currentMalId = React.useMemo(() => Number(malId), [malId]);

  const franchiseSeasonButtons = React.useMemo(() => {
    if (Array.isArray(franchiseSeasons) && franchiseSeasons.length > 0) {
      return franchiseSeasons;
    }

    if (Number.isInteger(currentMalId) && currentMalId > 0) {
      return [{ id: currentMalId, order: 1, year: null, title: "1 сезон" }];
    }

    return [];
  }, [currentMalId, franchiseSeasons]);

  const loadPlayer = React.useCallback(
    async (translationId: number | null, preferredSeason: number | null) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setErrorMessage(null);
      setIframeSrc(null);

      if (translationId === null) {
        setTranslations([]);
        setActiveTranslationId(null);
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

        setTranslations(availableTranslations);

        const resolvedActiveTranslationId =
          typeof data.activeTranslationId === "number"
            ? data.activeTranslationId
            : availableTranslations[0]?.id ?? null;

        const normalizedLink = normalizeKodikPlayerLink(data.link);

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
        setActiveSeason(null);
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
      setIsSidebarOpen(false);
      void loadPlayer(translationId, activeSeason);
    },
    [activeSeason, loadPlayer],
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

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="rounded-xl border border-neutral-700/80 bg-neutral-950/80 p-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 text-[0.65rem] font-semibold tracking-[0.12em] text-neutral-400 uppercase">
                Сезоны
              </span>

              <div className="flex flex-wrap gap-1">
                {franchiseSeasonButtons.map((season) => {
                  const isCurrentSeason = season.id === currentMalId;
                  const seasonClasses = cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    isCurrentSeason
                      ? "bg-cyan-500/20 text-cyan-200"
                      : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white",
                  );

                  if (isCurrentSeason) {
                    return (
                      <span key={season.id} className={seasonClasses} title={`MAL ID: ${season.id}`}>
                        {season.title}
                      </span>
                    );
                  }

                  return (
                    <Link
                      key={season.id}
                      href={`/anime/${season.id}`}
                      className={seasonClasses}
                      title={`MAL ID: ${season.id}`}
                    >
                      {season.title}
                    </Link>
                  );
                })}
              </div>
            </div>
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
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        translations={translations}
        activeTranslationId={activeTranslationId}
        onSelectTranslation={handleTranslationSelect}
      />
    </section>
  );
}
