"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, Search } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="order-1 shrink-0 text-xl font-semibold tracking-tight text-foreground transition-opacity hover:opacity-85"
        >
          AniCore.me
        </Link>

        <form
          onSubmit={handleSearch}
          className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto sm:max-w-xl sm:flex-1"
        >
          <Input
            aria-label="Поиск аниме"
            placeholder="Найти тайтл, жанр или студию"
            className="h-10 min-w-0 flex-1 bg-muted/40"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" className="h-10">
            <Search className="size-4 sm:hidden" />
            <span className="sr-only sm:hidden">Поиск</span>
            <span className="hidden sm:inline">Поиск</span>
          </Button>
        </form>

        <Link
          href="/history"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "order-2 ml-auto h-10 gap-2 px-3 sm:order-3 sm:ml-0",
          )}
        >
          <History className="size-4" />
          <span>История</span>
        </Link>
      </div>
    </header>
  );
}
