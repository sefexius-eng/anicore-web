"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  addToWatchHistory,
  WATCH_HISTORY_MIN_SAVE_SECONDS,
  WATCH_HISTORY_SAVE_THROTTLE_MS,
} from "@/lib/watch-history";

export interface WatchHistoryMeta {
  id: number;
  name: string;
  image: string;
}

const SAVE_INTERVAL_SECONDS = Math.max(
  1,
  Math.floor(WATCH_HISTORY_SAVE_THROTTLE_MS / 1000),
);

export function useWatchHistoryTracker(history: WatchHistoryMeta | null) {
  const historyRef = useRef<WatchHistoryMeta | null>(history);
  const lastSavedTimeRef = useRef(0);

  useEffect(() => {
    historyRef.current = history;

    if (!history) {
      lastSavedTimeRef.current = 0;
    }
  }, [history]);

  return useCallback((currentTime: number) => {
    const currentHistory = historyRef.current;

    if (!currentHistory || !Number.isFinite(currentTime)) {
      return;
    }

    const normalizedCurrentTime = Math.max(0, Math.floor(currentTime));

    if (normalizedCurrentTime < WATCH_HISTORY_MIN_SAVE_SECONDS) {
      return;
    }

    if (
      Math.abs(normalizedCurrentTime - lastSavedTimeRef.current) <
      SAVE_INTERVAL_SECONDS
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
  }, []);
}
