import type { SavedForecast } from "../lib/storage";
import { pct } from "../lib/math";

interface Props {
  forecasts: SavedForecast[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function Sidebar({ forecasts, activeId, onSelect, onDelete, onNew }: Props) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col bg-ink text-white">
      <div className="border-b-4 border-lime p-4">
        <h1 className="text-sm font-extrabold uppercase leading-tight tracking-wide text-lime">
          Dragon
          <br />
          Decalogue
        </h1>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-400">
          Forecasting Engine
        </p>
      </div>

      <button
        onClick={onNew}
        className="m-3 border-2 border-lime px-3 py-2 text-left text-xs font-extrabold uppercase tracking-wide text-lime hover:bg-lime hover:text-ink"
      >
        + New Forecast
      </button>

      <div className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-3">
        {forecasts.length === 0 && (
          <p className="mt-4 px-1 text-xs text-gray-500">No forecasts yet.</p>
        )}
        <ul className="space-y-2">
          {forecasts.map((f) => (
            <li key={f.id}>
              <div
                className={`group flex cursor-pointer items-start justify-between gap-2 border-2 px-2 py-2 text-xs ${
                  activeId === f.id
                    ? "border-magenta bg-white/10"
                    : "border-transparent hover:border-gray-600"
                }`}
                onClick={() => onSelect(f.id)}
              >
                <div className="min-w-0">
                  <p className="line-clamp-2 font-semibold">{f.question}</p>
                  <p className="mt-1 text-[10px] text-lime">{pct(f.result.probability)}</p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(f.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(f.id);
                  }}
                  className="shrink-0 text-gray-500 opacity-0 hover:text-magenta group-hover:opacity-100"
                  aria-label="Delete forecast"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t-2 border-gray-700 px-4 py-3 text-[10px] uppercase tracking-wide text-gray-500">
        8 lenses · log-odds pooling
        <br />
        brier goal 0.075–0.085
      </div>
    </aside>
  );
}
