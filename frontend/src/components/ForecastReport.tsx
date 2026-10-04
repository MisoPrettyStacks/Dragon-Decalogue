import { useMemo } from "react";
import {
  agentWorkings,
  fmt,
  pct,
  sigmoid,
  type Features,
} from "../lib/math";
import type {
  CalibrationReport,
  Commandment,
  PreviewResult,
} from "../lib/api";

/** Highlight numbers inside a math line. */
function MathLine({ text }: { text: string }) {
  const parts = text.split(/(-?\d+(?:\.\d+)?)/g);
  return (
    <div className="mathline">
      {parts.map((part, i) =>
        /^-?\d+(\.\d+)?$/.test(part) ? (
          <span key={i} className="num">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
}

interface Props {
  question: string;
  rawFeatures: Features;
  result: PreviewResult;
  calibration: CalibrationReport | null;
  commandments: Commandment[];
}

export function ForecastReport({ question, rawFeatures, result, calibration, commandments }: Props) {
  const workings = useMemo(
    () => agentWorkings(result.features as unknown as Features),
    [result]
  );
  const workByKey = useMemo(() => Object.fromEntries(workings.map((w) => [w.key, w])), [workings]);

  const probs = result.breakdown.map((b) => b.probability);
  const maxP = Math.max(...probs);
  const minP = Math.min(...probs);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Question */}
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Question</p>
      <h2 className="mt-1 text-lg font-extrabold leading-snug">{question}</h2>

      {/* Final forecast */}
      <h3 className="report-h2">Final Forecast</h3>
      <div className="border-2 border-ink bg-white p-5 shadow-hard">
        <p>
          <span className="pill text-2xl">{pct(result.probability)}</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="border-2 border-ink p-2">
            <p className="font-extrabold uppercase text-gray-500">Probability</p>
            <p className="mt-1 text-base font-bold text-magenta">{fmt(result.probability)}</p>
          </div>
          <div className="border-2 border-ink p-2">
            <p className="font-extrabold uppercase text-gray-500">Confidence</p>
            <p className="mt-1 text-base font-bold">{fmt(result.confidence)}</p>
          </div>
          <div className="border-2 border-ink p-2">
            <p className="font-extrabold uppercase text-gray-500">Disagreement</p>
            <p className="mt-1 text-base font-bold">
              {fmt(result.disagreement)}{" "}
              <span className="text-[10px] font-normal text-gray-500">
                (max {fmt(maxP)} − min {fmt(minP)})
              </span>
            </p>
          </div>
          <div className="border-2 border-ink p-2">
            <p className="font-extrabold uppercase text-gray-500">Agents pooled</p>
            <p className="mt-1 text-base font-bold">8 / 8</p>
          </div>
        </div>
      </div>

      {/* Step 0 — normalization */}
      <h3 className="report-h2">Step 0 · Normalize features</h3>
      <div className="border-2 border-ink bg-white p-5 shadow-hard">
        <p className="mb-3 text-xs text-gray-600">
          Raw inputs are clamped into their legal ranges before any agent sees them.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-ink text-left text-white">
              <th className="px-2 py-1">Feature</th>
              <th className="px-2 py-1">You entered</th>
              <th className="px-2 py-1">Normalized</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(rawFeatures).map((k) => {
              const raw = (rawFeatures as unknown as Record<string, number>)[k];
              const norm = result.features[k];
              const changed = Math.abs(raw - norm) > 1e-12;
              return (
                <tr key={k} className="border-b border-gray-200">
                  <td className="px-2 py-1 font-bold">{k}</td>
                  <td className="px-2 py-1">{fmt(raw, 4)}</td>
                  <td className={`px-2 py-1 font-bold ${changed ? "text-magenta" : ""}`}>
                    {fmt(norm, 4)}
                    {changed && " ← clamped"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Step 1 — agents */}
      <h3 className="report-h2">Step 1 · The eight agents</h3>
      <p className="mb-3 text-xs text-gray-600">
        Each lens is a deterministic function of the feature vector. Every intermediate value is
        shown — nothing hidden.
      </p>
      <div className="space-y-4">
        {result.breakdown.map((b) => {
          const work = workByKey[b.agent];
          return (
            <div key={b.agent} className="border-2 border-ink bg-white p-5 shadow-hard-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-extrabold uppercase">
                  {b.label} <span className="text-magenta">· {b.lens}</span>
                </p>
                <span className="pill text-sm">{pct(b.probability)}</span>
              </div>
              <p className="mt-1 text-xs italic text-gray-600">{b.rationale}</p>
              <p className="mt-2 border-2 border-dashed border-gray-300 bg-gray-50 px-2 py-1 text-xs">
                formula: <span className="font-bold">{b.formula}</span>
              </p>
              <div className="mt-3 border-t-2 border-ink pt-2">
                {work?.lines.map((line, i) => <MathLine key={i} text={line} />)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="bg-ink px-2 py-1 text-white">
                  p = <span className="font-bold text-lime">{fmt(b.probability)}</span>
                </div>
                <div className="bg-ink px-2 py-1 text-white">
                  logit = <span className="font-bold text-lime">{fmt(b.logit)}</span>
                </div>
                <div className="bg-ink px-2 py-1 text-white">
                  weight = <span className="font-bold text-lime">{fmt(b.weight, 4)}</span>
                </div>
                <div className="bg-ink px-2 py-1 text-white">
                  contrib = <span className="font-bold text-lime">{fmt(b.contribution)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 2 — pooling */}
      <h3 className="report-h2">Step 2 · Pool in log-odds space</h3>
      <div className="border-2 border-ink bg-white p-5 shadow-hard">
        <p className="mb-2 text-xs text-gray-600">
          Weighted average of the eight log-odds. Each term is weight × logit(p):
        </p>
        {result.breakdown.map((b) => (
          <MathLine
            key={b.agent}
            text={`${b.label}: ${fmt(b.weight, 4)} × ${fmt(b.logit)} = ${fmt(b.contribution)}`}
          />
        ))}
        <div className="mt-3 border-t-2 border-magenta pt-2">
          <MathLine
            text={`pooled_logit = Σ = ${fmt(result.pooled_logit)}`}
          />
        </div>
      </div>

      {/* Step 3 — extremize */}
      <h3 className="report-h2">Step 3 · Extremize</h3>
      <div className="border-2 border-ink bg-white p-5 shadow-hard">
        <p className="mb-2 text-xs text-gray-600">
          Crowds are underconfident on average — multiply the pooled log-odds by the tuned
          extremizing exponent (a-extremization):
        </p>
        <MathLine
          text={`extremized = ${fmt(result.extremizing_exponent, 2)} × ${fmt(result.pooled_logit)} = ${fmt(result.extremized_logit)}`}
        />
      </div>

      {/* Step 4 — calibrate */}
      <h3 className="report-h2">Step 4 · Calibrate</h3>
      <div className="border-2 border-ink bg-white p-5 shadow-hard">
        <p className="mb-2 text-xs text-gray-600">
          Linear recalibration fitted on the 200-question benchmark:
        </p>
        <MathLine
          text={`calibrated = ${fmt(result.calibration_slope, 4)} × ${fmt(result.extremized_logit)} + ${fmt(result.calibration_intercept, 4)} = ${fmt(result.calibrated_logit)}`}
        />
      </div>

      {/* Step 5 — sigmoid */}
      <h3 className="report-h2">Step 5 · Back to probability</h3>
      <div className="border-2 border-ink bg-white p-5 shadow-hard">
        <MathLine text={`σ(${fmt(result.calibrated_logit)}) = ${fmt(sigmoid(result.calibrated_logit))}`} />
        <p className="mt-3 text-xs text-gray-600">
          Clamped to [0.01, 0.99]. Disagreement = spread of the eight agents ={" "}
          {fmt(result.disagreement)} → confidence = 1 − spread = {fmt(result.confidence)}.
        </p>
        <p className="mt-4">
          <span className="pill text-xl">FINAL: {pct(result.probability)}</span>
        </p>
      </div>

      {/* Calibration report */}
      {calibration && (
        <>
          <h3 className="report-h2">Benchmark calibration</h3>
          <div className="border-2 border-ink bg-white p-5 shadow-hard">
            <p className="mb-3 text-xs text-gray-600">
              Scored on {calibration.n_questions} reproducible benchmark questions (seed{" "}
              {calibration.seed}):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {[
                ["Brier score", fmt(calibration.brier_score)],
                ["Target band", `${calibration.target_band[0]}–${calibration.target_band[1]}${calibration.within_target ? " ✓" : ""}`],
                ["Brier skill", fmt(calibration.brier_skill_score)],
                ["Log loss", fmt(calibration.log_loss)],
                ["Accuracy", pct(calibration.accuracy)],
                ["Climatology", fmt(calibration.climatology_brier)],
                ["Reliability", fmt(calibration.reliability)],
                ["Resolution", fmt(calibration.resolution)],
                ["Uncertainty", fmt(calibration.uncertainty)],
              ].map(([k, v]) => (
                <div key={k} className="border-2 border-ink p-2">
                  <p className="font-extrabold uppercase text-gray-500">{k}</p>
                  <p className="mt-1 font-bold">{v}</p>
                </div>
              ))}
            </div>
            <p className="mb-2 mt-5 text-xs font-extrabold uppercase">Per-agent solo Brier scores</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-ink text-left text-white">
                  <th className="px-2 py-1">Agent</th>
                  <th className="px-2 py-1">Weight</th>
                  <th className="px-2 py-1">Solo Brier</th>
                </tr>
              </thead>
              <tbody>
                {calibration.per_agent.map((a) => (
                  <tr key={a.agent} className="border-b border-gray-200">
                    <td className="px-2 py-1 font-bold">{a.agent}</td>
                    <td className="px-2 py-1">{a.weight.toFixed(4)}</td>
                    <td className="px-2 py-1">{fmt(a.brier)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Decalogue */}
      {commandments.length > 0 && (
        <>
          <h3 className="report-h2">The Decalogue</h3>
          <div className="space-y-3">
            {commandments.map((c) => (
              <div key={c.number} className="border-2 border-ink bg-white p-4 shadow-hard-sm">
                <p className="text-xs font-extrabold uppercase">
                  <span className="bg-magenta px-2 py-0.5 text-white">{c.number}</span>{" "}
                  <span className="ml-1">{c.title}</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed">{c.body}</p>
                <p className="mt-2 border-l-4 border-lime bg-gray-50 px-2 py-1 text-xs italic text-gray-700">
                  wired to the engine: {c.engine_hook}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
