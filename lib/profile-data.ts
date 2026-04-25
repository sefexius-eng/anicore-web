import { cache } from "react";

import {
  toUserAchievementView,
  type UserAchievementView,
} from "@/lib/achievements";
import { prisma } from "@/lib/prisma";
import { getImageUrl } from "@/lib/utils";
import { formatTime } from "@/lib/watch-history";
import { type WatchlistStatus } from "@/lib/watchlist";

const HISTORY_LIMIT = 12;
const WATCHLIST_SECTION_LIMIT = 12;
const JIKAN_BATCH_SIZE = 4;
const JIKAN_REVALIDATE_SECONDS = 60 * 60 * 6;
const CYRILLIC_TITLE_PATTERN = /[А-Яа-яЁё]/;

const WATCHLIST_SECTIONS: Array<{
  status: WatchlistStatus;
  title: string;
  eyebrow: string;
}> = [
  {
    status: "WATCHING",
    title: "Смотрю сейчас",
    eyebrow: "Продолжить просмотр",
  },
  {
    status: "PLANNED",
    title: "В планах",
    eyebrow: "Список ожидания",
  },
  {
    status: "COMPLETED",
    title: "Просмотрено",
    eyebrow: "Коллекция",
  },
  {
    status: "DROPPED",
    title: "Брошено",
    eyebrow: "Архив",
  },
];

interface JikanTitleEntry {
  type?: string;
  title?: string;
}

interface JikanAnimeEntry {
  mal_id?: number;
  title?: string;
  title_english?: string | null;
  titles?: JikanTitleEntry[] | null;
  episodes?: number | null;
  score?: number | null;
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

interface ProfileAnimeCardBase {
  id: number;
  title: string;
  image_url: string;
  episodes: number | null;
  score: number | null;
}

export interface ProfileAnimeCardItem extends ProfileAnimeCardBase {
  overlayLabel?: string;
}

export interface ProfileShelfData {
  status: WatchlistStatus;
  title: string;
  eyebrow: string;
  items: ProfileAnimeCardItem[];
}

export interface ProfileViewData {
  userId: number;
  name: string;
  image: string | null;
  avatarSrc: string;
  rank: string;
  completedCount: number;
  timeSpentLabel: string;
  followersCount: number;
  followingCount: number;
  achievements: UserAchievementView[];
  historyItems: ProfileAnimeCardItem[];
  watchlistSections: ProfileShelfData[];
  isOwnProfile: boolean;
  isFollowing: boolean;
}

export function normalizePositiveInteger(value: unknown): number | null {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  const normalizedValue = Math.floor(parsedValue);
  return normalizedValue > 0 ? normalizedValue : null;
}

export function buildAvatarFallback(userName: string): string {
  const initials =
    userName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "A";

  return `https://placehold.co/256x256/0f172a/e2e8f0?text=${encodeURIComponent(initials)}`;
}

function getRank(completedCount: number): string {
  if (completedCount >= 500) {
    return "Хикикомори";
  }

  if (completedCount >= 100) {
    return "Отаку";
  }

  if (completedCount >= 50) {
    return "Анимешник";
  }

  if (completedCount >= 10) {
    return "Ученик";
  }

  return "Новичок";
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

const getProfileAnimeCard = cache(
  async (animeId: number): Promise<ProfileAnimeCardBase> => {
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
        episodes:
          typeof anime?.episodes === "number" && Number.isFinite(anime.episodes)
            ? anime.episodes
            : null,
        score:
          typeof anime?.score === "number" && Number.isFinite(anime.score)
            ? anime.score
            : null,
      };
    } catch {
      return {
        id: animeId,
        title: `Anime #${animeId}`,
        image_url: getImageUrl(null),
        episodes: null,
        score: null,
      };
    }
  },
);

async function loadProfileAnimeMap(
  animeIds: number[],
): Promise<Map<number, ProfileAnimeCardBase>> {
  const uniqueIds = Array.from(
    new Set(
      animeIds.filter((animeId) => Number.isInteger(animeId) && animeId > 0),
    ),
  );

  const animeMap = new Map<number, ProfileAnimeCardBase>();

  for (let index = 0; index < uniqueIds.length; index += JIKAN_BATCH_SIZE) {
    const batch = uniqueIds.slice(index, index + JIKAN_BATCH_SIZE);
    const batchItems = await Promise.all(
      batch.map((animeId) => getProfileAnimeCard(animeId)),
    );

    batchItems.forEach((item) => {
      animeMap.set(item.id, item);
    });
  }

  return animeMap;
}

export async function getProfileViewData(
  targetUserId: number,
  viewerUserId: number | null,
): Promise<ProfileViewData | null> {
  const isOwnProfile = viewerUserId === targetUserId;

  const [user, historyEntries, watchlistEntries, watchProgressEntries, followRecord] =
    await Promise.all([
      prisma.user.findUnique({
        where: {
          id: targetUserId,
        },
        select: {
          achievements: {
            orderBy: {
              unlockedAt: "desc",
            },
            select: {
              achievementId: true,
              unlockedAt: true,
            },
          },
          id: true,
          name: true,
          image: true,
          _count: {
            select: {
              followers: true,
              following: true,
            },
          },
        },
      }),
      prisma.watchHistory.findMany({
        where: {
          userId: targetUserId,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: HISTORY_LIMIT,
        select: {
          animeId: true,
          lastTime: true,
        },
      }),
      prisma.watchlist.findMany({
        where: {
          userId: targetUserId,
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          animeId: true,
          status: true,
        },
      }),
      prisma.watchHistory.findMany({
        where: {
          userId: targetUserId,
        },
        select: {
          animeId: true,
          episodesWatched: true,
          totalAvailable: true,
        },
      }),
      viewerUserId && !isOwnProfile
        ? prisma.follows.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerUserId,
                followingId: targetUserId,
              },
            },
            select: {
              followerId: true,
            },
          })
        : Promise.resolve(null),
    ]);

  if (!user) {
    return null;
  }

  const completedCount = watchlistEntries.filter(
    (entry) => entry.status === "COMPLETED",
  ).length;
  const totalMinutes = completedCount * 288;
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const timeSpentLabel =
    days > 0 ? `${days} д. ${hours} ч.` : `${Math.max(hours, 1)} ч.`;
  const avatarSrc = user.image?.trim() || buildAvatarFallback(user.name);

  const groupedWatchlists = WATCHLIST_SECTIONS.map((section) => ({
    ...section,
    entries: watchlistEntries
      .filter((entry) => entry.status === section.status)
      .slice(0, WATCHLIST_SECTION_LIMIT),
  }));

  const animeMap = await loadProfileAnimeMap([
    ...historyEntries.map((entry) => entry.animeId),
    ...groupedWatchlists.flatMap((section) =>
      section.entries.map((entry) => entry.animeId),
    ),
  ]);
  const watchProgressMap = new Map<
    number,
    { episodesWatched: number; totalAvailable: number | null }
  >(
    watchProgressEntries.map((entry) => [
      entry.animeId,
      {
        episodesWatched: entry.episodesWatched,
        totalAvailable: entry.totalAvailable,
      },
    ]),
  );

  const historyItems: ProfileAnimeCardItem[] = historyEntries.flatMap((entry) => {
    const anime = animeMap.get(entry.animeId);

    if (!anime) {
      return [];
    }

    return [
      {
        ...anime,
        overlayLabel: `Остановились на ${formatTime(entry.lastTime)}`,
      },
    ];
  });

  const watchlistSections: ProfileShelfData[] = groupedWatchlists.map((section) => ({
    status: section.status,
    title: section.title,
    eyebrow: section.eyebrow,
    items: section.entries
      .map((entry) => {
        const anime = animeMap.get(entry.animeId);

        if (!anime) {
          return null;
        }

        if (section.status === "WATCHING") {
          const watchProgress = watchProgressMap.get(entry.animeId);
          const episodesWatched = watchProgress?.episodesWatched ?? 0;
          const totalAvailable = watchProgress?.totalAvailable || anime.episodes;

          return {
            ...anime,
            overlayLabel: `Просмотрено: ${episodesWatched} / ${totalAvailable ?? "?"}`,
          };
        }

        if (section.status === "PLANNED") {
          return {
            ...anime,
            overlayLabel: `Серий: ${anime.episodes ?? "?"}`,
          };
        }

        return anime;
      })
      .filter((item): item is ProfileAnimeCardItem => item !== null),
  }));

  return {
    userId: user.id,
    name: user.name,
    image: user.image,
    avatarSrc,
    rank: getRank(completedCount),
    completedCount,
    timeSpentLabel,
    followersCount: user._count.followers,
    followingCount: user._count.following,
    achievements: user.achievements.map((achievement) =>
      toUserAchievementView(achievement.achievementId, achievement.unlockedAt),
    ),
    historyItems,
    watchlistSections,
    isOwnProfile,
    isFollowing: Boolean(followRecord),
  };
}
