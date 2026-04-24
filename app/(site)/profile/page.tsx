import { cache, type ReactNode } from "react";
import { redirect } from "next/navigation";

import { AnimeCard } from "@/components/shared/anime-card";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { auth } from "@/lib/auth";
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
    eyebrow: "Watchlist",
  },
  {
    status: "PLANNED",
    title: "В планах",
    eyebrow: "Watchlist",
  },
  {
    status: "COMPLETED",
    title: "Просмотрено",
    eyebrow: "Watchlist",
  },
  {
    status: "DROPPED",
    title: "Брошено",
    eyebrow: "Watchlist",
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

interface ProfileAnimeCardItem {
  id: number;
  title: string;
  image_url: string;
  score: number | null;
  posterOverlay?: ReactNode;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
  }).format(value);
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
  async (animeId: number): Promise<ProfileAnimeCardItem> => {
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
        score: null,
      };
    }
  },
);

async function loadProfileAnimeMap(
  animeIds: number[],
): Promise<Map<number, ProfileAnimeCardItem>> {
  const uniqueIds = Array.from(
    new Set(
      animeIds.filter((animeId) => Number.isInteger(animeId) && animeId > 0),
    ),
  );

  const animeMap = new Map<number, ProfileAnimeCardItem>();

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

function ProfileShelf({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: ProfileAnimeCardItem[];
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-sm">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-sky-300">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>

      {items.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {items.map((item) => (
            <div key={`${title}-${item.id}`} className="w-[168px] flex-none sm:w-[186px]">
              <AnimeCard
                id={item.id}
                title={item.title}
                image_url={item.image_url}
                score={item.score}
                posterOverlay={item.posterOverlay}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Здесь пока пусто</p>
      )}
    </section>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  const sessionUserId = Number(session?.user?.id ?? Number.NaN);

  if (!Number.isInteger(sessionUserId) || sessionUserId <= 0) {
    redirect("/login");
  }

  const [user, historyEntries, watchlistEntries] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: sessionUserId,
      },
      select: {
        name: true,
        email: true,
        image: true,
        birthDate: true,
        createdAt: true,
      },
    }),
    prisma.watchHistory.findMany({
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
        updatedAt: true,
      },
    }),
    prisma.watchlist.findMany({
      where: {
        userId: sessionUserId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        animeId: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  const completedCount = watchlistEntries.filter(
    (entry) => entry.status === "COMPLETED",
  ).length;
  const totalWatchedCount = watchlistEntries.length;
  const totalMinutes = completedCount * 288;
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);

  let rank = "Новичок";
  if (completedCount >= 10) rank = "Ученик";
  if (completedCount >= 50) rank = "Анимешник";
  if (completedCount >= 100) rank = "Отаку";
  if (completedCount >= 500) rank = "Хикикомори";

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

  const historyItems: ProfileAnimeCardItem[] = historyEntries.flatMap((entry) => {
    const anime = animeMap.get(entry.animeId);

    if (!anime) {
      return [];
    }

    return [
      {
        ...anime,
        posterOverlay: (
          <span className="inline-flex rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm sm:text-sm">
            Остановились на {formatTime(entry.lastTime)}
          </span>
        ),
      },
    ];
  });

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-300">
            Статистика
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Ваш прогресс в AniMirok
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#333] bg-[#1a1a1a] p-4 text-center shadow-lg">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-xs font-semibold uppercase tracking-[0.14em] text-white">
              Rank
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Ранг
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">{rank}</p>
            <p className="mt-2 text-xs text-slate-400">
              Повышается за завершённые тайтлы
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-[#333] bg-[#1a1a1a] p-4 text-center shadow-lg">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-lg font-semibold text-white">
              {completedCount}
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Просмотрено
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {completedCount} тайтлов
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {totalWatchedCount} всего в ваших списках
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-[#333] bg-[#1a1a1a] p-4 text-center shadow-lg">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-600 text-xs font-semibold uppercase tracking-[0.14em] text-white">
              Time
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Потрачено времени
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {days} дн. {hours} ч.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Аппроксимация по завершённым сезонам
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-sm">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.18em] text-sky-300">
              Профиль
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {user.name}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Здесь собраны ваши последние просмотры и персональные списки
              AniMirok.
            </p>

            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Email
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {user.email}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Дата рождения
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {formatDate(user.birthDate)}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  В AniMirok с
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {formatDate(user.createdAt)}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Сохранено
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {historyItems.length +
                    groupedWatchlists.reduce(
                      (sum, section) => sum + section.entries.length,
                      0,
                    )}{" "}
                  записей
                </p>
              </div>
            </div>
          </div>
        </section>

        <AvatarUpload currentImage={user.image} userName={user.name} />
      </div>

      <ProfileShelf
        eyebrow="История просмотров"
        title="Недавно открытые тайтлы"
        items={historyItems}
      />

      {groupedWatchlists.map((section) => (
        <ProfileShelf
          key={section.status}
          eyebrow={section.eyebrow}
          title={section.title}
          items={section.entries
            .map((entry) => animeMap.get(entry.animeId) ?? null)
            .filter((item): item is ProfileAnimeCardItem => item !== null)}
        />
      ))}
    </div>
  );
}
