import { cache } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AnimeCard } from "@/components/shared/anime-card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePositiveInteger } from "@/lib/profile-data";
import { getImageUrl } from "@/lib/utils";
import { formatTime } from "@/lib/watch-history";

const HISTORY_LIMIT = 50;
const JIKAN_BATCH_SIZE = 4;
const JIKAN_REVALIDATE_SECONDS = 60 * 60 * 6;

interface JikanTitleEntry {
  type?: string;
  title?: string;
}

interface JikanAnimeEntry {
  title?: string;
  titles?: JikanTitleEntry[] | null;
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

interface HistoryAnimeCardItem {
  id: number;
  title: string;
  titles?: JikanTitleEntry[] | null;
  image_url: string;
  score: number | null;
  lastTime: number;
}

const getHistoryAnimeCard = cache(
  async (animeId: number): Promise<Omit<HistoryAnimeCardItem, "lastTime">> => {
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
        title: anime?.title?.trim() || `Anime #${animeId}`,
        titles: anime?.titles ?? null,
        image_url: getImageUrl(
          anime?.images?.jpg?.large_image_url ?? anime?.images?.jpg?.image_url ?? null,
        ),
        score:
          typeof anime?.score === "number" && Number.isFinite(anime.score)
            ? anime.score
            : null,
      };
    } catch {
      return {
        id: animeId,
        title: `Anime #${animeId}`,
        titles: null,
        image_url: getImageUrl(null),
        score: null,
      };
    }
  },
);

async function loadHistoryAnimeMap(
  animeIds: number[],
): Promise<Map<number, Omit<HistoryAnimeCardItem, "lastTime">>> {
  const uniqueIds = Array.from(
    new Set(
      animeIds.filter((animeId) => Number.isInteger(animeId) && animeId > 0),
    ),
  );
  const animeMap = new Map<number, Omit<HistoryAnimeCardItem, "lastTime">>();

  for (let index = 0; index < uniqueIds.length; index += JIKAN_BATCH_SIZE) {
    const batch = uniqueIds.slice(index, index + JIKAN_BATCH_SIZE);
    const batchItems = await Promise.all(
      batch.map((animeId) => getHistoryAnimeCard(animeId)),
    );

    batchItems.forEach((item) => {
      animeMap.set(item.id, item);
    });
  }

  return animeMap;
}

export default async function HistoryPage() {
  const session = await auth();
  const sessionUserId = normalizePositiveInteger(session?.user?.id);

  if (!sessionUserId) {
    redirect("/login");
  }

  const historyEntries = await prisma.watchHistory.findMany({
    where: {
      userId: sessionUserId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: HISTORY_LIMIT,
    select: {
      animeId: true,
      lastTime: true,
    },
  });

  const animeMap = await loadHistoryAnimeMap(
    historyEntries.map((entry) => entry.animeId),
  );
  const historyItems: HistoryAnimeCardItem[] = historyEntries.flatMap((entry) => {
    const anime = animeMap.get(entry.animeId);

    if (!anime) {
      return [];
    }

    return [
      {
        ...anime,
        lastTime: entry.lastTime,
      },
    ];
  });

  return (
    <section className="space-y-6">
      <div className="space-y-3 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-sm">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-300">
            История просмотров
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Недавно открытые тайтлы
          </h1>

          <p className="max-w-2xl text-sm text-muted-foreground">
            История синхронизируется с профилем и обновляется после просмотра.
          </p>
        </div>
      </div>

      {historyItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {historyItems.map((item) => (
            <AnimeCard
              key={item.id}
              id={item.id}
              title={item.title}
              titles={item.titles}
              image_url={item.image_url}
              score={item.score}
              posterOverlay={
                <span className="inline-flex rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm sm:text-sm">
                  Остановились на {formatTime(item.lastTime)}
                </span>
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 text-sm text-muted-foreground shadow-2xl backdrop-blur-sm">
          История пока пустая. Откройте любой тайтл на{" "}
          <Link href="/" className="text-foreground underline underline-offset-4">
            главной странице
          </Link>
          , и он появится здесь.
        </div>
      )}
    </section>
  );
}
