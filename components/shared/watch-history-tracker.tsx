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

export function useWatchHistoryTracker(history: WatchHistoryMeta | null) {
  const lastSavedAtRef = useRef(0);

  useEffect(() => {
    lastSavedAtRef.current = 0;
  }, [history?.id]);

  return useCallback(
    (currentTime: number) => {
      if (!history || !Number.isFinite(currentTime)) {
        return;
      }

      if (currentTime <= WATCH_HISTORY_MIN_SAVE_SECONDS) {
        return;
      }

      const now = Date.now();

      if (now - lastSavedAtRef.current < WATCH_HISTORY_SAVE_THROTTLE_MS) {
        return;
      }

      lastSavedAtRef.current = now;

      addToWatchHistory({
        id: history.id,
        name: history.name,
        image: history.image,
        timestamp: now,
        stoppedAt: Math.floor(currentTime),
      });
    },
    [history],
  );
}

export function WatchHistoryTracker() {
  return null;
}
