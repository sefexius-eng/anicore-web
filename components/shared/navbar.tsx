import Link from "next/link";
import { History } from "lucide-react";

import { NavbarSearch } from "@/components/shared/navbar-search";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NavbarShell() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="order-1 shrink-0 text-xl font-semibold tracking-tight text-foreground transition-opacity hover:opacity-85"
        >
          AniCore.me
        </Link>

        <NavbarSearch />

        <Link
          href="/history"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "order-2 ml-auto h-10 gap-2 px-3 sm:order-3 sm:ml-0",
          )}
        >
          <History className="size-4" />
          <span>{"\u0418\u0441\u0442\u043e\u0440\u0438\u044f"}</span>
        </Link>
      </div>
    </header>
  );
}
