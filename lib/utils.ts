import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const IMAGE_PLACEHOLDER_URL =
  "https://placehold.co/225x320/1a1a1a/ffffff?text=No+Image";

type ImageLike =
  | string
  | {
      original?: string | null;
      preview?: string | null;
      url?: string | null;
      x160?: string | null;
    }
  | null
  | undefined;

export function getImageUrl(img: ImageLike) {
  if (!img) {
    return IMAGE_PLACEHOLDER_URL;
  }

  const path =
    typeof img === "string"
      ? img
      : img?.original || img?.preview || img?.url || img?.x160;

  if (!path) {
    return IMAGE_PLACEHOLDER_URL;
  }

  if (path.startsWith("http")) {
    return path;
  }

  return `https://desu.shikimori.one${path}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
