"use client";

import { useEffect, useMemo, useState } from "react";

import { WatchArea, type WatchAreaSeasonLink } from "@/components/shared/WatchArea";
import type { WatchHistoryItem } from "@/lib/watch-history";

interface AnimeWatchShellProps {
  animeId: number;
  animeTitle: string;
  history: Pick<WatchHistoryItem, "id" | "name" | "image"> | null;
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

export function AnimeWatchShell({
  animeId,
  animeTitle,
  history,
}: AnimeWatchShellProps) {
  const [franchiseSeasons, setFranchiseSeasons] = useState<
    AnimeFranchiseSeasonItem[]
  >([]);

  useEffect(() => {
    let isMounted = true;

    async function loadFranchiseSeasons() {
      try {
        const { getAnimeFranchiseSeasons } = await import("@/services/jikanApi");
        const seasons = await getAnimeFranchiseSeasons(animeId);

        if (!isMounted) {
          return;
        }

        setFranchiseSeasons(seasons);
      } catch {
        if (!isMounted) {
          return;
        }

        setFranchiseSeasons([
          {
            id: animeId,
            order: 1,
            year: null,
            title: animeTitle,
          },
        ]);
      }
    }

    void loadFranchiseSeasons();

    return () => {
      isMounted = false;
    };
  }, [animeId, animeTitle]);

  const seasonLinks = useMemo(() => {
    const filteredFranchise = filterFranchiseSeasons(
      animeId,
      animeTitle,
      franchiseSeasons,
    );

    return buildFranchiseSeasonLinks(animeId, filteredFranchise);
  }, [animeId, animeTitle, franchiseSeasons]);

  return <WatchArea malId={animeId} seasonLinks={seasonLinks} history={history} />;
}
