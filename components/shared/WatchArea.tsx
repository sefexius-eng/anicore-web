"use client";

import { useMemo, useState, useEffect } from "react";

import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const JIKAN_ANIME_ENDPOINT = "https://api.jikan.moe/v4/anime";
const ROUGE_SEARCH_ENDPOINT =
  "https://api-anime-rouge.vercel.app/aniwatch/search";
const ROUGE_EPISODES_ENDPOINT =
  "https://api-anime-rouge.vercel.app/aniwatch/episodes";
const ROUGE_EPISODE_SRCS_ENDPOINT =
  "https://api-anime-rouge.vercel.app/aniwatch/episode-srcs";
const TEARS_OF_STEEL_STREAM =
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8";

interface WatchAreaProps {
  malId: number | string;
  totalEpisodes: number;
}

interface JikanAnimeResponse {
  data?: {
    title?: string | null;
    title_english?: string | null;
  };
}

interface RougeSearchAnime {
  id?: string;
}

interface RougeSearchResponse {
  animes?: RougeSearchAnime[];
  data?: {
    animes?: RougeSearchAnime[];
  };
}

interface RougeEpisode {
  id?: string;
  episodeId?: string;
  number?: number | string;
}

interface RougeEpisodesResponse {
  episodes?: RougeEpisode[];
  data?: {
    episodes?: RougeEpisode[];
  };
}

interface RougeStreamSource {
  url?: string;
}

interface RougeStreamResponse {
  file?: string;
  sources?: RougeStreamSource[];
  data?: {
    file?: string;
    sources?: RougeStreamSource[];
  };
}

function getEpisodes(totalEpisodes: number): number[] {
  if (!Number.isFinite(totalEpisodes) || totalEpisodes <= 0) {
    return [1];
  }

  return Array.from({ length: Math.floor(totalEpisodes) }, (_, index) => index + 1);
}

function extractRougeAnimes(payload: RougeSearchResponse): RougeSearchAnime[] {
  if (Array.isArray(payload.data?.animes)) {
    return payload.data.animes;
  }

  if (Array.isArray(payload.animes)) {
    return payload.animes;
  }

  return [];
}

function extractRougeEpisodes(payload: RougeEpisodesResponse): RougeEpisode[] {
  if (Array.isArray(payload.data?.episodes)) {
    return payload.data.episodes;
  }

  if (Array.isArray(payload.episodes)) {
    return payload.episodes;
  }

  return [];
}

function resolveEpisodeId(
  episodes: RougeEpisode[],
  requestedEpisode: number,
): string | null {
  const matchingEpisode = episodes.find((episode) => {
    const number =
      typeof episode.number === "string" ? Number(episode.number) : episode.number;

    return Number.isFinite(number) && Number(number) === requestedEpisode;
  });

  const directEpisodeId =
    matchingEpisode?.episodeId?.trim() || matchingEpisode?.id?.trim();

  if (directEpisodeId) {
    return directEpisodeId;
  }

  const fallbackEpisode = episodes[requestedEpisode - 1];
  return fallbackEpisode?.episodeId?.trim() || fallbackEpisode?.id?.trim() || null;
}

export function WatchArea({ malId, totalEpisodes }: WatchAreaProps) {
  const episodes = useMemo(() => getEpisodes(totalEpisodes), [totalEpisodes]);

  const [currentEp, setCurrentEp] = useState(1);
  const [streamSrc, setStreamSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedEpisode = Math.min(currentEp, episodes.length);

  useEffect(() => {
    const controller = new AbortController();

    const loadStream = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setStreamSrc(null);

      try {
        const jikanResponse = await fetch(
          `${JIKAN_ANIME_ENDPOINT}/${encodeURIComponent(String(malId))}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!jikanResponse.ok) {
          throw new Error("Не удалось получить название аниме из Jikan.");
        }

        const jikanData = (await jikanResponse.json()) as JikanAnimeResponse;
        const titleRomaji = jikanData?.data?.title?.trim() || "";
        const titleEnglish = jikanData?.data?.title_english?.trim() || "";

        const titleQueries = [titleRomaji, titleEnglish].filter(
          (query, index, arr) => query.length > 0 && arr.indexOf(query) === index,
        );

        if (!titleQueries.length) {
          throw new Error("Jikan не вернул корректное название для поиска.");
        }

        let cleanId: string | null = null;

        for (const title of titleQueries) {
          const searchResponse = await fetch(
            `${ROUGE_SEARCH_ENDPOINT}?keyword=${encodeURIComponent(title)}`,
            {
              method: "GET",
              cache: "no-store",
              signal: controller.signal,
            },
          );

          if (!searchResponse.ok) {
            continue;
          }

          const searchData = (await searchResponse.json()) as RougeSearchResponse;
          const rawId = extractRougeAnimes(searchData)[0]?.id?.trim() ?? "";
          const resolvedId = rawId.split("?")[0]?.trim() || "";

          if (resolvedId) {
            cleanId = resolvedId;
            break;
          }
        }

        if (!cleanId) {
          throw new Error("Rouge search не нашел аниме.");
        }

        const episodesResponse = await fetch(
          `${ROUGE_EPISODES_ENDPOINT}/${encodeURIComponent(cleanId)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!episodesResponse.ok) {
          throw new Error("Не удалось получить список эпизодов из Rouge.");
        }

        const episodesData = (await episodesResponse.json()) as RougeEpisodesResponse;
        const episodeId = resolveEpisodeId(
          extractRougeEpisodes(episodesData),
          selectedEpisode,
        );

        if (!episodeId) {
          throw new Error("Не удалось определить episodeId для выбранной серии.");
        }

        const streamResponse = await fetch(
          `${ROUGE_EPISODE_SRCS_ENDPOINT}?id=${encodeURIComponent(episodeId)}&server=vidstreaming&category=sub`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!streamResponse.ok) {
          throw new Error("Не удалось получить поток из Rouge.");
        }

        const streamData = (await streamResponse.json()) as RougeStreamResponse;
        const url =
          streamData.sources?.[0]?.url ||
          streamData.file ||
          streamData.data?.sources?.[0]?.url ||
          streamData.data?.file;

        if (!url) {
          throw new Error("Rouge не вернул ссылку на видео.");
        }

        setStreamSrc(url);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setStreamSrc(TEARS_OF_STEEL_STREAM);
        setErrorMessage(
          error instanceof Error
            ? `${error.message} Включен резервный поток.`
            : "Ошибка загрузки потока. Включен резервный поток.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadStream();

    return () => {
      controller.abort();
    };
  }, [malId, selectedEpisode]);

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Смотреть онлайн
          </h2>
          <p className="text-sm text-muted-foreground">
            Эпизод {selectedEpisode} из {episodes.length}
          </p>
        </div>

        {isLoading && <Skeleton className="aspect-video w-full rounded-2xl" />}

        {!isLoading && streamSrc && (
          <VideoPlayer src={streamSrc} title={`Эпизод ${selectedEpisode}`} />
        )}

        {!isLoading && !streamSrc && (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-destructive">
              {errorMessage ?? "Поток для выбранного эпизода недоступен."}
            </p>
          </div>
        )}
      </div>

      <aside className="rounded-2xl border border-border/60 bg-card/40 p-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Эпизоды
          </h3>
          <p className="text-sm text-muted-foreground">
            Выберите серию, чтобы переключить плеер.
          </p>
        </div>

        <div className="mt-4 h-[min(70vh,34rem)] overflow-y-auto pr-2">
          <div className="grid gap-2">
            {episodes.map((episodeNumber) => (
              <Button
                key={episodeNumber}
                variant={episodeNumber === selectedEpisode ? "default" : "secondary"}
                className="w-full justify-start"
                onClick={() => setCurrentEp(episodeNumber)}
              >
                Эпизод {episodeNumber}
              </Button>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}
