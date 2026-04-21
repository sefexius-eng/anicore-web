import Image from "next/image";
import { notFound } from "next/navigation";

import { Footer } from "@/components/shared/footer";
import { Navbar } from "@/components/shared/navbar";
import { WatchArea } from "@/components/shared/WatchArea";
import { getPosterUrl } from "@/lib/poster";
import {
  type AnimeFranchiseSeasonItem,
  getAnimeDetailsById,
  getAnimeFranchiseSeasons,
} from "@/services/jikanApi";

interface AnimePageProps {
  params: Promise<{ id: string }>;
}

function cleanShikimoriText(text: string): string {
  return text.replace(/\[[^\]]+\]/g, "").trim();
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    notFound();
  }

  let anime;
  try {
    anime = await getAnimeDetailsById(numericId);
  } catch {
    notFound();
  }

  let franchiseSeasons: AnimeFranchiseSeasonItem[] = [];

  try {
    franchiseSeasons = await getAnimeFranchiseSeasons(numericId);
  } catch {
    franchiseSeasons = [{ id: numericId, order: 1, year: null, title: anime.title }];
  }

  const posterUrl = getPosterUrl(anime.image_url);
  const cleanSynopsis = cleanShikimoriText(anime.synopsis);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_45%),radial-gradient(circle_at_80%_20%,_rgba(99,102,241,0.2),_transparent_42%),radial-gradient(circle_at_20%_90%,_rgba(14,165,233,0.16),_transparent_45%)]" />

      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <section className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
            <WatchArea malId={numericId} franchiseSeasons={franchiseSeasons} />
          </div>

          <section className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
            <div className="grid gap-6 md:grid-cols-[220px_1fr]">
              <div className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
                <div className="relative aspect-[2/3] w-full">
                  <Image
                    src={posterUrl}
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
                  <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-muted-foreground">
                    MAL ID: {anime.id}
                  </span>
                  <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-foreground">
                    Score: {anime.score !== null ? anime.score.toFixed(2) : "N/A"}
                  </span>
                </div>

                <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground sm:text-base">
                  {cleanSynopsis}
                </p>
              </div>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  );
}
