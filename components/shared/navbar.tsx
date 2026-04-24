import Link from "next/link";
import { LogIn } from "lucide-react";

import { NavbarSearch } from "@/components/shared/navbar-search";
import { UserDropdown } from "@/components/shared/user-dropdown";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export async function NavbarShell() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 bg-[#0f0f0f]">
      <div className="flex items-center justify-between gap-4 bg-[#0f0f0f] px-4 py-2">
        <div className="flex w-32 shrink-0 items-center">
          <Link
            href="/"
            className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-2xl font-black tracking-tighter text-transparent transition-opacity hover:opacity-85"
          >
            AniMirok
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 justify-center">
          <NavbarSearch />
        </div>

        <div className="flex w-32 shrink-0 items-center justify-end">
          {session ? (
            <UserDropdown
              name={session.user?.name ?? null}
              email={session.user?.email ?? null}
            />
          ) : (
            <Link
              href="/login?callbackUrl=/"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "h-9 gap-2 rounded-full bg-white px-4 text-sm font-medium text-black hover:bg-zinc-200",
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
