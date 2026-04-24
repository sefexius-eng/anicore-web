"use client";

import { Suspense, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Filter, Search, Sparkles } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AnimeCard } from "@/components/shared/anime-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AnimeSearchParams, AnimeShowcaseItem } from "@/services/jikanApi";

const GENRE_OPTIONS = [
  { value: "", label: "Все жанры" },
  { value: "1", label: "Экшен" },
  { value: "4", label: "Комедия" },
  { value: "8", label: "Драма" },
  { value: "10", label: "Фэнтези" },
  { value: "22", label: "Романтика" },
  { value: "27", label: "Сёнен" },
  { value: "36", label: "Повседневность" },
  { value: "130", label: "Исекай" },
] as const;

const YEAR_OPTIONS = [
  "",
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
  "2019",
  "2018",
  "2017",
  "2016",
] as const;

const SEARCH_RESULTS_LIMIT = 24;
const SELECT_CLASS_NAME =
  "h-11 w-full rounded-2xl border border-border/70 bg-background/80 px-4 text-sm text-foreground outline-none transition focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/20";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function getOptionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string | null {
  return options.find((option) => option.value === value)?.label ?? null;
}

function buildSearchUrl(
  pathname: string,
  params: {
    query?: string;
    genre?: string;
    season?: string;
  },
): string {
  const nextSearchParams = new URLSearchParams();
  const query = params.query?.trim() || "";
  const genre = params.genre?.trim() || "";
  const season = params.season?.trim() || "";

  if (query) {
    nextSearchParams.set("q", query);
  }

  if (genre) {
    nextSearchParams.set("genre", genre);
  }

  if (season) {
    nextSearchParams.set("season", season);
  }

  const queryString = nextSearchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const appliedQuery = (searchParams.get("q") ?? "").trim();
  const appliedGenre = (searchParams.get("genre") ?? "").trim();
  const appliedSeason = (searchParams.get("season") ?? "").trim();
  const hasAppliedCriteria = Boolean(appliedQuery || appliedGenre || appliedSeason);

  const [queryInput, setQueryInput] = useState(appliedQuery);
  const [selectedGenre, setSelectedGenre] = useState(appliedGenre);
  const [selectedSeason, setSelectedSeason] = useState(appliedSeason);
  const [results, setResults] = useState<AnimeShowcaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearchError, setHasSearchError] = useState(false);

  const appliedGenreLabel = getOptionLabel(GENRE_OPTIONS, appliedGenre);
  const appliedSeasonLabel = appliedSeason || null;
  const hasDraftCriteria = Boolean(queryInput.trim() || selectedGenre || selectedSeason);

  useEffect(() => {
    setQueryInput(appliedQuery);
    setSelectedGenre(appliedGenre);
    setSelectedSeason(appliedSeason);
  }, [appliedGenre, appliedQuery, appliedSeason]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hasAppliedCriteria) {
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
      const params: AnimeSearchParams = {
        search: appliedQuery,
        genre: appliedGenre,
        season: appliedSeason,
      };

      if (controller.signal.aborted) {
        return [];
      }

      return searchAnime(params, SEARCH_RESULTS_LIMIT, {
        signal: controller.signal,
      });
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
  }, [appliedGenre, appliedQuery, appliedSeason, hasAppliedCriteria]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextUrl = buildSearchUrl(pathname, {
      query: queryInput,
      genre: selectedGenre,
      season: selectedSeason,
    });

    router.push(nextUrl);
  }

  function handleReset() {
    setQueryInput("");
    setSelectedGenre("");
    setSelectedSeason("");
    router.push(pathname);
  }

  function handleGenreChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedGenre(event.target.value);
  }

  function handleSeasonChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedSeason(event.target.value);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 shadow-2xl backdrop-blur-sm">
        <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(17,24,39,0.78))] p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-sky-200">
                <Sparkles className="size-3.5" />
                Каталог AniMirok
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                  Продвинутый поиск и каталог аниме
                </h1>

                <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Ищите по названию, отбирайте тайтлы по жанру и году выпуска и
                  собирайте каталог даже без текстового запроса.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <p className="font-medium text-white">Источник данных</p>
              <p>Shikimori API в браузере</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6 sm:p-7">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_180px]">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  Название
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={queryInput}
                    onChange={(event) => setQueryInput(event.target.value)}
                    placeholder="Например: Sousou no Frieren"
                    className="h-11 rounded-2xl border-border/70 bg-background/80 pl-11 pr-4 text-sm"
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  Жанр
                </span>
                <select
                  value={selectedGenre}
                  onChange={handleGenreChange}
                  className={SELECT_CLASS_NAME}
                >
                  {GENRE_OPTIONS.map((option) => (
                    <option key={option.value || "all-genres"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  Год выпуска
                </span>
                <select
                  value={selectedSeason}
                  onChange={handleSeasonChange}
                  className={SELECT_CLASS_NAME}
                >
                  <option value="">Все годы</option>
                  {YEAR_OPTIONS.filter(Boolean).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-slate-300">
                  <Filter className="size-3.5" />
                  Активные параметры
                </span>

                {appliedQuery ? (
                  <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs text-sky-100">
                    Запрос: {appliedQuery}
                  </span>
                ) : null}

                {appliedGenreLabel ? (
                  <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs text-sky-100">
                    Жанр: {appliedGenreLabel}
                  </span>
                ) : null}

                {appliedSeasonLabel ? (
                  <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs text-sky-100">
                    Год: {appliedSeasonLabel}
                  </span>
                ) : null}

                {!hasAppliedCriteria ? (
                  <span className="text-sm text-muted-foreground">
                    Пока ничего не выбрано.
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasDraftCriteria && !hasAppliedCriteria}
                  className="h-11 rounded-2xl px-4"
                >
                  Сбросить
                </Button>

                <Button
                  type="submit"
                  disabled={!hasDraftCriteria}
                  className="h-11 rounded-2xl px-5"
                >
                  Показать каталог
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {!hasAppliedCriteria && (
        <section className="rounded-3xl border border-border/60 bg-card/70 p-6 text-sm text-muted-foreground shadow-2xl backdrop-blur-sm">
          Выберите жанр, год или введите название, чтобы открыть каталог и
          получить подборку тайтлов.
        </section>
      )}

      {hasAppliedCriteria && isLoading && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card/70 p-4 text-sm text-muted-foreground">
            Подбираем аниме по выбранным параметрам...
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={`search-skeleton-${index}`}
                className="aspect-[3/4] animate-pulse rounded-2xl border border-border/50 bg-muted/30"
              />
            ))}
          </div>
        </section>
      )}

      {hasAppliedCriteria && !isLoading && !hasSearchError && results.length > 0 && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card/70 p-4 text-sm text-slate-300 shadow-xl backdrop-blur-sm">
            Найдено тайтлов: <span className="font-semibold text-white">{results.length}</span>
          </div>

          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {results.map((anime) => (
              <AnimeCard
                key={anime.id}
                id={anime.id}
                title={anime.title}
                image={anime.image}
                image_url={anime.image_url}
                score={anime.score}
              />
            ))}
          </section>
        </section>
      )}

      {hasAppliedCriteria && !isLoading && !hasSearchError && results.length === 0 && (
        <section className="rounded-3xl border border-border/60 bg-card/70 p-6 text-sm text-muted-foreground shadow-2xl backdrop-blur-sm">
          По выбранным параметрам ничего не найдено. Попробуйте изменить жанр,
          год или уточнить название.
        </section>
      )}

      {hasAppliedCriteria && !isLoading && hasSearchError && (
        <section className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive shadow-2xl backdrop-blur-sm">
          Не удалось выполнить поиск через Shikimori API. Попробуйте повторить
          запрос чуть позже.
        </section>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <p className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
          Загружаем каталог...
        </p>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
