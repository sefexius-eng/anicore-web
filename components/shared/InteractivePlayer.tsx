"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  type TranslationOption,
  TranslationSidebar,
} from "@/components/shared/translation-sidebar";
import {
  addToWatchHistory,
  WATCH_HISTORY_MIN_SAVE_SECONDS,
  WATCH_HISTORY_SAVE_THROTTLE_MS,
  type WatchHistoryItem,
} from "@/lib/watch-history";

interface InteractivePlayerProps {
  malId: number;
  history: InteractivePlayerHistory | null;
}

interface KodikPlayerResponse {
  link?: string;
  translations?: TranslationOption[];
  activeTranslationId?: number | null;
  error?: string;
}

type InteractivePlayerHistory = Pick<WatchHistoryItem, "id" | "name" | "image">;

const IFRAME_HISTORY_SAVE_GAP_SECONDS = Math.max(
  1,
  Math.floor(WATCH_HISTORY_SAVE_THROTTLE_MS / 1000),
);

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

function normalizeKodikPlayerLink(link: string): string {
  return link.startsWith("http://") || link.startsWith("https://") ? link : `https:${link}`;
}

function buildKodikIframeSrc(link: string): string {
  const url = new URL(normalizeKodikPlayerLink(link));
  url.searchParams.set("translations", "false");
  return url.toString();
}

export function InteractivePlayer({ malId, history }: InteractivePlayerProps) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslationOption[]>([]);
  const [activeTranslationId, setActiveTranslationId] = useState<number | null>(null);
  const [isTranslationSidebarOpen, setIsTranslationSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSavedTimeRef = useRef(0);
  const historyRef = useRef<InteractivePlayerHistory | null>(history);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    lastSavedTimeRef.current = 0;
  }, [history?.id, iframeSrc]);

  const loadPlayer = useCallback(
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

        const resolvedActiveTranslationId =
          typeof data.activeTranslationId === "number"
            ? data.activeTranslationId
            : availableTranslations[0]?.id ?? null;

        setTranslations(availableTranslations);
        setActiveTranslationId(resolvedActiveTranslationId);
        setIframeSrc(buildKodikIframeSrc(data.link));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Не удалось загрузить плеер Kodik.",
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadPlayer(null);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadPlayer]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      const payload =
        typeof event.data === "object" && event.data !== null
          ? (event.data as { key?: unknown; value?: unknown })
          : null;

      if (payload?.key !== "kodik_player_time_update") {
        return;
      }

      const currentHistory = historyRef.current;

      if (!currentHistory) {
        return;
      }

      const rawCurrentTime = payload.value;
      const numericCurrentTime =
        typeof rawCurrentTime === "number"
          ? rawCurrentTime
          : typeof rawCurrentTime === "string"
            ? Number(rawCurrentTime)
            : Number.NaN;

      if (!Number.isFinite(numericCurrentTime)) {
        return;
      }

      const currentTime = Math.max(0, Math.floor(numericCurrentTime));

      if (currentTime <= WATCH_HISTORY_MIN_SAVE_SECONDS) {
        return;
      }

      if (
        Math.abs(currentTime - lastSavedTimeRef.current) <=
        IFRAME_HISTORY_SAVE_GAP_SECONDS
      ) {
        return;
      }

      lastSavedTimeRef.current = currentTime;

      addToWatchHistory({
        id: currentHistory.id,
        name: currentHistory.name,
        image: currentHistory.image,
        timestamp: Date.now(),
        stoppedAt: currentTime,
      });
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleTranslationSelect = useCallback(
    (translationId: number) => {
      setActiveTranslationId(translationId);
      setIsTranslationSidebarOpen(false);
      void loadPlayer(translationId);
    },
    [loadPlayer],
  );

  const activeTranslation =
    translations.find((translation) => translation.id === activeTranslationId) ?? null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          className="border border-neutral-700 bg-neutral-900/90 text-neutral-100 hover:bg-neutral-800"
          onClick={() => setIsTranslationSidebarOpen(true)}
        >
          {activeTranslation ? `Озвучка: ${activeTranslation.title}` : "Выбрать озвучку"}
        </Button>

        <p className="text-xs text-muted-foreground">
          {isLoading
            ? "Загрузка плеера..."
            : errorMessage
              ? "Плеер недоступен"
              : "Kodik iframe"}
        </p>
      </div>

      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-black">
        {iframeSrc ? (
          <iframe
            key={activeTranslationId ?? malId}
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
    </section>
  );
}
