export const WATCH_HISTORY_STORAGE_KEY = "anicore_history";
export const WATCH_HISTORY_UPDATED_EVENT = "anicore:watch-history-updated";
const MAX_HISTORY_ITEMS = 50;

export interface WatchHistoryItem {
  id: number;
  name: string;
  image: string;
  timestamp: number;
}

function isWatchHistoryItem(value: unknown): value is WatchHistoryItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Partial<WatchHistoryItem>;

  return (
    typeof item.id === "number" &&
    Number.isInteger(item.id) &&
    item.id > 0 &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item.image === "string" &&
    item.image.trim().length > 0 &&
    typeof item.timestamp === "number" &&
    Number.isFinite(item.timestamp)
  );
}

function normalizeHistory(items: unknown): WatchHistoryItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const deduplicatedItems = new Map<number, WatchHistoryItem>();

  for (const value of items) {
    if (!isWatchHistoryItem(value)) {
      continue;
    }

    const existingItem = deduplicatedItems.get(value.id);

    if (!existingItem || value.timestamp > existingItem.timestamp) {
      deduplicatedItems.set(value.id, value);
    }
  }

  return Array.from(deduplicatedItems.values())
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, MAX_HISTORY_ITEMS);
}

function notifyWatchHistoryUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(WATCH_HISTORY_UPDATED_EVENT));
}

function persistWatchHistory(items: WatchHistoryItem[]): WatchHistoryItem[] {
  if (typeof window === "undefined") {
    return items;
  }

  const normalizedItems = normalizeHistory(items);

  window.localStorage.setItem(
    WATCH_HISTORY_STORAGE_KEY,
    JSON.stringify(normalizedItems),
  );
  notifyWatchHistoryUpdated();

  return normalizedItems;
}

export function readWatchHistory(): WatchHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawHistory = window.localStorage.getItem(WATCH_HISTORY_STORAGE_KEY);

    if (!rawHistory) {
      return [];
    }

    return normalizeHistory(JSON.parse(rawHistory));
  } catch {
    return [];
  }
}

export function addToWatchHistory(item: WatchHistoryItem): WatchHistoryItem[] {
  const nextItems = [
    item,
    ...readWatchHistory().filter((historyItem) => historyItem.id !== item.id),
  ];

  return persistWatchHistory(nextItems);
}

export function clearWatchHistory() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(WATCH_HISTORY_STORAGE_KEY);
  notifyWatchHistoryUpdated();
}
