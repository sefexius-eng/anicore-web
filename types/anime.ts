export interface AnimeTitle {
  id: string;
  slug: string;
  title: string;
  poster: string;
  year: number;
  episodes: number;
  score: number;
  genres: string[];
}

export interface AnimeListResponse {
  items: AnimeTitle[];
  total: number;
}
