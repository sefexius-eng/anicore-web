"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function NavbarSignOutButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 gap-2 px-3"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <LogOut className="size-4" />
      <span>Выйти</span>
    </Button>
  );
}
