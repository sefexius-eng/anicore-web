import { Suspense } from "react";

import { AnimeCard } from "@/components/shared/anime-card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAnimeById,
  getAnimeDetailsById,
  getPopularOngoing,
  getRecommendationsByGenres,
  toAnimeShowcaseItem,
  type AnimeShowcaseItem,
} from "@/services/jikanApi";

export const dynamic = "force-dynamic";

const HOME_GRID_LIMIT = 18;
const HOME_FETCH_LIMIT = 24;

type HomepageAnimeCardItem = AnimeShowcaseItem;

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

function getAnimeTitle(anime: {
  name?: string | null;
  russian?: string | null;
  title?: string | null;
}): string {
  return anime.russian?.trim() || anime.name?.trim() || anime.title?.trim() || "";
}

function deduplicateFranchises<
  T extends { id?: number; name?: string | null; russian?: string | null; title?: string | null },
>(
  animeList: T[],
): T[] {
  const seenFranchises = new Set<string>();

  return animeList.filter((anime, index) => {
    const franchiseKey = getFranchiseKey(getAnimeTitle(anime));
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

async function getRecommendedAnime(
  animeId: number,
): Promise<HomepageAnimeCardItem[]> {
  const detailAnime = await getAnimeDetailsById(animeId).catch(() => null);
  const genreIds = detailAnime?.genreIds ?? [];

  if (genreIds.length === 0) {
    return [];
  }

  return deduplicateFranchises(
    (await getRecommendationsByGenres(genreIds, HOME_FETCH_LIMIT)).filter(
      (anime) => anime.id !== animeId,
    ),
  )
    .map(toAnimeShowcaseItem)
    .slice(0, HOME_GRID_LIMIT);
}

async function getPopularAnime(): Promise<HomepageAnimeCardItem[]> {
  const popularAnime = await getPopularOngoing(HOME_FETCH_LIMIT);

  return deduplicateFranchises(popularAnime)
    .map(toAnimeShowcaseItem)
    .slice(0, HOME_GRID_LIMIT);
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

  const picks: Array<HomepageAnimeCardItem | null> = await Promise.all(
    uniqueHighReviews.slice(0, HOME_FETCH_LIMIT).map(async (review) => {
      const anime = await getAnimeById(review.animeId).catch(() => null);

      if (!anime) {
        return null;
      }

      return {
        ...anime,
        score: review.rating,
      };
    }),
  );

  return deduplicateFranchises(
    picks.filter((anime): anime is HomepageAnimeCardItem => anime !== null),
  ).slice(0, HOME_GRID_LIMIT);
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
          name={anime.name}
          russian={anime.russian}
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
