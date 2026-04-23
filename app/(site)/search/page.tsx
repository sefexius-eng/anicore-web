"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AnimeCard } from "@/components/shared/anime-card";

interface AnimeShowcaseItem {
  id: number;
  title: string;
  image_url: string;
  score: number | null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const [results, setResults] = useState<AnimeShowcaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearchError, setHasSearchError] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!query) {
      setResults([]);
      setIsLoading(false);
      setHasSearchError(false);
      return;
    }

    const controller = new AbortController();

    setResults([]);
    setIsLoading(true);
    setHasSearchError(false);

    async function loadSearchResults() {
      const { searchAnime } = await import("@/services/jikanApi");

      if (controller.signal.aborted) {
        return [];
      }

      return searchAnime(query, 20, { signal: controller.signal });
    }

    void loadSearchResults()
      .then((items) => {
        if (controller.signal.aborted) {
          return;
        }

        setResults(items);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }

        setResults([]);
        setHasSearchError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [query]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-3 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.16em] text-sky-300">Поиск аниме</p>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {query
            ? `Результаты по запросу: ${query}`
            : "Введите запрос в строку поиска"}
        </h1>

        <p className="text-sm text-muted-foreground">
          Источник данных: Shikimori API, загрузка выполняется в браузере
        </p>
      </section>

      {query && isLoading && (
        <p className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
          Загрузка...
        </p>
      )}

      {query && !isLoading && !hasSearchError && results.length > 0 && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {results.map((anime) => (
            <AnimeCard
              key={anime.id}
              id={anime.id}
              title={anime.title}
              image_url={anime.image_url}
              score={anime.score}
            />
          ))}
        </section>
      )}

      {query && !isLoading && !hasSearchError && results.length === 0 && (
        <p className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
          По вашему запросу ничего не найдено. Попробуйте другое название.
        </p>
      )}

      {query && !isLoading && hasSearchError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Не удалось выполнить поиск через Shikimori API. Попробуйте повторить чуть позже.
        </p>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <p className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
          Загрузка...
        </p>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
