import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { buildAvatarFallback } from "@/lib/profile-data";
import type { WatchlistStatus } from "@/lib/watchlist";
import { getImageUrl } from "@/lib/utils";

const FEED_ACTIVITY_LIMIT = 20;
const JIKAN_BATCH_SIZE = 4;
const JIKAN_REVALIDATE_SECONDS = 60 * 60 * 6;
const CYRILLIC_TITLE_PATTERN = /[А-Яа-яЁё]/;

interface JikanTitleEntry {
  type?: string;
  title?: string;
}

interface JikanAnimeEntry {
  title?: string;
  title_english?: string | null;
  titles?: JikanTitleEntry[] | null;
  images?: {
    jpg?: {
      large_image_url?: string | null;
      image_url?: string | null;
    };
  };
}

interface JikanAnimeResponse {
  data?: JikanAnimeEntry;
}

interface FeedAnimeSummary {
  id: number;
  title: string;
  image_url: string;
}

export interface SocialFeedItem {
  id: string;
  type: "watchlist" | "history";
  occurredAt: Date;
  user: {
    id: number;
    name: string;
    image: string | null;
    avatarSrc: string;
  };
  anime: FeedAnimeSummary;
  watchlistStatus?: WatchlistStatus;
  episodesWatched?: number;
}

function getBestTitle(anime: JikanAnimeEntry | undefined): string {
  if (!anime) {
    return "";
  }

  const russianTitle = anime.titles?.find(
    (title) =>
      title.type === "Russian" ||
      title.type === "ru" ||
      (typeof title.title === "string" && CYRILLIC_TITLE_PATTERN.test(title.title)),
  );

  if (russianTitle?.title?.trim()) {
    return russianTitle.title.trim();
  }

  const englishTitle = anime.titles?.find(
    (title) => title.type === "English" || title.type === "en",
  );

  if (englishTitle?.title?.trim()) {
    return englishTitle.title.trim();
  }

  return anime.title_english?.trim() || anime.title?.trim() || "";
}

const getFeedAnimeSummary = cache(
  async (animeId: number): Promise<FeedAnimeSummary> => {
    try {
      const response = await fetch(`https://api.jikan.moe/v4/anime/${animeId}`, {
        headers: {
          Accept: "application/json",
        },
        next: {
          revalidate: JIKAN_REVALIDATE_SECONDS,
        },
      });

      if (!response.ok) {
        throw new Error(`Jikan request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as JikanAnimeResponse;
      const anime = payload.data;

      return {
        id: animeId,
        title: getBestTitle(anime) || `Anime #${animeId}`,
        image_url: getImageUrl(
          anime?.images?.jpg?.large_image_url ?? anime?.images?.jpg?.image_url ?? null,
        ),
      };
    } catch {
      return {
        id: animeId,
        title: `Anime #${animeId}`,
        image_url: getImageUrl(null),
      };
    }
  },
);

async function loadFeedAnimeMap(
  animeIds: number[],
): Promise<Map<number, FeedAnimeSummary>> {
  const uniqueIds = Array.from(
    new Set(
      animeIds.filter((animeId) => Number.isInteger(animeId) && animeId > 0),
    ),
  );

  const animeMap = new Map<number, FeedAnimeSummary>();

  for (let index = 0; index < uniqueIds.length; index += JIKAN_BATCH_SIZE) {
    const batch = uniqueIds.slice(index, index + JIKAN_BATCH_SIZE);
    const batchItems = await Promise.all(
      batch.map((animeId) => getFeedAnimeSummary(animeId)),
    );

    batchItems.forEach((item) => {
      animeMap.set(item.id, item);
    });
  }

  return animeMap;
}

export async function getSocialFeedItems(
  viewerUserId: number,
): Promise<SocialFeedItem[]> {
  const following = await prisma.follows.findMany({
    where: {
      followerId: viewerUserId,
    },
    select: {
      followingId: true,
    },
  });

  const followingIds = following.map((entry) => entry.followingId);

  if (followingIds.length === 0) {
    return [];
  }

  const [watchlistActivity, historyActivity] = await Promise.all([
    prisma.watchlist.findMany({
      where: {
        userId: {
          in: followingIds,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: FEED_ACTIVITY_LIMIT,
      select: {
        animeId: true,
        status: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    }),
    prisma.watchHistory.findMany({
      where: {
        userId: {
          in: followingIds,
        },
        episodesWatched: {
          gt: 0,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: FEED_ACTIVITY_LIMIT,
      select: {
        animeId: true,
        episodesWatched: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    }),
  ]);

  const animeMap = await loadFeedAnimeMap([
    ...watchlistActivity.map((entry) => entry.animeId),
    ...historyActivity.map((entry) => entry.animeId),
  ]);

  const items: SocialFeedItem[] = [
    ...watchlistActivity.flatMap((entry) => {
      const anime = animeMap.get(entry.animeId);

      if (!anime) {
        return [];
      }

      return [
        {
          id: `watchlist-${entry.user.id}-${entry.animeId}`,
          type: "watchlist" as const,
          occurredAt: entry.updatedAt,
          user: {
            id: entry.user.id,
            name: entry.user.name,
            image: entry.user.image,
            avatarSrc:
              entry.user.image?.trim() || buildAvatarFallback(entry.user.name),
          },
          anime,
          watchlistStatus: entry.status as WatchlistStatus,
        },
      ];
    }),
    ...historyActivity.flatMap((entry) => {
      const anime = animeMap.get(entry.animeId);

      if (!anime) {
        return [];
      }

      return [
        {
          id: `history-${entry.user.id}-${entry.animeId}`,
          type: "history" as const,
          occurredAt: entry.updatedAt,
          user: {
            id: entry.user.id,
            name: entry.user.name,
            image: entry.user.image,
            avatarSrc:
              entry.user.image?.trim() || buildAvatarFallback(entry.user.name),
          },
          anime,
          episodesWatched: entry.episodesWatched,
        },
      ];
    }),
  ];

  return items
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
    .slice(0, FEED_ACTIVITY_LIMIT);
}
