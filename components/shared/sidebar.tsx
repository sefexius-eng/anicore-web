"use client";

import Link from "next/link";
import { House, Tv2, User, Users, type LucideIcon } from "lucide-react";
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
    href: "/profile",
    label: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c",
    Icon: User,
    isActive: (pathname) => pathname.startsWith("/profile"),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 md:w-64">
      <div className="rounded-[28px] border border-white/10 bg-[#111111]/95 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm md:sticky md:top-[5.5rem] md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
        <div className="px-3 pb-3 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            \u041d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f
          </p>
        </div>

        <nav
          aria-label="\u041e\u0441\u043d\u043e\u0432\u043d\u043e\u0435 \u043c\u0435\u043d\u044e"
          className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible"
        >
          {navigationItems.map((item) => {
            const isActive = item.isActive(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-[10.5rem] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all md:min-w-0",
                  isActive
                    ? "bg-white text-black shadow-[0_12px_30px_rgba(255,255,255,0.12)]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <item.Icon className="size-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
