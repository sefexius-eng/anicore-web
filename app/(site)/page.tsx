import { AnimeCard } from "@/components/shared/anime-card";
import { HomePopularContent } from "@/components/shared/home-popular-content";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getImageUrl } from "@/lib/utils";

interface ShikimoriRecommendationEntry {
  id?: number;
  name?: string;
  russian?: string | null;
  score?: string | number | null;
  image?: {
    original?: string | null;
    preview?: string | null;
    x160?: string | null;
    x96?: string | null;
    x48?: string | null;
  };
}

interface RecommendedAnime {
  id: number;
  title: string;
  image: {
    original?: string | null;
    preview?: string | null;
    x160?: string | null;
  } | null;
  image_url: string;
  score: number | null;
}

const RECOMMENDATION_FALLBACK_IMAGE =
  "https://placehold.co/225x320/1a1a1a/ffffff?text=No+Image";

function resolveRecommendationImage(
  recommendation: ShikimoriRecommendationEntry,
): string {
  return getImageUrl(
    recommendation.image?.original ??
      recommendation.image?.preview ??
      recommendation.image?.x160 ??
      recommendation.image?.x96 ??
      recommendation.image?.x48 ??
      RECOMMENDATION_FALLBACK_IMAGE,
  );
}

function resolveRecommendationScore(
  score: ShikimoriRecommendationEntry["score"],
): number | null {
  if (typeof score === "number" && Number.isFinite(score)) {
    return score;
  }

  if (typeof score === "string") {
    const parsedScore = Number(score);
    return Number.isFinite(parsedScore) ? parsedScore : null;
  }

  return null;
}

async function getRecommendedAnime(userId: number): Promise<RecommendedAnime[]> {
  const latestHistoryItem = await prisma.watchHistory.findFirst({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      animeId: true,
    },
  });

  if (!latestHistoryItem) {
    return [];
  }

  try {
    const response = await fetch(
      `https://shikimori.one/api/animes/${latestHistoryItem.animeId}/similar`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as ShikimoriRecommendationEntry[];

    if (!Array.isArray(payload)) {
      return [];
    }

    const recommendations = payload
      .map<RecommendedAnime | null>((anime) => {
        const id = anime.id;
        const title = anime.russian?.trim() || anime.name?.trim();

        if (typeof id !== "number" || !Number.isInteger(id) || !title) {
          return null;
        }

        const imageUrl = resolveRecommendationImage(anime);

        return {
          id,
          title,
          image: anime.image
            ? {
                original: anime.image.original ?? null,
                preview: anime.image.preview ?? null,
                x160: anime.image.x160 ?? anime.image.x96 ?? null,
              }
            : null,
          image_url: imageUrl,
          score: resolveRecommendationScore(anime.score),
        } satisfies RecommendedAnime;
      })
      .filter((recommendation): recommendation is RecommendedAnime =>
        recommendation !== null,
      );

    return Array.from(
      new Map(
        recommendations.map((recommendation) => [
          recommendation.id,
          recommendation,
        ]),
      ).values(),
    ).slice(0, 10);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const session = await auth();
  const sessionUserId = Number(session?.user?.id ?? Number.NaN);
  const recommendations =
    Number.isInteger(sessionUserId) && sessionUserId > 0
      ? await getRecommendedAnime(sessionUserId)
      : [];

  return (
    <div className="flex flex-col gap-12">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-8 shadow-2xl backdrop-blur-sm sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative space-y-4">
          <p className="text-sm uppercase tracking-[0.18em] text-sky-300">
            Онлайн-кинотеатр аниме
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Смотри аниме в лучшем качестве на AniMirok
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Новинки сезона, проверенная классика и удобная навигация по жанрам.
            Собираем для тебя самые интересные тайтлы в одном месте.
          </p>
        </div>
      </section>

      {recommendations.length > 0 ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Рекомендуем вам (на основе ваших просмотров)
              </h2>
              <p className="text-sm text-muted-foreground">
                Подобрали похожие тайтлы, чтобы было что включить сразу после
                следующей серии.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {recommendations.map((anime) => (
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
        </section>
      ) : null}

      <HomePopularContent />
    </div>
  );
}
