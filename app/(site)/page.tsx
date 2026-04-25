import { Suspense } from "react";

import { AnimeCard } from "@/components/shared/anime-card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const JIKAN_REVALIDATE_SECONDS = 60 * 60;
const HOME_GRID_LIMIT = 18;
const HOME_FETCH_LIMIT = 18;

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
  members?: number | null;
  genres?: Array<{
    mal_id?: number;
  }> | null;
  images?: {
    jpg?: {
      large_image_url?: string | null;
    };
  };
}

interface JikanAnimeResponse {
  data?: JikanAnimeEntry;
}

interface JikanAnimeListResponse {
  data?: JikanAnimeEntry[];
}

interface HomepageAnimeCardItem {
  id: number;
  title: string;
  image: {
    original?: string | null;
  } | null;
  image_url: string;
  score: number | null;
}

function getSafeAnimeList(data: JikanAnimeEntry[] | null | undefined): JikanAnimeEntry[] {
  return Array.isArray(data)
    ? data.filter((anime): anime is JikanAnimeEntry => Boolean(anime))
    : [];
}

function deduplicateByMalId(animeList: JikanAnimeEntry[]): JikanAnimeEntry[] {
  return animeList.filter(
    (value, index, self) =>
      index === self.findIndex((anime) => anime.mal_id === value.mal_id),
  );
}

function getFranchiseKey(title: string | null | undefined): string {
  if (typeof title !== "string" || !title.trim()) {
    return "";
  }

  const normalizedTitle = title
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const [baseTitle] = normalizedTitle.split(
    /\s(?:season|part)\b|\b\d+(?:st|nd|rd|th)\b|:|\s-\s|-/i,
  );

  return (baseTitle || normalizedTitle)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function deduplicateFranchises<T extends { title?: string | null; id?: number }>(
  animeList: T[],
): T[] {
  const seenFranchises = new Set<string>();

  return animeList.filter((anime, index) => {
    const franchiseKey = getFranchiseKey(anime.title);
    const fallbackKey =
      typeof anime.id === "number" ? `anime-${anime.id}` : `anime-${index}`;
    const deduplicationKey = franchiseKey || fallbackKey;

    if (seenFranchises.has(deduplicationKey)) {
      return false;
    }

    seenFranchises.add(deduplicationKey);
    return true;
  });
}

function getBestTitle(anime: JikanAnimeEntry | undefined): string {
  if (!anime) {
    return "";
  }

  const russianTitle = anime.titles?.find(
    (title) =>
      title.type === "Russian" ||
      title.type === "ru" ||
      (typeof title.title === "string" && /[А-Яа-яЁё]/.test(title.title)),
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

async function fetchJikanJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: JIKAN_REVALIDATE_SECONDS,
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function getRecommendedAnime(
  animeId: number,
): Promise<HomepageAnimeCardItem[]> {
  const detailPayload = await fetchJikanJson<JikanAnimeResponse>(
    `https://api.jikan.moe/v4/anime/${animeId}`,
  );
  const detailAnime = detailPayload?.data;

  if (!detailAnime || !Array.isArray(detailAnime.genres)) {
    return [];
  }

  const genreIds = detailAnime.genres
    .map((genre) => genre.mal_id)
    .filter((genreId): genreId is number => typeof genreId === "number")
    .join(",");

  if (!genreIds) {
    return [];
  }

  const recommendationsPayload = await fetchJikanJson<JikanAnimeListResponse>(
    `https://api.jikan.moe/v4/anime?genres=${genreIds}&order_by=members&sort=desc&type=tv&limit=${HOME_FETCH_LIMIT}`,
  );
  const recommendations = deduplicateByMalId(
    getSafeAnimeList(recommendationsPayload?.data),
  );

  return deduplicateFranchises(
    recommendations
      .map<HomepageAnimeCardItem | null>((anime) => {
        const id = anime.mal_id;
        const title = getBestTitle(anime);
        const imageUrl = getImageUrl(anime.images?.jpg?.large_image_url ?? null);

        if (
          typeof id !== "number" ||
          !Number.isInteger(id) ||
          id === animeId ||
          !title
        ) {
          return null;
        }

        return {
          id,
          title,
          image: {
            original: imageUrl,
          },
          image_url: imageUrl,
          score:
            typeof anime.score === "number" && Number.isFinite(anime.score)
              ? anime.score
              : null,
        };
      })
      .filter((anime): anime is HomepageAnimeCardItem => anime !== null),
  ).slice(0, HOME_GRID_LIMIT);
}

async function getPopularAnime(): Promise<HomepageAnimeCardItem[]> {
  const payload = await fetchJikanJson<JikanAnimeListResponse>(
    `https://api.jikan.moe/v4/seasons/now?sfw=true&limit=${HOME_FETCH_LIMIT}`,
  );

  const popularAnime = [...getSafeAnimeList(payload?.data)].sort(
    (left, right) => (right.members ?? 0) - (left.members ?? 0),
  );

  return deduplicateFranchises(
    deduplicateByMalId(popularAnime)
      .map<HomepageAnimeCardItem | null>((anime) => {
        const id = anime.mal_id;
        const title = getBestTitle(anime);
        const imageUrl = getImageUrl(anime.images?.jpg?.large_image_url ?? null);

        if (typeof id !== "number" || !Number.isInteger(id) || !title) {
          return null;
        }

        return {
          id,
          title,
          image: {
            original: imageUrl,
          },
          image_url: imageUrl,
          score:
            typeof anime.score === "number" && Number.isFinite(anime.score)
              ? anime.score
              : null,
        };
      })
      .filter((anime): anime is HomepageAnimeCardItem => anime !== null),
  ).slice(0, HOME_GRID_LIMIT);
}

async function getAniMirokUserPicks(): Promise<HomepageAnimeCardItem[]> {
  const recentHighReviews = await prisma.review.findMany({
    where: {
      rating: {
        gte: 8,
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        rating: "desc",
      },
    ],
    take: HOME_FETCH_LIMIT,
    select: {
      animeId: true,
      rating: true,
    },
  });

  const uniqueHighReviews = recentHighReviews.filter(
    (review, index, self) =>
      index === self.findIndex((entry) => entry.animeId === review.animeId),
  );

  const picks = await Promise.all(
    uniqueHighReviews.slice(0, HOME_FETCH_LIMIT).map(async (review) => {
      const payload = await fetchJikanJson<JikanAnimeResponse>(
        `https://api.jikan.moe/v4/anime/${review.animeId}`,
      );
      const anime = payload?.data;
      const title = getBestTitle(anime) || `Anime #${review.animeId}`;
      const imageUrl = getImageUrl(anime?.images?.jpg?.large_image_url ?? null);

      return {
        id: review.animeId,
        title,
        image: {
          original: imageUrl,
        },
        image_url: imageUrl,
        score: review.rating,
      };
    }),
  );

  return deduplicateFranchises(picks).slice(0, HOME_GRID_LIMIT);
}

function SectionFallback({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-3xl border border-border/60 bg-card/70 text-gray-500 shadow-2xl backdrop-blur-sm">
      {label}
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function AnimeGrid({ items }: { items: HomepageAnimeCardItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {items.map((anime) => (
        <AnimeCard
          key={anime.id}
          id={anime.id}
          title={anime.title}
          image={anime.image}
          image_url={anime.image_url}
          score={anime.score}
        />
      ))}
    </div>
  );
}

async function RecommendationsBlock({ userId }: { userId: number }) {
  const lastWatched = await prisma.watchHistory.findFirst({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!lastWatched) {
    return null;
  }

  const recommendations = await getRecommendedAnime(lastWatched.animeId);

  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold tracking-tight text-foreground sm:mb-6 sm:text-3xl">
        Рекомендуем вам
      </h2>
      {recommendations.length > 0 ? (
        <AnimeGrid items={recommendations} />
      ) : (
        <EmptySection label="Пока не удалось собрать персональные рекомендации." />
      )}
    </section>
  );
}

async function PopularBlock() {
  const popularAnime = await getPopularAnime();

  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold tracking-tight text-foreground sm:mb-6 sm:text-3xl">
        Популярное сейчас
      </h2>
      {popularAnime.length > 0 ? (
        <AnimeGrid items={popularAnime} />
      ) : (
        <EmptySection label="Не удалось загрузить популярные тайтлы. Попробуйте обновить страницу чуть позже." />
      )}
    </section>
  );
}

async function UserPicksBlock() {
  const picks = await getAniMirokUserPicks();

  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold tracking-tight text-foreground sm:mb-6 sm:text-3xl">
        Выбор пользователей AniMirok
      </h2>
      {picks.length > 0 ? (
        <AnimeGrid items={picks} />
      ) : (
        <EmptySection label="Пока нет подборки из свежих пользовательских оценок." />
      )}
    </section>
  );
}

export default async function HomePage() {
  const session = await auth();
  const sessionUserId = Number(session?.user?.id ?? Number.NaN);

  return (
    <div className="flex w-full flex-col gap-10">
      <Suspense fallback={<SectionFallback label="Загрузка популярного..." />}>
        <PopularBlock />
      </Suspense>

      {Number.isInteger(sessionUserId) && sessionUserId > 0 ? (
        <Suspense fallback={<SectionFallback label="Загрузка рекомендаций..." />}>
          <RecommendationsBlock userId={sessionUserId} />
        </Suspense>
      ) : null}

      <Suspense
        fallback={<SectionFallback label="Загрузка выбора пользователей..." />}
      >
        <UserPicksBlock />
      </Suspense>
    </div>
  );
}
