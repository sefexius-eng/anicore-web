"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";

import { WatchArea, type WatchAreaSeasonLink } from "@/components/shared/WatchArea";
import { getImageUrl } from "@/lib/utils";

interface AnimeShowcaseItem {
  id: number;
  title: string;
  image_url: string;
  score: number | null;
}

interface AnimeDetailsItem extends AnimeShowcaseItem {
  synopsis: string;
  genres: string[];
}

interface AnimeFranchiseSeasonItem {
  id: number;
  order: number;
  year: number | null;
  title: string;
}

function buildTitlePrefix(title: string): string {
  return title.trim().split(/\s+/)[0]?.substring(0, 5).toLowerCase() ?? "";
}

function cleanShikimoriText(text: string): string {
  return text.replace(/\[[^\]]+\]/g, "").trim();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function buildFranchiseSeasonLinks(
  currentMalId: number,
  franchiseSeasons: AnimeFranchiseSeasonItem[],
): WatchAreaSeasonLink[] {
  const normalizedSeasons =
    franchiseSeasons.length > 0
      ? franchiseSeasons
      : [{ id: currentMalId, order: 1, year: null, title: "1 сезон" }];

  return normalizedSeasons.map((season, index) => {
    const fallbackLabel = `${season.order || index + 1} сезон`;
    const label = season.title.trim() || fallbackLabel;

    return {
      id: season.id,
      href: `/anime/${season.id}`,
      label,
      isCurrent: season.id === currentMalId,
    };
  });
}

function getRouteAnimeId(value: string | string[] | undefined): number {
  const rawId = Array.isArray(value) ? value[0] : value;
  return Number(rawId);
}

function filterFranchiseSeasons(
  currentMalId: number,
  currentAnimeTitle: string,
  franchiseSeasons: AnimeFranchiseSeasonItem[],
): AnimeFranchiseSeasonItem[] {
  const currentPrefix = buildTitlePrefix(currentAnimeTitle);

  if (!currentPrefix) {
    return franchiseSeasons;
  }

  const normalizedCurrentTitle = currentAnimeTitle.toLowerCase();
  const filteredFranchise = franchiseSeasons.filter((item) => {
    if (item.id === currentMalId) {
      return true;
    }

    const itemPrefix = buildTitlePrefix(item.title);

    if (!itemPrefix) {
      return false;
    }

    return (
      item.title.toLowerCase().includes(currentPrefix) ||
      normalizedCurrentTitle.includes(itemPrefix)
    );
  });

  if (filteredFranchise.length > 0) {
    return filteredFranchise;
  }

  return franchiseSeasons.filter((item) => item.id === currentMalId);
}

export default function AnimePage() {
  const params = useParams<{ id?: string | string[] }>();
  const numericId = getRouteAnimeId(params.id);
  const isValidAnimeId = Number.isInteger(numericId) && numericId > 0;
  const [anime, setAnime] = useState<AnimeDetailsItem | null>(null);
  const [franchiseSeasons, setFranchiseSeasons] = useState<
    AnimeFranchiseSeasonItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isValidAnimeId) {
      setAnime(null);
      setFranchiseSeasons([]);
      setHasLoadError(true);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    setAnime(null);
    setFranchiseSeasons([]);
    setHasLoadError(false);
    setIsLoading(true);

    async function loadAnime() {
      const { getAnimeDetailsById, getAnimeFranchiseSeasons } = await import(
        "@/services/jikanApi"
      );

      if (controller.signal.aborted) {
        return;
      }

      const animeDetails = await getAnimeDetailsById(numericId, {
        signal: controller.signal,
      });

      let seasons: AnimeFranchiseSeasonItem[] = [];

      try {
        seasons = await getAnimeFranchiseSeasons(numericId, {
          signal: controller.signal,
        });
      } catch (error: unknown) {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }

        seasons = [
          { id: numericId, order: 1, year: null, title: animeDetails.title },
        ];
      }

      if (controller.signal.aborted) {
        return;
      }

      setAnime(animeDetails);
      setFranchiseSeasons(seasons);
      setIsLoading(false);
    }

    void loadAnime().catch((error: unknown) => {
      if (controller.signal.aborted || isAbortError(error)) {
        return;
      }

      setAnime(null);
      setFranchiseSeasons([]);
      setHasLoadError(true);
      setIsLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, [isValidAnimeId, numericId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const franchiseSeasonLinks = useMemo(() => {
    if (!isValidAnimeId) {
      return [];
    }

    const filteredFranchise = anime
      ? filterFranchiseSeasons(numericId, anime.title, franchiseSeasons)
      : franchiseSeasons;

    return buildFranchiseSeasonLinks(numericId, filteredFranchise);
  }, [anime, franchiseSeasons, isValidAnimeId, numericId]);

  if (isLoading) {
    return (
      <p className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
        Загрузка...
      </p>
    );
  }

  if (hasLoadError || !anime || !isValidAnimeId) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Не удалось загрузить данные аниме с Shikimori API. Попробуйте обновить страницу.
      </p>
    );
  }

  const posterUrl = getImageUrl(anime.image_url);
  const cleanSynopsis = cleanShikimoriText(anime.synopsis);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
        <WatchArea
          malId={numericId}
          seasonLinks={franchiseSeasonLinks}
          history={{
            id: anime.id,
            name: anime.title,
            image: anime.image_url,
          }}
        />
      </div>

      <section className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
            <div className="relative aspect-[2/3] w-full">
              <Image
                src={posterUrl}
                alt={anime.title}
                fill
                sizes="(max-width: 768px) 70vw, 220px"
                className="object-cover"
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.16em] text-sky-300">
              Страница просмотра
            </p>

            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              {anime.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-foreground">
                Оценка: {anime.score !== null ? anime.score.toFixed(2) : "Нет"}
              </span>
            </div>

            <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground sm:text-base">
              {cleanSynopsis}
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
