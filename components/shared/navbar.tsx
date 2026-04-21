"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Navbar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    router.push(`/search?q=${encodeURIComponent(normalizedQuery)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-foreground transition-opacity hover:opacity-85"
        >
          AniCore.me
        </Link>

        <form
          onSubmit={handleSearch}
          className="hidden w-full max-w-md items-center gap-2 md:flex"
        >
          <Input
            aria-label="Поиск аниме"
            placeholder="Найти тайтл, жанр или студию"
            className="h-10 bg-muted/40"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" className="h-10">
            Поиск
          </Button>
        </form>

        <Button variant="outline" className="md:hidden">
          Меню
        </Button>
      </div>
    </header>
  );
}
