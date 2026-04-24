import { Suspense, cache } from "react";
import Image from "next/image";

import { AnimeWatchShell } from "@/components/shared/anime-watch-shell";
import { getImageUrl } from "@/lib/utils";

const JIKAN_REVALIDATE_SECONDS = 60 * 60;

interface AnimePageProps {
  params: Promise<{
    id?: string | string[];
  }>;
}

interface JikanTitleEntry {
  type?: string;
  title?: string;
}

interface JikanAnimeEntry {
  mal_id?: number;
  title?: string;
  title_english?: string | null;
  titles?: JikanTitleEntry[] | null;
  synopsis?: string | null;
  score?: number | null;
  images?: {
    jpg?: {
      large_image_url?: string | null;
      image_url?: string | null;
    };
  };
}

interface JikanAnimeResponse {
  data?: JikanAnimeEntry;
}

interface AnimeDetailsItem {
  id: number;
  title: string;
  synopsis: string;
  image_url: string;
  score: number | null;
}

function getRouteAnimeId(value: string | string[] | undefined): number {
  const rawId = Array.isArray(value) ? value[0] : value;
  return Number(rawId);
}

function cleanSynopsis(text: string): string {
  return text.replace(/\[[^\]]+\]/g, "").trim();
}

function getBestTitle(anime: JikanAnimeEntry | undefined): string {
  if (!anime) {
    return "";
  }

  const russianTitle = anime.titles?.find(
    (title) =>
      title.type === "Russian" ||
      title.type === "ru" ||
      (typeof title.title === "string" && /[А-Яа-яЁё]/.test(title.title)),
  );

  if (russianTitle?.title?.trim()) {
    return russianTitle.title.trim();
  }

  const englishTitle = anime.titles?.find(
    (title) => title.type === "English" || title.type === "en",
  );

  if (englishTitle?.title?.trim()) {
    return englishTitle.title.trim();
  }

  return anime.title_english?.trim() || anime.title?.trim() || "";
}

const getAnimeDetails = cache(async (animeId: number): Promise<AnimeDetailsItem> => {
  const response = await fetch(`https://api.jikan.moe/v4/anime/${animeId}`, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: JIKAN_REVALIDATE_SECONDS,
    },
  });

  if (!response.ok) {
    throw new Error(`Jikan request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as JikanAnimeResponse;
  const anime = payload.data;

  if (!anime || typeof anime.mal_id !== "number") {
    throw new Error("Jikan returned an invalid anime payload.");
  }

  return {
    id: anime.mal_id,
    title: getBestTitle(anime) || `Anime #${animeId}`,
    synopsis: cleanSynopsis(anime.synopsis?.trim() || ""),
    image_url: getImageUrl(
      anime.images?.jpg?.large_image_url ?? anime.images?.jpg?.image_url ?? null,
    ),
    score:
      typeof anime.score === "number" && Number.isFinite(anime.score)
        ? anime.score
        : null,
  };
});

async function getAnimeDetailsSafely(animeId: number) {
  try {
    return await getAnimeDetails(animeId);
  } catch {
    return null;
  }
}

function AnimeSectionFallback({ label }: { label: string }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        {label}
      </div>
    </section>
  );
}

function AnimeSectionError({ label }: { label: string }) {
  return (
    <section className="rounded-3xl border border-destructive/30 bg-destructive/10 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
      <div className="text-sm text-destructive">{label}</div>
    </section>
  );
}

async function AnimeWatchBlock({ animeId }: { animeId: number }) {
  const anime = await getAnimeDetailsSafely(animeId);

  if (!anime) {
    return <AnimeSectionError label="Не удалось загрузить блок просмотра." />;
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
      <AnimeWatchShell
        animeId={animeId}
        animeTitle={anime.title}
        history={{
          id: anime.id,
          name: anime.title,
          image: anime.image_url,
        }}
      />
    </section>
  );
}

async function AnimeDetailsBlock({ animeId }: { animeId: number }) {
  const anime = await getAnimeDetailsSafely(animeId);

  if (!anime) {
    return <AnimeSectionError label="Не удалось загрузить описание тайтла." />;
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
          <div className="relative aspect-[2/3] w-full">
            <Image
              src={anime.image_url}
              alt={anime.title}
              fill
              sizes="(max-width: 768px) 70vw, 220px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-300">
            Страница просмотра
          </p>

          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            {anime.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-foreground">
              Оценка: {anime.score !== null ? anime.score.toFixed(2) : "Нет"}
            </span>
          </div>

          <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground sm:text-base">
            {anime.synopsis || "Описание для этого тайтла пока недоступно."}
          </p>
        </div>
      </div>
    </section>
  );
}

export default async function AnimePage({ params }: AnimePageProps) {
  const resolvedParams = await params;
  const numericId = getRouteAnimeId(resolvedParams.id);
  const isValidAnimeId = Number.isInteger(numericId) && numericId > 0;

  if (!isValidAnimeId) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Не удалось определить тайтл. Попробуйте открыть страницу заново.
      </p>
    );
  }

  return (
    <section className="space-y-6">
      <Suspense fallback={<AnimeSectionFallback label="Загрузка плеера..." />}>
        <AnimeWatchBlock animeId={numericId} />
      </Suspense>

      <Suspense fallback={<AnimeSectionFallback label="Загрузка описания..." />}>
        <AnimeDetailsBlock animeId={numericId} />
      </Suspense>
    </section>
  );
}
