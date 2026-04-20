import { Button } from "@/components/ui/button";

const episodes = Array.from({ length: 12 }, (_, index) => index + 1);

export function EpisodeList() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Список эпизодов
        </h2>
        <p className="text-sm text-muted-foreground">
          Временные данные для проверки интерфейса плеера.
        </p>
      </div>

      <div className="h-[min(70vh,32rem)] overflow-y-auto pr-2">
        <div className="grid gap-2">
          {episodes.map((episodeNumber) => (
            <Button
              key={episodeNumber}
              variant={episodeNumber === 1 ? "default" : "secondary"}
              className="w-full justify-start"
            >
              Эпизод {episodeNumber}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
