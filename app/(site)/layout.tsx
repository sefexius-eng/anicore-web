import type { ReactNode } from "react";

import { Footer } from "@/components/shared/footer";
import { NavbarShell } from "@/components/shared/navbar";
import { Sidebar } from "@/components/shared/sidebar";

interface SiteLayoutProps {
  children: ReactNode;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_45%),radial-gradient(circle_at_80%_20%,_rgba(99,102,241,0.2),_transparent_42%),radial-gradient(circle_at_20%_90%,_rgba(14,165,233,0.16),_transparent_45%)]" />

      <NavbarShell />

      <div className="flex flex-1 items-start">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-[1336px] flex-1 flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
            <main className="min-w-0 flex-1">{children}</main>
            <div className="pt-10">
              <Footer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
