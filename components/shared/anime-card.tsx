"use client";

/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getImageUrl, IMAGE_PLACEHOLDER_URL } from "@/lib/utils";

interface AnimeImage {
  original?: string | null;
  preview?: string | null;
  x160?: string | null;
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
  const formattedScore = score !== null ? score.toFixed(2) : "Нет";
  const posterUrl = getImageUrl(
    image?.original ?? image?.preview ?? image?.x160 ?? image_url ?? null,
  );

  return (
    <Link href={`/anime/${id}`} className="block">
      <Card className="cursor-pointer overflow-hidden border-border/70 bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-xl hover:ring-2 hover:ring-primary">
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          <img
            src={posterUrl}
            alt={title || "Anime Poster"}
            className="w-full h-full object-cover"
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

        <CardHeader className="p-4 pb-2">
          <CardTitle className="line-clamp-2 text-sm sm:text-base" title={title}>
            {title}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
          <div className="flex items-center justify-end gap-2">
            <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
              Оценка: {formattedScore}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
