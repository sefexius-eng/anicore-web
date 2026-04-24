"use client";

/* eslint-disable @next/next/no-img-element */
import type { ChangeEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const AVATAR_PLACEHOLDER =
  "https://placehold.co/160x160/111827/ffffff?text=Avatar";
const MAX_AVATAR_FILE_SIZE = 1_500_000;

interface AvatarUploadProps {
  currentImage?: string | null;
  userName: string;
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
  userName,
}: AvatarUploadProps) {
  const router = useRouter();
  const [previewSrc, setPreviewSrc] = useState(
    currentImage || AVATAR_PLACEHOLDER,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    setStatusMessage("Сохраняем аватар...");

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
      setPreviewSrc(currentImage || AVATAR_PLACEHOLDER);
      setStatusMessage(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось сохранить аватар.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-sm">
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Аватар профиля
          </h2>
          <p className="text-sm text-muted-foreground">
            Выберите изображение, и мы сохраним его прямо в профиль.
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <img
            src={previewSrc}
            alt={userName}
            className="size-28 rounded-full border border-border/70 object-cover shadow-lg"
            referrerPolicy="no-referrer"
          />

          <div className="space-y-3">
            <label
              htmlFor="avatar"
              className="inline-flex cursor-pointer items-center rounded-xl border border-border/70 bg-background/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {isUploading ? "Загружаем..." : "Выбрать изображение"}
            </label>
            <input
              id="avatar"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isUploading}
            />

            <p className="text-xs text-muted-foreground">
              Поддерживаются PNG, JPG и WEBP до 1.5 МБ.
            </p>

            {statusMessage ? (
              <p className="text-sm text-foreground">{statusMessage}</p>
            ) : null}

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
