import Link from "next/link";
import { Activity, LogIn, Users } from "lucide-react";

import { NavbarSearch } from "@/components/shared/navbar-search";
import { UserDropdown } from "@/components/shared/user-dropdown";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export async function NavbarShell() {
  const session = await auth();
  const communityLinks = [
    {
      href: "/feed",
      label: "Лента",
      Icon: Activity,
    },
    {
      href: "/users",
      label: "Люди",
      Icon: Users,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0f0f0f]">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 bg-[#0f0f0f] px-4 py-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-2xl font-black tracking-tighter text-transparent transition-opacity hover:opacity-85"
          >
            AniMirok
          </Link>

          <nav className="flex items-center gap-1">
            {communityLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-9 rounded-full px-3 text-slate-200 hover:bg-white/5 hover:text-white",
                )}
              >
                <link.Icon className="size-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            ))}
          </nav>
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
