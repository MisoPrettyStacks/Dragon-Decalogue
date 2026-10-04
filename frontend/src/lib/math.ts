// Faithful client-side mirror of backend/lib/engine.py math, so the UI can
// show every intermediate calculation step. The backend remains the source
// of truth for the final numbers; these helpers reproduce the workings.

export const EPS = 1e-6;
export const FLOOR = 0.01;
export const CEIL = 0.99;

export function clamp(p: number, lo = FLOOR, hi = CEIL): number {
  return Math.max(lo, Math.min(hi, p));
}

export function logit(p: number): number {
  const c = clamp(p, EPS, 1 - EPS);
  return Math.log(c / (1 - c));
}

export function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

export const fmt = (n: number, digits = 6): string => n.toFixed(digits);
export const pct = (p: number): string => `${(p * 100).toFixed(2)}%`;

export interface Features {
  base_rate: number;
  trend: number;
  evidence_lr: number;
  status_quo_strength: number;
  market_prob: number;
  expert_prob: number;
  time_horizon_days: number;
  volatility: number;
}

export const FEATURE_DEFAULTS: Features = {
  base_rate: 0.35,
  trend: 0.0,
  evidence_lr: 0.0,
  status_quo_strength: 0.5,
  market_prob: 0.35,
  expert_prob: 0.35,
  time_horizon_days: 90,
  volatility: 0.35,
};

export interface FeatureSpec {
  key: keyof Features;
  label: string;
  min: number;
  max: number;
  step: number;
  clampRule: string;
}

export const FEATURE_SPECS: FeatureSpec[] = [
  { key: "base_rate", label: "Base rate", min: 0.005, max: 0.995, step: 0.005, clampRule: "clamped to [0.005, 0.995]" },
  { key: "trend", label: "Trend (−1…+1)", min: -1, max: 1, step: 0.05, clampRule: "clamped to [−1, 1]" },
  { key: "evidence_lr", label: "Evidence log-LR", min: -4, max: 4, step: 0.1, clampRule: "clamped to [−4, 4]" },
  { key: "status_quo_strength", label: "Status-quo strength", min: 0, max: 1, step: 0.05, clampRule: "clamped to [0, 1]" },
  { key: "market_prob", label: "Market prob", min: 0.005, max: 0.995, step: 0.005, clampRule: "clamped to [0.005, 0.995]" },
  { key: "expert_prob", label: "Expert prob", min: 0.005, max: 0.995, step: 0.005, clampRule: "clamped to [0.005, 0.995]" },
  { key: "time_horizon_days", label: "Horizon (days)", min: 1, max: 3650, step: 1, clampRule: "clamped to [1, 3650]" },
  { key: "volatility", label: "Volatility", min: 0, max: 1, step: 0.05, clampRule: "clamped to [0, 1]" },
];

/** One agent's fully worked calculation, line by line. */
export interface AgentWorkings {
  key: string;
  lines: string[];
}

/** Reproduce each agent's arithmetic step-by-step from normalized features. */
export function agentWorkings(f: Features): AgentWorkings[] {
  const out: AgentWorkings[] = [];
  const lb = (p: number) => logit(p);

  // 1. Reference Class
  out.push({
    key: "reference_class",
    lines: [
      `p = base_rate = ${fmt(f.base_rate)}`,
      `clamp to [0.01, 0.99] → p = ${fmt(clamp(f.base_rate))}`,
    ],
  });

  // 2. Trend Extrapolation
  {
    const lbr = lb(f.base_rate);
    const drift = 1.6 * f.trend;
    const rawP = sigmoid(lbr + drift);
    const p = clamp(rawP);
    out.push({
      key: "trend_extrapolation",
      lines: [
        `logit(${fmt(f.base_rate)}) = ${fmt(lbr)}`,
        `1.60 × trend = 1.60 × ${fmt(f.trend)} = ${fmt(drift)}`,
        `${fmt(lbr)} + ${fmt(drift)} = ${fmt(lbr + drift)}`,
        `σ(${fmt(lbr + drift)}) = ${fmt(rawP)} → clamp [0.01, 0.99] = ${fmt(p)}`,
      ],
    });
  }

  // 3. Bayesian Updater
  {
    const lbr = lb(f.base_rate);
    const rawP = sigmoid(lbr + f.evidence_lr);
    const p = clamp(rawP);
    out.push({
      key: "bayesian_update",
      lines: [
        `logit(${fmt(f.base_rate)}) = ${fmt(lbr)}`,
        `${fmt(lbr)} + log_LR(${fmt(f.evidence_lr)}) = ${fmt(lbr + f.evidence_lr)}`,
        `σ(${fmt(lbr + f.evidence_lr)}) = ${fmt(rawP)} → clamp [0.01, 0.99] = ${fmt(p)}`,
      ],
    });
  }

  // 4. Status-Quo Anchor
  {
    const lbr = lb(f.base_rate);
    const pull = 1.1 * (0.5 - f.status_quo_strength) * 2.0;
    const rawP = sigmoid(lbr + pull);
    const p = clamp(rawP);
    out.push({
      key: "status_quo",
      lines: [
        `pull = 1.10 × (0.5 − ${fmt(f.status_quo_strength)}) × 2 = ${fmt(pull)}`,
        `logit(${fmt(f.base_rate)}) = ${fmt(lbr)}`,
        `${fmt(lbr)} + ${fmt(pull)} = ${fmt(lbr + pull)}`,
        `σ(${fmt(lbr + pull)}) = ${fmt(rawP)} → clamp [0.01, 0.99] = ${fmt(p)}`,
      ],
    });
  }

  // 5. Market Signal
  out.push({
    key: "market_signal",
    lines: [
      `p = market_prob = ${fmt(f.market_prob)}`,
      `clamp to [0.01, 0.99] → p = ${fmt(clamp(f.market_prob))}`,
    ],
  });

  // 6. Expert Panel
  {
    const le = lb(f.expert_prob);
    const lbr = lb(f.base_rate);
    const combo = 0.75 * le + 0.25 * lbr;
    const rawP = sigmoid(combo);
    const p = clamp(rawP);
    out.push({
      key: "expert_panel",
      lines: [
        `logit(expert ${fmt(f.expert_prob)}) = ${fmt(le)}`,
        `logit(base ${fmt(f.base_rate)}) = ${fmt(lbr)}`,
        `0.75 × ${fmt(le)} + 0.25 × ${fmt(lbr)} = ${fmt(combo)}`,
        `σ(${fmt(combo)}) = ${fmt(rawP)} → clamp [0.01, 0.99] = ${fmt(p)}`,
      ],
    });
  }

  // 7. Time-Hazard Model
  {
    const b = clamp(f.base_rate, 0.01, 0.99);
    const lam = -Math.log(1 - b) / 90;
    const pRaw = 1 - Math.exp(-lam * f.time_horizon_days);
    const combo = 0.85 * lb(pRaw) + 0.15 * lb(b);
    const rawP = sigmoid(combo);
    const p = clamp(rawP);
    out.push({
      key: "time_hazard",
      lines: [
        `base clamped to [0.01, 0.99] = ${fmt(b)}`,
        `λ = −ln(1 − ${fmt(b)}) / 90 = ${fmt(lam)}`,
        `p_raw = 1 − e^(−${fmt(lam)} × ${fmt(f.time_horizon_days, 1)}) = ${fmt(pRaw)}`,
        `logit(p_raw) = ${fmt(lb(pRaw))},  logit(base) = ${fmt(lb(b))}`,
        `0.85 × ${fmt(lb(pRaw))} + 0.15 × ${fmt(lb(b))} = ${fmt(combo)}`,
        `σ(${fmt(combo)}) = ${fmt(rawP)} → clamp [0.01, 0.99] = ${fmt(p)}`,
      ],
    });
  }

  // 8. Volatility Damper
  {
    const lm = lb(f.market_prob);
    const le = lb(f.expert_prob);
    const blend = sigmoid(0.5 * lm + 0.5 * le);
    const shrink = 1 - 0.55 * f.volatility;
    const rawP = sigmoid(shrink * lb(blend));
    const p = clamp(rawP);
    out.push({
      key: "volatility_damped",
      lines: [
        `blend input = 0.5 × logit(${fmt(f.market_prob)}) + 0.5 × logit(${fmt(f.expert_prob)})`,
        `          = 0.5 × ${fmt(lm)} + 0.5 × ${fmt(le)} = ${fmt(0.5 * lm + 0.5 * le)}`,
        `blend = σ(${fmt(0.5 * lm + 0.5 * le)}) = ${fmt(blend)}`,
        `shrink = 1 − 0.55 × ${fmt(f.volatility)} = ${fmt(shrink)}`,
        `σ(${fmt(shrink)} × logit(${fmt(blend)})=${fmt(lb(blend))}) = σ(${fmt(shrink * lb(blend))})`,
        `→ p = ${fmt(rawP)} → clamp [0.01, 0.99] = ${fmt(p)}`,
      ],
    });
  }

  return out;
}
