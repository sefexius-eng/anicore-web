"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { AnimeCard } from "@/components/shared/anime-card";
import { Button } from "@/components/ui/button";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { formatTime } from "@/lib/watch-history";
import { cn } from "@/lib/utils";

export function HistoryContent() {
  const { items, isLoaded, removeItem, clearHistory } = useWatchHistory();
  const [removingIds, setRemovingIds] = useState<number[]>([]);
  const removalTimersRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const timers = removalTimersRef.current;

    return () => {
      for (const timeoutId of timers.values()) {
        window.clearTimeout(timeoutId);
      }

      timers.clear();
    };
  }, []);

  const handleRemoveItem = (id: number) => {
    if (removingIds.includes(id)) {
      return;
    }

    setRemovingIds((currentIds) => [...currentIds, id]);

    const timeoutId = window.setTimeout(() => {
      removeItem(id);

      setRemovingIds((currentIds) => currentIds.filter((currentId) => currentId !== id));
      removalTimersRef.current.delete(id);
    }, 220);

    removalTimersRef.current.set(id, timeoutId);
  };

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
              аниме, которые вы открывали на AniMirok.
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
            <div
              key={item.id}
              className={cn(
                "group relative transition duration-200",
                removingIds.includes(item.id)
                  ? "pointer-events-none -translate-y-2 scale-95 opacity-0"
                  : "translate-y-0 scale-100 opacity-100",
              )}
            >
              <Button
                type="button"
                size="icon"
                variant="destructive"
                aria-label={`Удалить ${item.name} из истории`}
                className="absolute right-2 top-2 z-20 h-8 w-8 opacity-100 shadow-lg transition sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => handleRemoveItem(item.id)}
              >
                <Trash2 className="size-4" />
              </Button>

              <AnimeCard
                id={item.id}
                title={item.name}
                image_url={item.image}
                score={null}
                posterOverlay={
                  <span className="inline-flex rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm sm:text-sm">
                    Остановились на {formatTime(item.stoppedAt)}
                  </span>
                }
              />
            </div>
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
