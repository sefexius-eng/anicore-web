"use client";

import Link from "next/link";
import {
  History,
  House,
  Tv2,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface NavigationItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "\u0413\u043b\u0430\u0432\u043d\u0430\u044f",
    Icon: House,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/feed",
    label: "\u041f\u043e\u0434\u043f\u0438\u0441\u043a\u0438",
    Icon: Tv2,
    isActive: (pathname) => pathname.startsWith("/feed"),
  },
  {
    href: "/users",
    label: "\u041b\u044e\u0434\u0438",
    Icon: Users,
    isActive: (pathname) =>
      pathname.startsWith("/users") || pathname.startsWith("/user/"),
  },
  {
    href: "/history",
    label: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f",
    Icon: History,
    isActive: (pathname) => pathname.startsWith("/history"),
  },
  {
    href: "/profile",
    label: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c",
    Icon: User,
    isActive: (pathname) => pathname.startsWith("/profile"),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="sticky top-[72px] z-40 hidden h-[calc(100vh-72px)] w-[72px] flex-shrink-0 flex-col overflow-visible bg-transparent pb-8 pt-4 lg:flex">
        <nav
          aria-label="Основное меню"
          className="flex flex-1 flex-col items-center gap-1 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {navigationItems.map((item) => {
            const isActive = item.isActive(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex h-12 w-full items-center justify-center rounded-xl px-0 py-0 transition-colors",
                  isActive
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
              >
                <item.Icon className="size-5 shrink-0" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-950/95 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg shadow-black/30 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav
        aria-label="\u041c\u043e\u0431\u0438\u043b\u044c\u043d\u043e\u0435 \u043c\u0435\u043d\u044e"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-18px_40px_rgba(0,0,0,0.28)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-5 gap-1">
          {navigationItems.map((item) => {
            const isActive = item.isActive(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/65 hover:bg-white/5 hover:text-white",
                )}
              >
                <item.Icon className="size-5 shrink-0" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
