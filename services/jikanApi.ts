export interface AnimeShowcaseItem {
  id: number;
  title: string;
  image_url: string;
  score: number | null;
}

export interface AnimeDetailsItem extends AnimeShowcaseItem {
  synopsis: string;
}

interface JikanAnimeResponse {
  data: {
    mal_id: number;
    title: string;
    score: number | null;
    synopsis?: string | null;
    images?: {
      jpg?: {
        image_url?: string;
      };
      webp?: {
        image_url?: string;
      };
    };
  };
}

const JIKAN_API_BASE_URL = "https://api.jikan.moe/v4";
const FALLBACK_POSTER =
  "https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png";

function resolvePosterUrl(payload: JikanAnimeResponse["data"]): string {
  return (
    payload.images?.webp?.image_url ??
    payload.images?.jpg?.image_url ??
    FALLBACK_POSTER
  );
}

async function fetchAnimePayload(id: number): Promise<JikanAnimeResponse["data"]> {
  const response = await fetch(`${JIKAN_API_BASE_URL}/anime/${id}`, {
    method: "GET",
    next: {
      revalidate: 60 * 60,
    },
  });

  if (!response.ok) {
    throw new Error(`Jikan API request failed for ID ${id}: ${response.status}`);
  }

  const payload = (await response.json()) as JikanAnimeResponse;
  return payload.data;
}

export async function getAnimeById(id: number): Promise<AnimeShowcaseItem> {
  const payload = await fetchAnimePayload(id);

  return {
    id: payload.mal_id,
    title: payload.title,
    image_url: resolvePosterUrl(payload),
    score: payload.score,
  };
}

export async function getAnimeDetailsById(
  id: number,
): Promise<AnimeDetailsItem> {
  const payload = await fetchAnimePayload(id);

  return {
    id: payload.mal_id,
    title: payload.title,
    image_url: resolvePosterUrl(payload),
    score: payload.score,
    synopsis: payload.synopsis?.trim() || "Синопсис временно недоступен.",
  };
}
