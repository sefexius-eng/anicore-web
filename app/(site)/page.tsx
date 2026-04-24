import { AnimeCard } from "@/components/shared/anime-card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface JikanTitleEntry {
  type?: string;
  title?: string;
}

interface JikanAnimeEntry {
  mal_id?: number;
  title?: string;
  title_ru?: string | null;
  titles?: JikanTitleEntry[] | null;
  score?: number | null;
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

function getRussianTitle(anime: JikanAnimeEntry): string {
  if (anime.title_ru?.trim()) {
    return anime.title_ru.trim();
  }

  const ruTitle = anime.titles?.find(
    (title) => title.type === "Russian" || title.type === "ru",
  );

  if (ruTitle?.title?.trim()) {
    return ruTitle.title.trim();
  }

  return anime.title?.trim() || "Без названия";
}

async function getRecommendedAnime(
  animeId: number,
): Promise<HomepageAnimeCardItem[]> {
  try {
    const detailRes = await fetch(
      `https://api.jikan.moe/v4/anime/${animeId}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!detailRes.ok) {
      return [];
    }

    const detailPayload = (await detailRes.json()) as JikanAnimeResponse;
    const detailAnime = detailPayload.data;

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

    const recRes = await fetch(
      `https://api.jikan.moe/v4/anime?genres=${genreIds}&order_by=members&sort=desc&type=tv&limit=18`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!recRes.ok) {
      return [];
    }

    const recPayload = (await recRes.json()) as JikanAnimeListResponse;
    const recommendations = Array.isArray(recPayload.data) ? recPayload.data : [];

    return Array.from(
      new Map(
        recommendations
          .map<HomepageAnimeCardItem | null>((anime) => {
            const id = anime.mal_id;
            const title = getRussianTitle(anime);
            const imageUrl = getImageUrl(
              anime.images?.jpg?.large_image_url ?? null,
            );

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

    const payload = (await popRes.json()) as JikanAnimeListResponse;
    const popularAnime = Array.isArray(payload.data) ? payload.data : [];

    return popularAnime
      .map<HomepageAnimeCardItem | null>((anime) => {
        const id = anime.mal_id;
        const title = getRussianTitle(anime);
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
              Популярные TV-сериалы по жанрам вашего последнего просмотренного
              тайтла.
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
            Актуальные онгоинги из Jikan API с русскими названиями, где они
            доступны.
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
