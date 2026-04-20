import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-foreground transition-opacity hover:opacity-85"
        >
          AniCore.me
        </Link>

        <div className="hidden w-full max-w-md items-center gap-2 md:flex">
          <Input
            aria-label="Поиск аниме"
            placeholder="Найти тайтл, жанр или студию"
            className="h-10 bg-muted/40"
          />
          <Button className="h-10">Поиск</Button>
        </div>

        <Button variant="outline" className="md:hidden">
          Меню
        </Button>
      </div>
    </header>
  );
}
