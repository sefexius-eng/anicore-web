"use client";

import Link from "next/link";

import { AnimeCard } from "@/components/shared/anime-card";
import { Button } from "@/components/ui/button";
import { useWatchHistory } from "@/hooks/useWatchHistory";

export function HistoryContent() {
  const { items, isLoaded, clearHistory } = useWatchHistory();

  return (
    <section className="space-y-6">
      <div className="space-y-3 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.16em] text-sky-300">
              История просмотров
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Недавно открытые тайтлы
            </h1>

            <p className="max-w-2xl text-sm text-muted-foreground">
              История хранится локально в браузере и показывает последние 50
              аниме, которые вы открывали на AniCore.
            </p>
          </div>

          {items.length > 0 && (
            <Button variant="outline" onClick={clearHistory}>
              Очистить историю
            </Button>
          )}
        </div>
      </div>

      {!isLoaded && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="aspect-[2/3] rounded-3xl border border-border/60 bg-card/50"
            />
          ))}
        </div>
      )}

      {isLoaded && items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <AnimeCard
              key={item.id}
              id={item.id}
              title={item.name}
              image_url={item.image}
              score={null}
            />
          ))}
        </div>
      )}

      {isLoaded && items.length === 0 && (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 text-sm text-muted-foreground shadow-2xl backdrop-blur-sm">
          История пока пуста. Откройте любой тайтл на{" "}
          <Link href="/" className="text-foreground underline underline-offset-4">
            главной странице
          </Link>
          , и он появится здесь.
        </div>
      )}
    </section>
  );
}
