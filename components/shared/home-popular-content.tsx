"use client";

import { useEffect, useState } from "react";

import { AnimeCard } from "@/components/shared/anime-card";

const FEATURED_MAL_IDS = [61316, 51553, 59708, 56876, 62001] as const;

interface AnimeShowcaseItem {
  id: number;
  name: string;
  russian?: string | null;
  title: string;
  image: {
    original?: string | null;
    preview?: string | null;
    x160?: string | null;
    url?: string | null;
  } | null;
  image_url: string;
  score: number | null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function HomePopularContent() {
  const [showcaseAnime, setShowcaseAnime] = useState<AnimeShowcaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadShowcaseAnime() {
      setIsLoading(true);
      setHasLoadError(false);

      const { getAnimeById } = await import("@/services/jikanApi");

      if (controller.signal.aborted) {
        return;
      }

      const results = await Promise.allSettled(
        FEATURED_MAL_IDS.map((id) =>
          getAnimeById(id, { signal: controller.signal }),
        ),
      );

      if (controller.signal.aborted) {
        return;
      }

      const items = results
        .filter(
          (
            result,
          ): result is PromiseFulfilledResult<AnimeShowcaseItem> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);

      setShowcaseAnime(items);
      setHasLoadError(items.length === 0);
      setIsLoading(false);
    }

    void loadShowcaseAnime().catch((error: unknown) => {
      if (controller.signal.aborted || isAbortError(error)) {
        return;
      }

      setShowcaseAnime([]);
      setHasLoadError(true);
      setIsLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Популярное сейчас
        </h2>
      </div>

      {isLoading ? (
        <p className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
          Загрузка...
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {showcaseAnime.map((anime) => (
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
      )}

      {!isLoading && hasLoadError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Не удалось загрузить данные с Shikimori API. Проверьте подключение к
          интернету и попробуйте обновить страницу.
        </p>
      ) : null}
    </section>
  );
}
