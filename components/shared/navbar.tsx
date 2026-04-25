import Link from "next/link";
import { User } from "lucide-react";

import { NavbarSearch } from "@/components/shared/navbar-search";
import { UserDropdown } from "@/components/shared/user-dropdown";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export async function NavbarShell() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-sm">
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center">
          <Link
            href="/"
            className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-2xl font-black tracking-tighter text-transparent transition-opacity hover:opacity-85"
          >
            AniMirok
          </Link>
        </div>

        <div className="flex min-w-0 justify-center">
          <NavbarSearch />
        </div>

        <div className="flex shrink-0 items-center justify-end">
          {session ? (
            <UserDropdown
              name={session.user?.name ?? null}
              email={session.user?.email ?? null}
            />
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
