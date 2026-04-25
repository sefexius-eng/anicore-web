"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

import { UserAvatar } from "@/components/shared/user-avatar";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

interface UserDropdownProps {
  name?: string | null;
  email?: string | null;
}

export function UserDropdown({ name, email }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const userName = name?.trim() || email?.trim() || "Профиль";
  const userEmail = email?.trim() || "Email не указан";

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  useOnClickOutside(dropdownRef, closeDropdown, isOpen);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((current) => !current);
  };

  const handleSignOut = () => {
    setIsOpen(false);
    void signOut({ callbackUrl: "/" });
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Открыть меню профиля"
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={handleToggle}
      >
        <UserAvatar userLabel={userName} />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-[#3f3f3f] bg-[#282828] py-2 shadow-lg">
          <div className="px-4 py-2">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="truncate text-xs text-[#b3b3b3]">{userEmail}</p>
          </div>

          <hr className="my-2 border-[#3f3f3f]" />

          <Link
            href="/profile"
            className="block px-4 py-2 text-sm text-white transition-colors hover:bg-[#3a3a3a]"
            onClick={closeDropdown}
          >
            Мой профиль
          </Link>

          <Link
            href="/notifications"
            className="block px-4 py-2 text-sm text-white transition-colors hover:bg-[#3a3a3a]"
            onClick={closeDropdown}
          >
            Уведомления
          </Link>

          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-sm text-white transition-colors hover:bg-[#3a3a3a]"
            onClick={handleSignOut}
          >
            Выйти
          </button>
        </div>
      ) : null}
    </div>
  );
}
