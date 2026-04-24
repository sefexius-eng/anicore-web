import { Suspense } from "react";

import { AnimeCard } from "@/components/shared/anime-card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const JIKAN_REVALIDATE_SECONDS = 60 * 60;
const POPULAR_GRID_LIMIT = 8;
const RECOMMENDATIONS_GRID_LIMIT = 12;
const RECOMMENDATIONS_FETCH_LIMIT = 18;

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

function deduplicateByMalId(animeList: JikanAnimeEntry[]): JikanAnimeEntry[] {
  return animeList.filter(
    (value, index, self) =>
      index === self.findIndex((anime) => anime.mal_id === value.mal_id),
  );
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
    `https://api.jikan.moe/v4/anime?genres=${genreIds}&order_by=members&sort=desc&type=tv&limit=${RECOMMENDATIONS_FETCH_LIMIT}`,
  );
  const recommendations = Array.isArray(recommendationsPayload?.data)
    ? deduplicateByMalId(recommendationsPayload.data)
    : [];

  return recommendations
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
    .filter((anime): anime is HomepageAnimeCardItem => anime !== null)
    .slice(0, RECOMMENDATIONS_GRID_LIMIT);
}

async function getPopularAnime(): Promise<HomepageAnimeCardItem[]> {
  const payload = await fetchJikanJson<JikanAnimeListResponse>(
    `https://api.jikan.moe/v4/seasons/now?sfw=true&limit=${POPULAR_GRID_LIMIT}`,
  );

  const popularAnime = Array.isArray(payload?.data)
    ? [...payload.data].sort(
        (left, right) => (right.members ?? 0) - (left.members ?? 0),
      )
    : [];

  return deduplicateByMalId(popularAnime)
    .slice(0, POPULAR_GRID_LIMIT)
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
    .filter((anime): anime is HomepageAnimeCardItem => anime !== null);
}

function SectionFallback({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-3xl border border-border/60 bg-card/70 text-gray-500 shadow-2xl backdrop-blur-sm">
      {label}
    </div>
  );
}

function AnimeGrid({ items }: { items: HomepageAnimeCardItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
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

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Рекомендуем вам
        </h2>
        <p className="text-sm text-muted-foreground">
          Подборка по жанрам вашего последнего просмотренного тайтла.
        </p>
      </div>

      <AnimeGrid items={recommendations} />
    </section>
  );
}

async function PopularBlock() {
  const popularAnime = await getPopularAnime();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Популярное сейчас
        </h2>
        <p className="text-sm text-muted-foreground">
          Онгоинги сезона, которые уже собирают наибольший интерес.
        </p>
      </div>

      <AnimeGrid items={popularAnime} />
    </section>
  );
}

export default async function HomePage() {
  const session = await auth();
  const sessionUserId = Number(session?.user?.id ?? Number.NaN);

  return (
    <div className="flex flex-col gap-10">
      <Suspense fallback={<SectionFallback label="Загрузка популярного..." />}>
        <PopularBlock />
      </Suspense>

      {Number.isInteger(sessionUserId) && sessionUserId > 0 ? (
        <Suspense fallback={<SectionFallback label="Загрузка рекомендаций..." />}>
          <RecommendationsBlock userId={sessionUserId} />
        </Suspense>
      ) : null}
    </div>
  );
}
