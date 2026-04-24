import { AnimeCard } from "@/components/shared/anime-card";
import { HomePopularContent } from "@/components/shared/home-popular-content";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface ShikimoriRecommendationEntry {
  id?: number;
  name?: string;
  russian?: string | null;
  score?: string | number | null;
  image?: {
    original?: string | null;
    preview?: string | null;
    url?: string | null;
    x160?: string | null;
  } | null;
}

interface RecommendedAnime {
  id: number;
  title: string;
  image: {
    original?: string | null;
    preview?: string | null;
    url?: string | null;
    x160?: string | null;
  } | null;
  image_url: string;
  score: number | null;
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

async function getRecommendedAnime(
  animeId: number,
): Promise<RecommendedAnime[]> {
  try {
    const res = await fetch(
      `https://shikimori.one/api/animes/${animeId}/similar`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      return [];
    }

    const payload = (await res.json()) as ShikimoriRecommendationEntry[];

    if (!Array.isArray(payload)) {
      return [];
    }

    const data = payload.slice(0, 6);

    return Array.from(
      new Map(
        data
          .map<RecommendedAnime | null>((anime) => {
            const id = anime.id;
            const title = anime.russian?.trim() || anime.name?.trim();

            if (typeof id !== "number" || !Number.isInteger(id) || !title) {
              return null;
            }

            return {
              id,
              title,
              image: anime.image
                ? {
                    original: anime.image.original ?? null,
                    preview: anime.image.preview ?? null,
                    url: anime.image.url ?? null,
                    x160: anime.image.x160 ?? null,
                  }
                : null,
              image_url: getImageUrl(anime.image),
              score: resolveRecommendationScore(anime.score),
            };
          })
          .filter((anime): anime is RecommendedAnime => anime !== null)
          .map((anime) => [anime.id, anime]),
      ).values(),
    ).slice(0, 6);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const session = await auth();
  const sessionUserId = Number(session?.user?.id ?? Number.NaN);

  const lastWatched =
    Number.isInteger(sessionUserId) && sessionUserId > 0
      ? await prisma.watchHistory.findFirst({
          where: {
            userId: sessionUserId,
          },
          orderBy: {
            updatedAt: "desc",
          },
        })
      : null;

  const recommendations = lastWatched
    ? await getRecommendedAnime(lastWatched.animeId)
    : [];

  return (
    <div className="flex flex-col gap-10">
      {lastWatched && recommendations.length > 0 ? (
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Рекомендуем вам
            </h2>
            <p className="text-sm text-muted-foreground">
              Похожие тайтлы на основе вашего последнего просмотра.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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
