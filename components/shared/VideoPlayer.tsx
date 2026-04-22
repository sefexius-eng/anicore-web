"use client";

import { MediaOutlet, MediaPlayer } from "@vidstack/react";

import {
  useWatchHistoryTracker,
  type WatchHistoryMeta,
} from "@/components/shared/watch-history-tracker";

interface VideoPlayerProps {
  src: string;
  title?: string;
  history?: WatchHistoryMeta;
}

const MediaProvider = MediaOutlet;

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
  const trackWatchHistory = useWatchHistoryTracker(history ?? null);

  const handleTimeUpdate = (event: Event) => {
    const currentTime = resolveCurrentTime(event);

    if (currentTime === null) {
      return;
    }

    trackWatchHistory(currentTime);
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
