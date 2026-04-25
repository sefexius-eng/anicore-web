"use client";

/* eslint-disable @next/next/no-img-element */
import type { ChangeEvent } from "react";
import { useState } from "react";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

const AVATAR_PLACEHOLDER =
  "/default-avatar.jpg";
const MAX_AVATAR_FILE_SIZE = 1_500_000;

interface AvatarUploadProps {
  currentImage?: string | null;
  fallbackImage?: string;
  userName: string;
  className?: string;
  avatarClassName?: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Не удалось прочитать файл."));
    };

    reader.onerror = () => {
      reject(new Error("Не удалось прочитать файл."));
    };

    reader.readAsDataURL(file);
  });
}

export function AvatarUpload({
  currentImage,
  fallbackImage,
  userName,
  className,
  avatarClassName,
}: AvatarUploadProps) {
  const router = useRouter();
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const avatarSrc = previewSrc ?? currentImage ?? fallbackImage ?? AVATAR_PLACEHOLDER;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Выберите изображение в формате PNG, JPG или WEBP.");
      setStatusMessage(null);
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setErrorMessage("Файл слишком большой. Используйте изображение до 1.5 МБ.");
      setStatusMessage(null);
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage("Сохраняем...");

    try {
      const image = await readFileAsDataUrl(file);
      setPreviewSrc(image);

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Не удалось сохранить аватар.");
      }

      setStatusMessage("Аватар обновлен.");
      window.dispatchEvent(new Event("anicore:user-avatar-updated"));
      router.refresh();
    } catch (error) {
      setPreviewSrc(null);
      setStatusMessage(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось сохранить аватар.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <label
        className={cn(
          "group relative block cursor-pointer overflow-hidden rounded-full border-4 border-[#0f0f0f] shadow-[0_24px_50px_rgba(0,0,0,0.45)]",
          avatarClassName,
          isUploading && "cursor-wait",
        )}
      >
        <img
          src={avatarSrc}
          alt={userName}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />

        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity duration-200",
            isUploading
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          <Camera className="size-8 text-white sm:size-9" />
        </div>

        <span className="sr-only">Изменить аватар</span>
      </label>

      {statusMessage ? (
        <p className="max-w-40 text-center text-xs font-medium text-slate-200">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="max-w-40 text-center text-xs font-medium text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
