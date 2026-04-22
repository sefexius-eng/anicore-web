"use client";

import { useEffect } from "react";

import { addToWatchHistory } from "@/lib/watch-history";

interface WatchHistoryTrackerProps {
  id: number;
  name: string;
  image: string;
}

export function WatchHistoryTracker({
  id,
  name,
  image,
}: WatchHistoryTrackerProps) {
  useEffect(() => {
    addToWatchHistory({
      id,
      name,
      image,
      timestamp: Date.now(),
    });
  }, [id, image, name]);

  return null;
}
