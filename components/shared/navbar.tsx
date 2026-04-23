/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { History, LogIn, User } from "lucide-react";

import { NavbarSearch } from "@/components/shared/navbar-search";
import { NavbarSignOutButton } from "@/components/shared/navbar-signout-button";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export async function NavbarShell() {
  const session = await auth();
  const userLabel =
    session?.user?.name?.trim() || session?.user?.email?.trim() || "Профиль";
  const avatarSrc = session?.user?.image?.trim() || null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="order-1 shrink-0 text-xl font-semibold tracking-tight text-foreground transition-opacity hover:opacity-85"
        >
          AniCore.me
        </Link>

        <NavbarSearch />

        <div className="order-2 ml-auto flex items-center gap-4 sm:order-3">
          <Link
            href="/history"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 gap-2 px-3",
            )}
          >
            <History className="size-4" />
            <span>История</span>
          </Link>

          {session ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/70"
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={userLabel}
                    className="size-8 rounded-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-background/80">
                    <User className="size-4 text-muted-foreground" />
                  </span>
                )}
                <span className="hidden max-w-44 truncate md:inline">{userLabel}</span>
              </Link>
              <NavbarSignOutButton />
            </div>
          ) : (
            <Link
              href="/login?callbackUrl=/"
              className={cn(
                buttonVariants({ variant: "default" }),
                "h-10 gap-2 px-3",
              )}
            >
              <LogIn className="size-4" />
              <span>Войти</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
