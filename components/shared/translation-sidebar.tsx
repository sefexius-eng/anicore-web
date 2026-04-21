"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type TranslationType = "voice" | "subtitles";

export interface TranslationOption {
  id: number;
  title: string;
  type: TranslationType;
}

interface TranslationSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translations: TranslationOption[];
  activeTranslationId: number | null;
  onSelectTranslation: (translationId: number) => void;
}

export function TranslationSidebar({
  open,
  onOpenChange,
  translations,
  activeTranslationId,
  onSelectTranslation,
}: TranslationSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[min(24rem,calc(100vw-1.5rem))] rounded-l-2xl border-l border-neutral-800 bg-neutral-900/95 p-0 text-neutral-100 backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <SheetTitle className="text-base font-semibold tracking-wide text-neutral-100">
            Выбор озвучки
          </SheetTitle>

          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-neutral-300 hover:bg-neutral-800 hover:text-white"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Закрыть</span>
          </SheetClose>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {translations.length > 0 ? (
            <div className="space-y-2">
              {translations.map((translation) => (
                <button
                  key={`${translation.type}-${translation.id}-${translation.title}`}
                  type="button"
                  onClick={() => onSelectTranslation(translation.id)}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                    activeTranslationId === translation.id
                      ? "border-cyan-400 bg-cyan-500/15 text-white"
                      : "border-neutral-800 bg-neutral-950/80 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800/80",
                  )}
                >
                  <p className="text-sm font-medium leading-tight">{translation.title}</p>
                  <p className="mt-1 text-[0.65rem] font-semibold tracking-[0.14em] text-neutral-400 uppercase">
                    {translation.type === "voice" ? "Озвучка" : "Субтитры"}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 text-sm text-neutral-400">
              Для этого тайтла список озвучек пока недоступен.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
