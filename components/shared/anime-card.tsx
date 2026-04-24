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
  const formattedScore = score !== null ? score.toFixed(2) : "Нет";

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
    <Link href={`/anime/${id}`} className="group block">
      <div className="flex cursor-pointer flex-col gap-3">
        <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl shadow-md transition-shadow duration-300 group-hover:shadow-2xl">
          <img
            src={posterUrl}
            alt={title || "Anime Poster"}
            className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />

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
