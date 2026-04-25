"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getDubPriority,
  type TranslationOption,
  TranslationSidebar,
} from "@/components/shared/translation-sidebar";
import { Button } from "@/components/ui/button";
import {
  addToWatchHistory,
  WATCH_HISTORY_MIN_SAVE_SECONDS,
  WATCH_HISTORY_SAVE_THROTTLE_MS,
  type WatchHistoryItem,
} from "@/lib/watch-history";

interface InteractivePlayerProps {
  malId: number;
  history: InteractivePlayerHistory | null;
  episodesTotal: number | null;
  progress: InteractivePlayerProgress | null;
}

interface KodikPlayerResponse {
  link?: string;
  translations?: TranslationOption[];
  activeTranslationId?: number | null;
  error?: string;
}

interface InteractivePlayerProgress {
  episodesWatched: number;
  lastTime: number;
}

interface PlayerBridgePayload {
  key?: unknown;
  value?: unknown;
  event?: unknown;
  time?: unknown;
  currentTime?: unknown;
  duration?: unknown;
  durationSeconds?: unknown;
  episode?: unknown;
  episodeNumber?: unknown;
  currentEpisode?: unknown;
  number?: unknown;
}

type InteractivePlayerHistory = Pick<WatchHistoryItem, "id" | "name" | "image">;

const IFRAME_HISTORY_SAVE_GAP_SECONDS = Math.max(
  1,
  Math.floor(WATCH_HISTORY_SAVE_THROTTLE_MS / 1000),
);
const DATABASE_HISTORY_SAVE_GAP_SECONDS = 20;
const WATCHED_EPISODE_PROGRESS_THRESHOLD = 0.85;

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
  return link.startsWith("http://") || link.startsWith("https://")
    ? link
    : `https:${link}`;
}

function normalizePositiveInteger(value: unknown): number | null {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  const normalizedValue = Math.floor(numericValue);
  return normalizedValue > 0 ? normalizedValue : null;
}

function normalizeNonNegativeNumber(value: unknown): number | null {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.max(0, numericValue);
}

function clampEpisodeNumber(
  episodeNumber: number,
  episodesTotal: number | null,
): number {
  const normalizedEpisode = Math.max(1, Math.floor(episodeNumber));

  if (
    typeof episodesTotal === "number" &&
    Number.isFinite(episodesTotal) &&
    episodesTotal > 0
  ) {
    return Math.min(normalizedEpisode, Math.floor(episodesTotal));
  }

  return normalizedEpisode;
}

function buildKodikIframeSrc(
  link: string,
  episodeNumber: number,
  startFromSeconds = 0,
): string {
  const url = new URL(normalizeKodikPlayerLink(link));
  url.searchParams.set("translations", "false");
  url.searchParams.set("episode", String(Math.max(1, Math.floor(episodeNumber))));

  if (startFromSeconds > 0) {
    url.searchParams.set("start_from", String(Math.floor(startFromSeconds)));
  } else {
    url.searchParams.delete("start_from");
  }

  return url.toString();
}

function parseBridgePayload(data: unknown): PlayerBridgePayload | null {
  if (typeof data === "string") {
    try {
      const parsedData = JSON.parse(data) as unknown;
      return typeof parsedData === "object" && parsedData !== null
        ? (parsedData as PlayerBridgePayload)
        : null;
    } catch {
      return null;
    }
  }

  if (typeof data === "object" && data !== null) {
    return data as PlayerBridgePayload;
  }

  return null;
}

function extractEpisodeNumber(payload: PlayerBridgePayload): number | null {
  const directEpisodeNumber =
    normalizePositiveInteger(payload.episodeNumber) ??
    normalizePositiveInteger(payload.currentEpisode) ??
    normalizePositiveInteger(payload.episode) ??
    normalizePositiveInteger(payload.number);

  if (directEpisodeNumber) {
    return directEpisodeNumber;
  }

  if (
    typeof payload.key === "string" &&
    payload.key.toLowerCase().includes("episode")
  ) {
    if (typeof payload.value === "object" && payload.value !== null) {
      const nestedValue = payload.value as PlayerBridgePayload;

      return (
        normalizePositiveInteger(nestedValue.episodeNumber) ??
        normalizePositiveInteger(nestedValue.currentEpisode) ??
        normalizePositiveInteger(nestedValue.episode) ??
        normalizePositiveInteger(nestedValue.number)
      );
    }

    return normalizePositiveInteger(payload.value);
  }

  return null;
}

function extractDurationSeconds(payload: PlayerBridgePayload): number | null {
  const directDuration =
    normalizeNonNegativeNumber(payload.duration) ??
    normalizeNonNegativeNumber(payload.durationSeconds);

  if (directDuration !== null && directDuration > 0) {
    return directDuration;
  }

  if (
    typeof payload.key === "string" &&
    payload.key.toLowerCase().includes("duration")
  ) {
    if (typeof payload.value === "object" && payload.value !== null) {
      const nestedValue = payload.value as PlayerBridgePayload;

      return (
        normalizeNonNegativeNumber(nestedValue.duration) ??
        normalizeNonNegativeNumber(nestedValue.durationSeconds)
      );
    }

    return normalizeNonNegativeNumber(payload.value);
  }

  return null;
}

function extractCurrentTimeSeconds(payload: PlayerBridgePayload): number | null {
  if (payload.key === "kodik_player_time_update") {
    return normalizeNonNegativeNumber(payload.value);
  }

  const directTime =
    normalizeNonNegativeNumber(payload.currentTime) ??
    normalizeNonNegativeNumber(payload.time);

  if (directTime !== null) {
    return directTime;
  }

  if (typeof payload.value === "object" && payload.value !== null) {
    const nestedValue = payload.value as PlayerBridgePayload;

    return (
      normalizeNonNegativeNumber(nestedValue.currentTime) ??
      normalizeNonNegativeNumber(nestedValue.time)
    );
  }

  return null;
}

export function InteractivePlayer({
  malId,
  history,
  episodesTotal,
  progress,
}: InteractivePlayerProps) {
  const initialCompletedEpisodes = progress?.episodesWatched ?? 0;
  const initialEpisodeNumber = clampEpisodeNumber(
    initialCompletedEpisodes + 1,
    episodesTotal,
  );
  const initialStartFromSeconds = progress?.lastTime ?? 0;

  const [playerLink, setPlayerLink] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslationOption[]>([]);
  const [activeTranslationId, setActiveTranslationId] = useState<number | null>(
    null,
  );
  const [isTranslationSidebarOpen, setIsTranslationSidebarOpen] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentEpisodeNumber, setCurrentEpisodeNumber] = useState(
    initialEpisodeNumber,
  );
  const [startFromSeconds, setStartFromSeconds] = useState(
    initialStartFromSeconds,
  );

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSavedTimeRef = useRef(0);
  const lastDatabaseSavedTimeRef = useRef(0);
  const historyRef = useRef<InteractivePlayerHistory | null>(history);
  const currentEpisodeRef = useRef(initialEpisodeNumber);
  const completedEpisodesRef = useRef(initialCompletedEpisodes);
  const currentTimeRef = useRef(initialStartFromSeconds);
  const durationSecondsRef = useRef(0);

  const iframeSrc = useMemo(() => {
    if (!playerLink) {
      return null;
    }

    return buildKodikIframeSrc(
      playerLink,
      currentEpisodeNumber,
      startFromSeconds,
    );
  }, [currentEpisodeNumber, playerLink, startFromSeconds]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    const clampedEpisodeNumber = clampEpisodeNumber(
      currentEpisodeRef.current,
      episodesTotal,
    );

    if (clampedEpisodeNumber === currentEpisodeRef.current) {
      return;
    }

    currentEpisodeRef.current = clampedEpisodeNumber;
    setCurrentEpisodeNumber(clampedEpisodeNumber);
  }, [episodesTotal]);

  useEffect(() => {
    lastSavedTimeRef.current = 0;
    lastDatabaseSavedTimeRef.current = 0;
    currentTimeRef.current = startFromSeconds;
    durationSecondsRef.current = 0;
  }, [history?.id, iframeSrc, startFromSeconds]);

  const syncHistoryToDatabase = useCallback(
    async (animeId: number, currentTime: number, episodeNumber?: number) => {
      await fetch("/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          animeId,
          time: currentTime,
          ...(typeof episodeNumber === "number" ? { episodeNumber } : {}),
        }),
      });
    },
    [],
  );

  const markEpisodeAsWatched = useCallback(
    (episodeNumber: number, currentTime: number) => {
      const currentHistory = historyRef.current;

      if (!currentHistory || episodeNumber <= completedEpisodesRef.current) {
        return;
      }

      completedEpisodesRef.current = episodeNumber;
      lastDatabaseSavedTimeRef.current = currentTime;

      void syncHistoryToDatabase(
        currentHistory.id,
        Math.max(0, Math.floor(currentTime)),
        episodeNumber,
      ).catch(() => undefined);
    },
    [syncHistoryToDatabase],
  );

  const handleEpisodeChange = useCallback(
    (rawEpisodeNumber: number) => {
      const nextEpisodeNumber = clampEpisodeNumber(rawEpisodeNumber, episodesTotal);

      if (nextEpisodeNumber === currentEpisodeRef.current) {
        return;
      }

      currentEpisodeRef.current = nextEpisodeNumber;
      setCurrentEpisodeNumber(nextEpisodeNumber);
      setStartFromSeconds(0);
      currentTimeRef.current = 0;
      durationSecondsRef.current = 0;
      lastSavedTimeRef.current = 0;
      lastDatabaseSavedTimeRef.current = 0;
    },
    [episodesTotal],
  );

  const loadPlayer = useCallback(
    async (translationId: number | null) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setErrorMessage(null);
      setPlayerLink(null);

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
          throw new Error(
            data.error ??
              `Kodik proxy request failed with status ${response.status}.`,
          );
        }

        const availableTranslations = Array.isArray(data.translations)
          ? data.translations
              .filter(isTranslationOption)
              .sort(
                (left, right) =>
                  getDubPriority(left.title) - getDubPriority(right.title),
              )
          : [];

        const resolvedActiveTranslationId =
          typeof data.activeTranslationId === "number"
            ? data.activeTranslationId
            : availableTranslations[0]?.id ?? null;

        setTranslations(availableTranslations);
        setActiveTranslationId(resolvedActiveTranslationId);
        setPlayerLink(data.link);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u043b\u0435\u0435\u0440 Kodik.",
        );
        setPlayerLink(null);
      } finally {
        if (
          abortControllerRef.current === controller &&
          !controller.signal.aborted
        ) {
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
      const iframeWindow = iframeRef.current?.contentWindow;

      if (iframeWindow && event.source !== iframeWindow) {
        return;
      }

      const payload = parseBridgePayload(event.data);

      if (!payload) {
        return;
      }

      const nextEpisodeNumber = extractEpisodeNumber(payload);

      if (
        typeof nextEpisodeNumber === "number" &&
        nextEpisodeNumber !== currentEpisodeRef.current
      ) {
        handleEpisodeChange(nextEpisodeNumber);
      }

      const durationSeconds = extractDurationSeconds(payload);

      if (durationSeconds !== null && durationSeconds > 0) {
        durationSecondsRef.current = durationSeconds;
      }

      const currentHistory = historyRef.current;
      const currentTime = extractCurrentTimeSeconds(payload);

      if (!currentHistory || currentTime === null) {
        return;
      }

      const normalizedCurrentTime = Math.max(0, Math.floor(currentTime));
      currentTimeRef.current = normalizedCurrentTime;

      if (normalizedCurrentTime <= WATCH_HISTORY_MIN_SAVE_SECONDS) {
        return;
      }

      if (
        Math.abs(normalizedCurrentTime - lastSavedTimeRef.current) <=
        IFRAME_HISTORY_SAVE_GAP_SECONDS
      ) {
        return;
      }

      lastSavedTimeRef.current = normalizedCurrentTime;

      addToWatchHistory({
        id: currentHistory.id,
        name: currentHistory.name,
        image: currentHistory.image,
        timestamp: Date.now(),
        stoppedAt: normalizedCurrentTime,
      });

      if (
        Math.abs(normalizedCurrentTime - lastDatabaseSavedTimeRef.current) >=
        DATABASE_HISTORY_SAVE_GAP_SECONDS
      ) {
        lastDatabaseSavedTimeRef.current = normalizedCurrentTime;
        void syncHistoryToDatabase(
          currentHistory.id,
          normalizedCurrentTime,
        ).catch(() => undefined);
      }

      const isWatched =
        payload.key === "kodik_player_time_update" &&
        durationSecondsRef.current > 0 &&
        normalizedCurrentTime / durationSecondsRef.current >=
          WATCHED_EPISODE_PROGRESS_THRESHOLD;

      if (
        isWatched &&
        currentEpisodeRef.current > completedEpisodesRef.current
      ) {
        markEpisodeAsWatched(currentEpisodeRef.current, normalizedCurrentTime);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleEpisodeChange, markEpisodeAsWatched, syncHistoryToDatabase]);

  const handleTranslationSelect = useCallback(
    (translationId: number) => {
      setStartFromSeconds(currentTimeRef.current);
      setActiveTranslationId(translationId);
      setIsTranslationSidebarOpen(false);
      void loadPlayer(translationId);
    },
    [loadPlayer],
  );

  const activeTranslation =
    translations.find((translation) => translation.id === activeTranslationId) ??
    null;
  const ambientImageUrl = history?.image?.trim() || "";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          className="border border-neutral-700 bg-neutral-900/90 text-neutral-100 hover:bg-neutral-800"
          onClick={() => setIsTranslationSidebarOpen(true)}
        >
          {activeTranslation
            ? `\u041e\u0437\u0432\u0443\u0447\u043a\u0430: ${activeTranslation.title}`
            : "\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u043e\u0437\u0432\u0443\u0447\u043a\u0443"}
        </Button>

        <p className="text-xs text-muted-foreground">
          {isLoading
            ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u043b\u0435\u0435\u0440\u0430..."
            : errorMessage
              ? "\u041f\u043b\u0435\u0435\u0440 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d"
              : "Kodik iframe"}
        </p>
      </div>

      <div className="group relative w-full">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4 z-0 rounded-[2rem] opacity-40 mix-blend-screen blur-[60px] transition-opacity duration-1000 group-hover:opacity-60 sm:-inset-6 sm:blur-[100px]"
          style={
            ambientImageUrl
              ? {
                  backgroundImage: `url(${ambientImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transform: "translateZ(0)",
                }
              : {
                  background:
                    "radial-gradient(circle at center, rgba(56,189,248,0.25), rgba(15,23,42,0) 72%)",
                  transform: "translateZ(0)",
                }
          }
        />

        <div className="relative z-10 aspect-video w-full overflow-hidden rounded-xl border border-white/5 bg-black shadow-2xl sm:rounded-2xl">
          {iframeSrc ? (
            <iframe
              key={`${activeTranslationId ?? malId}-${currentEpisodeNumber}-${startFromSeconds}`}
              ref={iframeRef}
              src={iframeSrc}
              title="Kodik player"
              width="100%"
              height="100%"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6 text-sm text-muted-foreground">
              {isLoading
                ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u043b\u0435\u0435\u0440\u0430..."
                : errorMessage ??
                  "\u041f\u043b\u0435\u0435\u0440 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d."}
            </div>
          )}
        </div>
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
