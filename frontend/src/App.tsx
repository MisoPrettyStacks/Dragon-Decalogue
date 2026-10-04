import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { FeatureInputs } from "./components/FeatureInputs";
import { ForecastReport } from "./components/ForecastReport";
import { FEATURE_DEFAULTS, type Features } from "./lib/math";
import {
  fetchCalibration,
  fetchDecalogue,
  previewForecast,
  type CalibrationReport,
  type Commandment,
  type PreviewResult,
} from "./lib/api";
import {
  deleteForecast,
  listForecasts,
  saveForecast,
  type SavedForecast,
} from "./lib/storage";

export default function App() {
  const [forecasts, setForecasts] = useState<SavedForecast[]>(() => listForecasts());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [features, setFeatures] = useState<Features>({ ...FEATURE_DEFAULTS });
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [rawUsed, setRawUsed] = useState<Features>({ ...FEATURE_DEFAULTS });
  const [questionUsed, setQuestionUsed] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<CalibrationReport | null>(null);
  const [commandments, setCommandments] = useState<Commandment[]>([]);

  useEffect(() => {
    fetchCalibration().then(setCalibration).catch(() => {});
    fetchDecalogue().then(setCommandments).catch(() => {});
  }, []);

  const activeForecast = activeId ? forecasts.find((f) => f.id === activeId) : null;
  const shown = activeForecast
    ? { question: activeForecast.question, features: activeForecast.features, result: activeForecast.result }
    : result
      ? { question: questionUsed, features: rawUsed, result }
      : null;

  function handleNew() {
    setActiveId(null);
    setQuestion("");
    setFeatures({ ...FEATURE_DEFAULTS });
    setResult(null);
    setError(null);
  }

  function handleSelect(id: string) {
    setActiveId(id);
    setResult(null);
    setError(null);
    setIsWorking(false);
  }

  function handleDelete(id: string) {
    deleteForecast(id);
    setForecasts(listForecasts());
    if (activeId === id) handleNew();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isWorking) return;
    setActiveId(null);
    setResult(null);
    setError(null);
    setIsWorking(true);
    try {
      const r = await previewForecast(features);
      const record: SavedForecast = {
        id: crypto.randomUUID(),
        question: trimmed,
        features: { ...features },
        result: r,
        createdAt: new Date().toISOString(),
      };
      saveForecast(record);
      setForecasts(listForecasts());
      setActiveId(record.id);
      setRawUsed({ ...features });
      setQuestionUsed(trimmed);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Forecast failed.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white font-mono text-ink">
      <Sidebar
        forecasts={forecasts}
        activeId={activeId}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onNew={handleNew}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <form onSubmit={handleSubmit} className="border-b-4 border-ink p-5">
          <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide">
            Ask a specific, resolvable question
          </label>
          <div className="flex gap-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Will the Fed cut rates at its next meeting?"
              className="flex-1 border-2 border-ink px-3 py-2 font-mono text-sm outline-none focus:border-magenta"
              disabled={isWorking}
            />
            <button
              type="submit"
              disabled={isWorking || !question.trim()}
              className="border-2 border-ink bg-magenta px-5 py-2 text-sm font-extrabold uppercase text-white shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isWorking ? "Crunching…" : "Forecast"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-magenta">{error}</p>}
          {!activeId && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-gray-500">
                Feature vector — the eight inputs every agent reads
              </p>
              <FeatureInputs features={features} onChange={setFeatures} disabled={isWorking} />
            </div>
          )}
        </form>

        <div className="flex-1 overflow-y-auto p-6">
          {!shown && !isWorking && (
            <div className="mx-auto max-w-lg border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
              Set the eight features above, ask a question, and hit Forecast — every calculation,
              from feature clamping to the final sigmoid, will be shown step by step. Or pick a
              past forecast from the sidebar.
            </div>
          )}
          {isWorking && (
            <div className="mx-auto max-w-lg border-2 border-ink bg-white p-6 text-center shadow-hard">
              <p className="text-sm font-extrabold uppercase">
                Running 8 agents<span className="animate-pulse text-magenta">…</span>
              </p>
            </div>
          )}
          {shown && (
            <ForecastReport
              question={shown.question}
              rawFeatures={shown.features}
              result={shown.result}
              calibration={calibration}
              commandments={commandments}
            />
          )}
        </div>
      </main>
    </div>
  );
}
