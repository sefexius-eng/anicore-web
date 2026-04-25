import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { getSocialFeedItems } from "@/lib/social-feed";
import type { WatchlistStatus } from "@/lib/watchlist";
import { getAnimeEpisodeSnapshots } from "@/services/jikanApi";

const NOTIFICATION_LIMIT = 30;
const FRIEND_ACTIVITY_LIMIT = 12;

export interface NotificationCenterItem {
  id: string;
  type: "new_episode" | "friend_activity";
  title: string;
  body: string;
  href: string;
  occurredAt: Date;
  metaLabel: string;
}

export interface NotificationCenterData {
  items: NotificationCenterItem[];
  newEpisodeCount: number;
  friendActivityCount: number;
}

function getWatchlistLabel(status: string | null | undefined): string {
  if (status === "WATCHING") {
    return "смотрю";
  }

  if (status === "PLANNED") {
    return "в планах";
  }

  if (status === "COMPLETED") {
    return "просмотрено";
  }

  if (status === "DROPPED") {
    return "брошено";
  }

  return "в списке";
}

function isOngoingStatus(status: string | null): boolean {
  return status === "ongoing" || status === "anons";
}

function buildEpisodeNotificationBody(params: {
  availableCount: number;
  episodesAired: number;
  episodesWatched: number;
  status: WatchlistStatus | null;
}): string {
  const watchlistLabel = getWatchlistLabel(params.status);

  return `Доступно ${params.availableCount} новых серий. Прогресс: ${params.episodesWatched}/${params.episodesAired}, статус: ${watchlistLabel}.`;
}

export const getNotificationCenterData = cache(
  async (viewerUserId: number): Promise<NotificationCenterData> => {
    const [watchHistory, watchlist, friendFeedItems] = await Promise.all([
      prisma.watchHistory.findMany({
        where: {
          userId: viewerUserId,
        },
        select: {
          animeId: true,
          episodesWatched: true,
          updatedAt: true,
        },
      }),
      prisma.watchlist.findMany({
        where: {
          userId: viewerUserId,
          status: {
            in: ["WATCHING", "PLANNED"],
          },
        },
        select: {
          animeId: true,
          status: true,
          updatedAt: true,
        },
      }),
      getSocialFeedItems(viewerUserId),
    ]);

    const watchProgressByAnimeId = new Map(
      watchHistory.map((entry) => [
        entry.animeId,
        {
          episodesWatched: entry.episodesWatched,
          updatedAt: entry.updatedAt,
        },
      ]),
    );
    const watchlistByAnimeId = new Map(
      watchlist.map((entry) => [
        entry.animeId,
        {
          status: entry.status as WatchlistStatus,
          updatedAt: entry.updatedAt,
        },
      ]),
    );
    const animeIds = Array.from(
      new Set([
        ...watchHistory.map((entry) => entry.animeId),
        ...watchlist.map((entry) => entry.animeId),
      ]),
    );
    const episodeSnapshots = await getAnimeEpisodeSnapshots(animeIds);
    const now = new Date();
    const episodeNotifications: NotificationCenterItem[] = Array.from(
      episodeSnapshots.values(),
    ).flatMap((snapshot) => {
      const progress = watchProgressByAnimeId.get(snapshot.id);
      const watchlistEntry = watchlistByAnimeId.get(snapshot.id);
      const episodesAired = snapshot.episodesAired ?? snapshot.episodesTotal;

      if (typeof episodesAired !== "number" || episodesAired <= 0) {
        return [];
      }

      const episodesWatched = progress?.episodesWatched ?? 0;
      const availableCount = episodesAired - episodesWatched;

      if (availableCount <= 0) {
        return [];
      }

      const shouldNotify =
        isOngoingStatus(snapshot.status) ||
        episodesWatched > 0 ||
        watchlistEntry?.status === "WATCHING";

      if (!shouldNotify) {
        return [];
      }

      return [
        {
          id: `episode-${snapshot.id}`,
          type: "new_episode" as const,
          title: snapshot.title,
          body: buildEpisodeNotificationBody({
            availableCount,
            episodesAired,
            episodesWatched,
            status: watchlistEntry?.status ?? null,
          }),
          href: `/anime/${snapshot.id}`,
          occurredAt: progress?.updatedAt ?? watchlistEntry?.updatedAt ?? now,
          metaLabel: "Новые серии",
        },
      ];
    });
    const friendNotifications: NotificationCenterItem[] = friendFeedItems
      .slice(0, FRIEND_ACTIVITY_LIMIT)
      .map((item) => {
        const isWatchlist = item.type === "watchlist";
        const title = isWatchlist
          ? `${item.user.name} обновил список`
          : `${item.user.name} смотрит тайтл`;
        const body = isWatchlist
          ? `"${item.anime.title}" добавлен в ${getWatchlistLabel(item.watchlistStatus)}.`
          : `"${item.anime.title}": просмотрено ${item.episodesWatched ?? 0} серий.`;

        return {
          id: `friend-${item.id}`,
          type: "friend_activity" as const,
          title,
          body,
          href: isWatchlist ? `/anime/${item.anime.id}` : `/user/${item.user.id}`,
          occurredAt: item.occurredAt,
          metaLabel: "Активность друзей",
        };
      });
    const items = [...episodeNotifications, ...friendNotifications]
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .slice(0, NOTIFICATION_LIMIT);

    return {
      items,
      newEpisodeCount: episodeNotifications.length,
      friendActivityCount: friendNotifications.length,
    };
  },
);
