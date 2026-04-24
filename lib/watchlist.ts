export const WATCHLIST_STATUS_VALUES = [
  "WATCHING",
  "PLANNED",
  "COMPLETED",
  "DROPPED",
] as const;

export type WatchlistStatus = (typeof WATCHLIST_STATUS_VALUES)[number];

export const WATCHLIST_STATUS_LABELS: Record<WatchlistStatus, string> = {
  WATCHING: "Смотрю",
  PLANNED: "В планах",
  COMPLETED: "Просмотрено",
  DROPPED: "Брошено",
};

export const WATCHLIST_OPTIONS = WATCHLIST_STATUS_VALUES.map((status) => ({
  status,
  label: WATCHLIST_STATUS_LABELS[status],
}));

export function isWatchlistStatus(value: unknown): value is WatchlistStatus {
  return (
    typeof value === "string" &&
    WATCHLIST_STATUS_VALUES.includes(value as WatchlistStatus)
  );
}
