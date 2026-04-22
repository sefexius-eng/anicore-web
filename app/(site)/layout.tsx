import type { ReactNode } from "react";

import { Footer } from "@/components/shared/footer";
import { NavbarShell } from "@/components/shared/navbar";

interface SiteLayoutProps {
  children: ReactNode;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_45%),radial-gradient(circle_at_80%_20%,_rgba(99,102,241,0.2),_transparent_42%),radial-gradient(circle_at_20%_90%,_rgba(14,165,233,0.16),_transparent_45%)]" />

      <NavbarShell />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  );
}
