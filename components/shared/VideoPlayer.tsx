"use client";

import { MediaOutlet, MediaPlayer } from "@vidstack/react";

interface VideoPlayerProps {
  src: string;
  title?: string;
}

const MediaProvider = MediaOutlet;

export function VideoPlayer({ src, title = "AniCore Player" }: VideoPlayerProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-black shadow-xl">
      <MediaPlayer
        className="aspect-video w-full bg-black text-white"
        title={title}
        src={src}
        crossOrigin
        playsInline
        controls
      >
        <MediaProvider />
      </MediaPlayer>
    </div>
  );
}
