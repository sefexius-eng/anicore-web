import type { AnimeListResponse } from "@/types/anime";

const API_BASE_URL = "https://api.example.com/anime";

export async function getPopularAnime(): Promise<AnimeListResponse> {
  // Заглушка до интеграции с реальным API.
  void API_BASE_URL;

  return {
    items: [],
    total: 0,
  };
}
