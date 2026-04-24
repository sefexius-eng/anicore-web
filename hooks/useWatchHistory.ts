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

  const syncHistoryDeletion = async (animeId?: number) => {
    try {
      await fetch("/api/history", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify(typeof animeId === "number" ? { animeId } : {}),
      });
    } catch {
      // Keep local history responsive even if the server sync fails.
    }
  };

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
    void syncHistoryDeletion(malId);
  };

  const resetHistory = () => {
    clearWatchHistory();
    setItems([]);
    setIsLoaded(true);
    void syncHistoryDeletion();
  };

  return {
    items,
    isLoaded,
    addItem,
    removeItem,
    clearHistory: resetHistory,
  };
}
