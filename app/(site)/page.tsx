import { AnimeCard } from "@/components/shared/anime-card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface JikanRecommendationResponse {
  data?: Array<{
    entry?: {
      mal_id?: number;
      title?: string;
      images?: {
        jpg?: {
          large_image_url?: string | null;
        };
      };
    };
  }>;
}

interface JikanTopAnimeResponse {
  data?: Array<{
    mal_id?: number;
    title?: string;
    title_ru?: string | null;
    score?: number | null;
    images?: {
      jpg?: {
        large_image_url?: string | null;
      };
    };
  }>;
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

async function getRecommendedAnime(
  animeId: number,
): Promise<HomepageAnimeCardItem[]> {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/anime/${animeId}/recommendations`,
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

    const payload = (await res.json()) as JikanRecommendationResponse;
    const jikanRecs = Array.isArray(payload.data) ? payload.data.slice(0, 12) : [];

    return Array.from(
      new Map(
        jikanRecs
          .map<HomepageAnimeCardItem | null>((item) => {
            const id = item.entry?.mal_id;
            const title = item.entry?.title?.trim();
            const imageUrl = getImageUrl(
              item.entry?.images?.jpg?.large_image_url ?? null,
            );

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
              score: null,
            };
          })
          .filter((anime): anime is HomepageAnimeCardItem => anime !== null)
          .map((anime) => [anime.id, anime]),
      ).values(),
    );
  } catch {
    return [];
  }
}

async function getPopularAnime(): Promise<HomepageAnimeCardItem[]> {
  try {
    const popRes = await fetch(
      "https://api.jikan.moe/v4/top/anime?filter=airing&limit=12",
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!popRes.ok) {
      return [];
    }

    const payload = (await popRes.json()) as JikanTopAnimeResponse;
    const popularAnime = Array.isArray(payload.data) ? payload.data : [];

    return popularAnime
      .map<HomepageAnimeCardItem | null>((anime) => {
        const id = anime.mal_id;
        const title = anime.title_ru?.trim() || anime.title?.trim();
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

  const [recommendations, popularAnime] = await Promise.all([
    lastWatched ? getRecommendedAnime(lastWatched.animeId) : Promise.resolve([]),
    getPopularAnime(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      {lastWatched && recommendations.length > 0 ? (
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Рекомендуем вам
            </h2>
            <p className="text-sm text-muted-foreground">
              Подборка рекомендаций от людей на основе вашего последнего
              просмотренного тайтла.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
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

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Популярное сейчас
          </h2>
          <p className="text-sm text-muted-foreground">
            Актуальные онгоинги из Jikan API с более стабильными постерами.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {popularAnime.map((anime) => (
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
    </div>
  );
}
