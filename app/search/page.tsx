import { AnimeCard } from "@/components/shared/anime-card";
import { Footer } from "@/components/shared/footer";
import { Navbar } from "@/components/shared/navbar";
import { searchAnime } from "@/services/jikanApi";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  let results: Awaited<ReturnType<typeof searchAnime>> = [];
  let hasSearchError = false;

  if (query) {
    try {
      results = await searchAnime(query, 10);
    } catch {
      hasSearchError = true;
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_45%),radial-gradient(circle_at_80%_20%,_rgba(99,102,241,0.2),_transparent_42%),radial-gradient(circle_at_20%_90%,_rgba(14,165,233,0.16),_transparent_45%)]" />

      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <section className="space-y-3 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-300">Поиск аниме</p>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {query ? `Результаты по запросу: ${query}` : "Введите запрос в строку поиска"}
          </h1>

          <p className="text-sm text-muted-foreground">
            Источник данных: Shikimori API
          </p>
        </section>

        {query && !hasSearchError && results.length > 0 && (
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

        {query && !hasSearchError && results.length === 0 && (
          <p className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
            По вашему запросу ничего не найдено. Попробуйте другое название.
          </p>
        )}

        {query && hasSearchError && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Не удалось выполнить поиск через Shikimori API. Попробуйте повторить чуть позже.
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
