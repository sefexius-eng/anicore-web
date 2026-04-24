import { Suspense, cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";

import { AnimeWatchShell } from "@/components/shared/anime-watch-shell";
import { getImageUrl } from "@/lib/utils";

const ANIME_REVALIDATE_SECONDS = 60 * 60;

interface AnimePageProps {
  params: Promise<{
    id?: string | string[];
  }>;
}

interface AnimeEntry {
  id?: number;
  name?: string | null;
  russian?: string | null;
  title?: string | null;
  description?: string | null;
  score?: string | number | null;
  image?: {
    original?: string | null;
    preview?: string | null;
    x160?: string | null;
    x96?: string | null;
    x48?: string | null;
  } | null;
}

interface ResolvedAnimeEntry extends AnimeEntry {
  id: number;
}

interface AnimeDetailsItem {
  id: number;
  title: string;
  description: string;
  image_url: string;
  score: number | null;
}

function getRouteAnimeId(value: string | string[] | undefined): number {
  const rawId = Array.isArray(value) ? value[0] : value;
  return Number(rawId);
}

function cleanDescription(text: string): string {
  return text.replace(/\[[^\]]+\]/g, "").trim();
}

function getBestTitle(anime: AnimeEntry | undefined): string {
  if (!anime) {
    return "";
  }

  return anime.russian?.trim() || anime.name?.trim() || anime.title?.trim() || "";
}

function getScore(score: AnimeEntry["score"]): number | null {
  if (typeof score === "number" && Number.isFinite(score)) {
    return score;
  }

  if (typeof score === "string") {
    const parsedScore = Number(score);
    return Number.isFinite(parsedScore) ? parsedScore : null;
  }

  return null;
}

const getAnime = cache(async (animeId: number): Promise<ResolvedAnimeEntry> => {
  const response = await fetch(`https://shikimori.one/api/animes/${animeId}`, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: ANIME_REVALIDATE_SECONDS,
    },
  });

  if (!response.ok) {
    throw new Error(`Anime request failed with status ${response.status}.`);
  }

  const anime = (await response.json()) as AnimeEntry;

  if (!anime || typeof anime.id !== "number") {
    throw new Error("Anime source returned an invalid anime payload.");
  }

  return anime as ResolvedAnimeEntry;
});

const getAnimeDetails = cache(async (animeId: number): Promise<AnimeDetailsItem> => {
  const anime = await getAnime(animeId);

  return {
    id: anime.id,
    title: getBestTitle(anime) || `Anime #${animeId}`,
    description: cleanDescription(anime.description?.trim() || ""),
    image_url: getImageUrl(anime.image ?? null),
    score: getScore(anime.score),
  };
});

export async function generateMetadata({
  params,
}: AnimePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const animeId = getRouteAnimeId(resolvedParams.id);

  if (!Number.isInteger(animeId) || animeId <= 0) {
    return { title: "AniMirok" };
  }

  try {
    const anime = await getAnime(animeId);
    const title = getBestTitle(anime) || `Anime #${animeId}`;
    const score = getScore(anime.score) ?? "Нет";
    const description =
      cleanDescription(anime.description?.trim() || "").slice(0, 160) ||
      "Смотрите аниме в лучшем качестве на AniMirok.";
    const imageUrl = getImageUrl(anime.image ?? null);

    return {
      title: `${title} — Смотреть онлайн на AniMirok`,
      description,
      openGraph: {
        title,
        description: `Оценка: ${score} | Смотреть на AniMirok`,
        images: imageUrl ? [{ url: imageUrl }] : undefined,
      },
    };
  } catch {
    return { title: "AniMirok" };
  }
}

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
      <div className="grid gap-6 md:grid-cols-[minmax(250px,300px)_1fr] md:items-start">
        <div className="mx-auto w-full max-w-[250px] shrink-0 sm:max-w-[300px]">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-[#282828] bg-muted/20 shadow-lg">
            <Image
              src={anime.image_url}
              alt={anime.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 250px, 300px"
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
            {anime.description || "Описание на русском языке пока отсутствует."}
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
