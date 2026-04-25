"use client";

/* eslint-disable @next/next/no-img-element */
import type { ReactNode, SyntheticEvent } from "react";
import Link from "next/link";

import { getImageUrl, IMAGE_PLACEHOLDER_URL } from "@/lib/utils";

interface AnimeImage {
  original?: string | null;
  preview?: string | null;
  x160?: string | null;
  url?: string | null;
}

interface AnimeCardProps {
  id: number;
  title: string;
  image?: AnimeImage | null;
  image_url?: string | null;
  score: number | null;
  posterOverlay?: ReactNode;
}

export function AnimeCard({
  id,
  title,
  image,
  image_url,
  score,
  posterOverlay,
}: AnimeCardProps) {
  const posterUrl = getImageUrl(image ?? image_url ?? null);
  const formattedScore = score ?? "Нет";

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;

    if (img.src.includes("shikimori.one")) {
      img.src = img.src.replace("shikimori.one", "desu.shikimori.one");
    } else if (img.src.includes("desu.shikimori.one")) {
      img.src = img.src.replace("desu.shikimori.one", "shikimori.me");
    } else {
      img.src = IMAGE_PLACEHOLDER_URL;
    }
  };

  return (
    <Link href={`/anime/${id}`} className="block">
      <div className="group flex cursor-pointer flex-col gap-2">
        <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-xl shadow-md transition-shadow duration-300 group-hover:shadow-2xl sm:aspect-[3/4]">
          <img
            src={posterUrl}
            alt={title || "Anime Poster"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />

          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="rounded-full bg-black/60 p-3 backdrop-blur-sm transition-transform duration-300 group-hover:scale-100 scale-75">
              <svg
                className="h-8 w-8 fill-current text-white"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {posterOverlay ? (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10">
              {posterOverlay}
            </div>
          ) : null}
        </div>

        <div>
          <h3
            className="line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-blue-400"
            title={title}
          >
            {title}
          </h3>
          <p className="text-xs text-gray-400">Оценка: {formattedScore}</p>
        </div>
      </div>
    </Link>
  );
}
