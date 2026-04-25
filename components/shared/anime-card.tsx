"use client";

/* eslint-disable @next/next/no-img-element */
import type { ReactNode, SyntheticEvent } from "react";
import Link from "next/link";

import { IMAGE_PLACEHOLDER_URL } from "@/lib/utils";

interface AnimeImages {
  webp?: {
    large_image_url?: string | null;
    image_url?: string | null;
  } | null;
  jpg?: {
    large_image_url?: string | null;
    image_url?: string | null;
  } | null;
}

interface AnimeImage {
  original?: string | null;
  preview?: string | null;
  x160?: string | null;
  url?: string | null;
}

interface AnimeCardProps {
  id: number;
  title: string;
  russian_title?: string | null;
  images?: AnimeImages | null;
  image?: AnimeImage | null;
  image_url?: string | null;
  score: number | null;
  posterOverlay?: ReactNode;
}

export function AnimeCard({
  id,
  title,
  russian_title,
  images,
  score,
  posterOverlay,
}: AnimeCardProps) {
  const posterUrl =
    images?.webp?.large_image_url ||
    images?.jpg?.large_image_url ||
    IMAGE_PLACEHOLDER_URL;
  const formattedScore = score ?? "Нет";
  const displayTitle = russian_title || title;

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.src = IMAGE_PLACEHOLDER_URL;
  };

  return (
    <Link href={`/anime/${id}`} className="block">
      <div className="group flex cursor-pointer flex-col gap-2">
        <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-xl shadow-md transition-shadow duration-300 group-hover:shadow-2xl sm:aspect-[3/4]">
          <img
            src={posterUrl}
            alt={displayTitle || "Anime Poster"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />

          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="scale-75 rounded-full bg-black/60 p-3 backdrop-blur-sm transition-transform duration-300 group-hover:scale-100">
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
            title={displayTitle}
          >
            {displayTitle}
          </h3>
          <p className="text-xs text-gray-400">Оценка: {formattedScore}</p>
        </div>
      </div>
    </Link>
  );
}
