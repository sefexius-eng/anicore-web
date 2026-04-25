"use client";

import Link from "next/link";
import { History, House, Tv2, User, Users, type LucideIcon } from "lucide-react";
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
    <aside className="sticky top-[72px] flex h-[calc(100vh-72px)] w-64 flex-shrink-0 flex-col overflow-y-auto bg-transparent pb-8 pt-4">
      <nav
        aria-label="\u041e\u0441\u043d\u043e\u0432\u043d\u043e\u0435 \u043c\u0435\u043d\u044e"
        className="flex flex-1 flex-col gap-1 px-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {navigationItems.map((item) => {
          const isActive = item.isActive(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors",
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.Icon className="size-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
