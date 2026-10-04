// Plain-language reasoning generated deterministically from the real numbers.
// Every sentence below is grounded in the actual feature values and the
// backend's computed probabilities — no invented content.

import { fmt, pct, type Features } from "./math";
import type { PreviewResult } from "./api";

export function verdictWord(p: number): string {
  if (p < 0.1) return "VERY UNLIKELY";
  if (p < 0.25) return "UNLIKELY";
  if (p < 0.4) return "LEANING NO";
  if (p < 0.6) return "TOSS-UP";
  if (p < 0.75) return "LEANING YES";
  if (p < 0.9) return "LIKELY";
  return "VERY LIKELY";
}

function vsBase(p: number, base: number): string {
  if (p > base + 0.02) return "above";
  if (p < base - 0.02) return "below";
  return "about even with";
}

/** One or two plain sentences explaining what an agent saw and why it voted so. */
export function agentReasoning(key: string, f: Features, p: number): string {
  const base = f.base_rate;
  switch (key) {
    case "reference_class":
      return `The outside view, before any story is told: this kind of thing has happened ${pct(base)} of the time in the past. Every other lens has to argue against this anchor.`;
    case "trend_extrapolation":
      if (f.trend > 0.02)
        return `Momentum is positive (trend ${fmt(f.trend, 2)}), so the recent direction of travel pulls the forecast up from ${pct(base)} to ${pct(p)}.`;
      if (f.trend < -0.02)
        return `Momentum is negative (trend ${fmt(f.trend, 2)}), so the recent direction of travel drags the forecast down from ${pct(base)} to ${pct(p)}.`;
      return `There is no real momentum either way (trend ${fmt(f.trend, 2)}), so this lens barely moves off the base rate.`;
    case "bayesian_update":
      if (f.evidence_lr > 0.1)
        return `The evidence supports the claim (log-likelihood ratio ${fmt(f.evidence_lr, 2)}), lifting the odds from a ${pct(base)} prior to ${pct(p)}.`;
      if (f.evidence_lr < -0.1)
        return `The evidence counts against the claim (log-likelihood ratio ${fmt(f.evidence_lr, 2)}), cutting the odds from a ${pct(base)} prior to ${pct(p)}.`;
      return `The evidence is a wash (log-likelihood ratio ${fmt(f.evidence_lr, 2)}) — this lens performs almost no update.`;
    case "status_quo":
      if (f.status_quo_strength < 0.4)
        return `Inertia is weak here (status-quo strength ${fmt(f.status_quo_strength, 2)}), so the "nothing changes" anchor loosens and the forecast drifts to ${pct(p)}.`;
      if (f.status_quo_strength > 0.6)
        return `Inertia is strong (status-quo strength ${fmt(f.status_quo_strength, 2)}) — most things that could change don't, dragging the forecast toward the status quo at ${pct(p)}.`;
      return `Inertia is middling (status-quo strength ${fmt(f.status_quo_strength, 2)}), so the anchor barely tugs the forecast off ${pct(base)}.`;
    case "market_signal":
      return `The crowd's money prices this at ${pct(f.market_prob)} — ${vsBase(f.market_prob, base)} the ${pct(base)} base rate. Crowds are taken at face value, warts and all.`;
    case "expert_panel":
      return `Domain experts put this at ${pct(f.expert_prob)}, but inside views are overconfident by habit — so their judgment is shrunk 25% back toward the base rate, landing at ${pct(p)}.`;
    case "time_hazard":
      if (f.time_horizon_days > 120)
        return `A ${Math.round(f.time_horizon_days)}-day window gives the event far longer to fire than the 90-day reference window, which is why the longer horizon pushes this lens up to ${pct(p)}.`;
      if (f.time_horizon_days < 60)
        return `Only ${Math.round(f.time_horizon_days)} days for the event to fire — much less time than the 90-day reference — so the short horizon holds this lens down at ${pct(p)}.`;
      return `The horizon (${Math.round(f.time_horizon_days)} days) is close to the 90-day reference window, so time alone barely moves this lens off ${pct(p)}.`;
    case "volatility_damped":
      if (f.volatility > 0.5)
        return `Conditions are noisy (volatility ${fmt(f.volatility, 2)}), and confidence is a liability in noise — so this lens deliberately regresses toward 50/50, landing at ${pct(p)}.`;
      if (f.volatility < 0.2)
        return `Conditions are calm (volatility ${fmt(f.volatility, 2)}), so there is little noise to be humble about and this lens damps almost nothing.`;
      return `Moderate noise (volatility ${fmt(f.volatility, 2)}) calls for moderate humility — this lens trims the blended crowd/expert view partway toward 50/50.`;
    default:
      return "";
  }
}

/** Which lenses pushed hardest up and down, in plain words. */
export function driversSummary(result: PreviewResult): string {
  const sorted = [...result.breakdown].sort((a, b) => b.contribution - a.contribution);
  const up = sorted[0];
  const down = sorted[sorted.length - 1];
  const parts: string[] = [];
  if (up.contribution > 0.01)
    parts.push(`strongest upward push: ${up.label} (+${fmt(up.contribution)} log-odds)`);
  if (down.contribution < -0.01)
    parts.push(`strongest downward pull: ${down.label} (${fmt(down.contribution)} log-odds)`);
  if (parts.length === 0) return "No single lens dominates — the eight pull in different directions and roughly cancel out.";
  return `What moved the needle most — ${parts.join("; ")}.`;
}

/** What the disagreement spread means, in plain words. */
export function disagreementNote(result: PreviewResult): string {
  const s = result.disagreement;
  if (s > 0.4)
    return `The lenses disagree violently (spread ${fmt(s)}). That is a signal, not noise: this question deserves more research before you trust any single number.`;
  if (s > 0.2)
    return `There is meaningful disagreement between lenses (spread ${fmt(s)}) — the answer is sensitive to which view of the world you trust most.`;
  return `The lenses mostly agree with each other (spread ${fmt(s)}) — this is a stable, well-behaved read.`;
}

/** The one-paragraph plain-English answer. */
export function answerParagraph(result: PreviewResult): string {
  const p = result.probability;
  return `${verdictWord(p)} — there is a ${pct(p)} chance. ${driversSummary(result)} ${disagreementNote(result)}`;
}
