import type { Features } from "./math";
import type { PreviewResult } from "./api";

export interface SavedForecast {
  id: string;
  question: string;
  features: Features;
  result: PreviewResult;
  createdAt: string;
}

const KEY = "dragon-decalogue-forecasts-v1";

export function listForecasts(): SavedForecast[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedForecast[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: SavedForecast[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function saveForecast(f: SavedForecast) {
  const items = listForecasts();
  items.unshift(f);
  writeAll(items.slice(0, 200));
}

export function deleteForecast(id: string) {
  writeAll(listForecasts().filter((f) => f.id !== id));
}
