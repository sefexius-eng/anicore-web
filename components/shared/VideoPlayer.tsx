"use client";

import { useEffect, useRef } from "react";

import { MediaOutlet, MediaPlayer } from "@vidstack/react";

import { addToWatchHistory } from "@/lib/watch-history";

interface VideoPlayerProps {
  src: string;
  title?: string;
  history?: VideoPlayerHistory;
}

interface VideoPlayerHistory {
  id: number;
  name: string;
  image: string;
}

const MediaProvider = MediaOutlet;
const WATCH_HISTORY_MIN_SECONDS = 60;
const WATCH_HISTORY_SAVE_GAP_SECONDS = 5;

function resolveCurrentTime(event: Event): number | null {
  const candidate = event as Event & {
    currentTime?: unknown;
    detail?: {
      currentTime?: unknown;
    };
  };

  const currentTimeFromDetail = candidate.detail?.currentTime;

  if (typeof currentTimeFromDetail === "number" && Number.isFinite(currentTimeFromDetail)) {
    return currentTimeFromDetail;
  }

  if (typeof candidate.currentTime === "number" && Number.isFinite(candidate.currentTime)) {
    return candidate.currentTime;
  }

  return null;
}

export function VideoPlayer({
  src,
  title = "AniCore Player",
  history,
}: VideoPlayerProps) {
  const lastSavedTime = useRef(0);

  useEffect(() => {
    lastSavedTime.current = 0;
  }, [history?.id, src]);

  const handleTimeUpdate = (event: Event) => {
    const currentTime = resolveCurrentTime(event);

    if (currentTime === null || !history) {
      return;
    }

    const normalizedCurrentTime = Math.max(0, Math.floor(currentTime));

    if (
      normalizedCurrentTime > WATCH_HISTORY_MIN_SECONDS &&
      Math.abs(normalizedCurrentTime - lastSavedTime.current) > WATCH_HISTORY_SAVE_GAP_SECONDS
    ) {
      lastSavedTime.current = normalizedCurrentTime;
      console.log("HISTORY DEBUG: Saving to localStorage", {
        currentTime: normalizedCurrentTime,
      });

      addToWatchHistory({
        id: history.id,
        name: history.name,
        image: history.image,
        timestamp: Date.now(),
        stoppedAt: normalizedCurrentTime,
      });
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-black shadow-xl">
      <MediaPlayer
        className="aspect-video w-full bg-black text-white"
        title={title}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        crossOrigin
        playsInline
        controls
      >
        <MediaProvider />
      </MediaPlayer>
    </div>
  );
}
