import Link from "next/link";
import { Bell, User } from "lucide-react";

import { NavbarSearch } from "@/components/shared/navbar-search";
import { UserDropdown } from "@/components/shared/user-dropdown";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export async function NavbarShell() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 h-[72px] border-b border-white/5 bg-background/95 backdrop-blur">
      <div className="grid h-full w-full grid-cols-[1fr_minmax(0,720px)_1fr] items-center gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center justify-start">
          <Link
            href="/"
            className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-2xl font-black tracking-tighter text-transparent transition-opacity hover:opacity-85"
          >
            AniMirok
          </Link>
        </div>

        <div className="flex min-w-0 items-center justify-center">
          <NavbarSearch />
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          {session ? (
            <>
              <Link
                href="/notifications"
                aria-label="\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-lg" }),
                  "rounded-full border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10 hover:text-white",
                )}
              >
                <Bell className="size-5" />
              </Link>

              <UserDropdown
                name={session.user?.name ?? null}
                email={session.user?.email ?? null}
              />
            </>
          ) : (
            <Link
              href="/login?callbackUrl=/"
              aria-label="\u0412\u043e\u0439\u0442\u0438"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-lg" }),
                "rounded-full border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10 hover:text-white",
              )}
            >
              <User className="size-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
