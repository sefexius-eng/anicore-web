/* eslint-disable @next/next/no-img-element */
import { cache, type ReactNode } from "react";
import {
  Award,
  Bookmark,
  CalendarDays,
  Clock3,
  Mail,
  Sparkles,
  Tv2,
  type LucideIcon,
} from "lucide-react";
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

interface ProfileAnimeCardItem {
  id: number;
  title: string;
  image_url: string;
  episodes: number | null;
  score: number | null;
  posterOverlay?: ReactNode;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
  }).format(value);
}

function buildAvatarFallback(userName: string): string {
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

function ProfileMetricCard({
  Icon,
  label,
  value,
  toneClass,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  toneClass: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111827]/80 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 hover:border-sky-400/30">
      <div
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClass}`}
      >
        <Icon className="size-5" />
      </div>

      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function ProfileDetailCard({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a]/70 p-4 shadow-lg shadow-black/20">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-200">
          <Icon className="size-4" />
        </div>

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-1 truncate text-sm font-medium text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );
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
    <section className="space-y-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.32)] backdrop-blur-sm">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-sky-300">{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <AnimeCard
              key={`${title}-${item.id}`}
              id={item.id}
              title={item.title}
              image_url={item.image_url}
              score={item.score}
              posterOverlay={item.posterOverlay}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-10 text-center text-sm text-slate-400">
          Здесь пока пусто, но этот раздел заполнится, как только вы добавите тайтлы.
        </div>
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

  const [user, historyEntries, watchlistEntries, watchProgressEntries] =
    await Promise.all([
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
    prisma.watchHistory.findMany({
      where: {
        userId: sessionUserId,
      },
      select: {
        animeId: true,
        episodesWatched: true,
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
  const timeSpentLabel =
    days > 0 ? `${days} д. ${hours} ч.` : `${Math.max(hours, 1)} ч.`;
  const rank = getRank(completedCount);
  const avatarSrc = user.image?.trim() || buildAvatarFallback(user.name);
  const savedEntriesCount = historyEntries.length + watchlistEntries.length;

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
  const watchProgressMap = new Map<number, number>(
    watchProgressEntries.map((entry) => [entry.animeId, entry.episodesWatched]),
  );

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

  const profileFacts = [
    {
      Icon: Mail,
      label: "Email",
      value: user.email,
    },
    {
      Icon: CalendarDays,
      label: "Дата рождения",
      value: formatDate(user.birthDate),
    },
    {
      Icon: Sparkles,
      label: "В AniMirok с",
      value: formatDate(user.createdAt),
    },
    {
      Icon: Bookmark,
      label: "Сохранено",
      value: `${savedEntriesCount} записей`,
    },
  ];

  const metrics = [
    {
      Icon: Award,
      label: "Ранг",
      value: rank,
      description: "Повышается за завершенные тайтлы и регулярную активность.",
      toneClass:
        "from-amber-300/35 to-orange-500/20 text-amber-100 ring-1 ring-amber-300/30",
    },
    {
      Icon: Tv2,
      label: "Просмотрено",
      value: `${completedCount} тайтлов`,
      description: `${totalWatchedCount} всего в ваших списках и подборках.`,
      toneClass:
        "from-sky-300/35 to-cyan-500/20 text-sky-100 ring-1 ring-sky-300/30",
    },
    {
      Icon: Clock3,
      label: "Время",
      value: timeSpentLabel,
      description: "Оценка по завершенным сезонам с учетом общего прогресса.",
      toneClass:
        "from-fuchsia-300/35 to-violet-500/20 text-fuchsia-100 ring-1 ring-fuchsia-300/30",
    },
  ];

  const watchlistSectionItems = groupedWatchlists.map((section) => ({
    ...section,
    items: section.entries
      .map((entry) => {
        const anime = animeMap.get(entry.animeId);

        if (!anime) {
          return null;
        }

        if (section.status === "WATCHING") {
          const episodesWatched = watchProgressMap.get(entry.animeId) ?? 0;

          return {
            ...anime,
            posterOverlay: (
              <span className="inline-flex rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm sm:text-sm">
                Просмотрено: {episodesWatched} / {anime.episodes ?? "?"}
              </span>
            ),
          };
        }

        if (section.status === "PLANNED") {
          return {
            ...anime,
            posterOverlay: (
              <span className="inline-flex rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm sm:text-sm">
                Серий: {anime.episodes ?? "?"}
              </span>
            ),
          };
        }

        return anime;
      })
      .filter((item): item is ProfileAnimeCardItem => item !== null),
  }));

  return (
    <div className="space-y-8 pb-6">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#090f1d] shadow-[0_35px_100px_rgba(0,0,0,0.42)]">
        <div className="relative h-56 overflow-hidden sm:h-64">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,#0f172a_0%,#1d4ed8_42%,#7c3aed_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(125,211,252,0.35),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(216,180,254,0.28),transparent_28%),linear-gradient(to_top,rgba(9,15,29,0.92),rgba(9,15,29,0.12))]" />
          <div className="absolute -bottom-16 left-6 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute right-10 top-8 h-24 w-24 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm" />
          <div className="absolute bottom-8 right-24 h-14 w-14 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm" />
        </div>

        <div className="relative px-6 pb-8 sm:px-8">
          <div className="-mt-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between sm:-mt-20">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative">
                <img
                  src={avatarSrc}
                  alt={user.name}
                  className="h-32 w-32 rounded-full border-4 border-[#0f0f0f] object-cover shadow-[0_24px_50px_rgba(0,0,0,0.45)] sm:h-40 sm:w-40"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-2 right-2 rounded-full border border-white/15 bg-black/65 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-100 backdrop-blur-sm">
                  Channel
                </div>
              </div>

              <div className="max-w-2xl space-y-3">
                <p className="text-xs uppercase tracking-[0.22em] text-sky-200/90">
                  Профиль AniMirok
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {user.name}
                </h1>
                <p className="hidden max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                  Ваш личный канал в AniMirok: возвращайтесь к последним сериям,
                  держите watchlist под рукой и отслеживайте прогресс в одном месте.
                </p>

                <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    {user.email}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    С нами с {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden rounded-3xl border border-white/10 bg-black/20 p-4 backdrop-blur-md lg:max-w-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-sky-200/90">
                Профиль в цифрах
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Последние открытия, активные списки и общее время просмотра теперь
                собраны в формате, который ощущается как премиальная страница канала.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <ProfileMetricCard
                key={metric.label}
                Icon={metric.Icon}
                label={metric.label}
                value={metric.value}
                toneClass={metric.toneClass}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.32)] backdrop-blur-sm">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-300">
              Детали профиля
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Все, что нужно для быстрого возвращения к просмотру
            </h2>
            <p className="hidden max-w-2xl text-sm leading-6 text-slate-300">
              Обновляйте аватар, держите важные данные рядом и используйте профиль как
              центральную точку для истории и личных списков.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {profileFacts.map((fact) => (
              <ProfileDetailCard
                key={fact.label}
                Icon={fact.Icon}
                label={fact.label}
                value={fact.value}
              />
            ))}
          </div>
        </section>

        <AvatarUpload currentImage={user.image} userName={user.name} />
      </div>

      <ProfileShelf
        eyebrow="История просмотров"
        title="Недавно открытые тайтлы"
        items={historyItems}
      />

      {watchlistSectionItems.map((section) => (
        <ProfileShelf
          key={section.status}
          eyebrow={section.eyebrow}
          title={section.title}
          items={section.items}
        />
      ))}
    </div>
  );
}
