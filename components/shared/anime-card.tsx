"use client";

/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
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

  return (
    <Link href={`/anime/${id}`} className="group block">
      <div className="relative">
        <img
          src={posterUrl}
          alt={title || "Anime Poster"}
          className="aspect-[2/3] w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.src = IMAGE_PLACEHOLDER_URL;
          }}
        />

        {posterOverlay ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10">
            {posterOverlay}
          </div>
        ) : null}
      </div>

      <div className="pt-3">
        <h3
          className="line-clamp-2 text-sm font-semibold leading-5 text-foreground sm:text-[0.95rem]"
          title={title}
        >
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Оценка: {formattedScore}
        </p>
      </div>
    </Link>
  );
}
