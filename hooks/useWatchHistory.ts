"use client";

import { useEffect, useState } from "react";

import {
  addToWatchHistory,
  clearWatchHistory,
  removeFromHistory,
  readWatchHistory,
  type WatchHistoryItem,
  WATCH_HISTORY_UPDATED_EVENT,
} from "@/lib/watch-history";

export function useWatchHistory() {
  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const syncHistory = () => {
      setItems(readWatchHistory());
      setIsLoaded(true);
    };

    syncHistory();

    window.addEventListener("storage", syncHistory);
    window.addEventListener(WATCH_HISTORY_UPDATED_EVENT, syncHistory);

    return () => {
      window.removeEventListener("storage", syncHistory);
      window.removeEventListener(WATCH_HISTORY_UPDATED_EVENT, syncHistory);
    };
  }, []);

  const addItem = (item: WatchHistoryItem) => {
    const nextItems = addToWatchHistory(item);
    setItems(nextItems);
    setIsLoaded(true);
  };

  const removeItem = (malId: number) => {
    const nextItems = removeFromHistory(malId);
    setItems(nextItems);
    setIsLoaded(true);
  };

  const resetHistory = () => {
    clearWatchHistory();
    setItems([]);
    setIsLoaded(true);
  };

  return {
    items,
    isLoaded,
    addItem,
    removeItem,
    clearHistory: resetHistory,
  };
}
