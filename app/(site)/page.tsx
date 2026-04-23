"use client";

import { useEffect, useState } from "react";

import { AnimeCard } from "@/components/shared/anime-card";

const FEATURED_MAL_IDS = [61316, 51553, 59708, 56876, 62001] as const;

interface AnimeShowcaseItem {
  id: number;
  title: string;
  image_url: string;
  score: number | null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function Home() {
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
    <div className="flex flex-col gap-12">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-8 shadow-2xl backdrop-blur-sm sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative space-y-4">
          <p className="text-sm uppercase tracking-[0.18em] text-sky-300">
            Онлайн-кинотеатр аниме
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Смотри аниме в лучшем качестве на AniCore
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Новинки сезона, проверенная классика и удобная навигация по
            жанрам. Собираем для тебя самые интересные тайтлы в одном месте.
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Популярное сейчас
          </h2>
          <p className="text-sm text-muted-foreground">
            Данные загружаются в браузере из Shikimori API.
          </p>
        </div>

        {isLoading ? (
          <p className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
            Загрузка...
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {showcaseAnime.map((anime) => (
              <AnimeCard
                key={anime.id}
                id={anime.id}
                title={anime.title}
                image_url={anime.image_url}
                score={anime.score}
              />
            ))}
          </div>
        )}

        {!isLoading && hasLoadError && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Не удалось загрузить данные с Shikimori API. Проверьте подключение к
            интернету и попробуйте обновить страницу.
          </p>
        )}
      </section>
    </div>
  );
}
