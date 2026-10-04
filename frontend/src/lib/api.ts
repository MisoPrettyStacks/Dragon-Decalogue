import type { Features } from "./math";

export const API_BASE = "https://dragon-decalogue-2.onrender.com";

export interface AgentContribution {
  agent: string;
  label: string;
  lens: string;
  formula: string;
  rationale: string;
  probability: number;
  logit: number;
  weight: number;
  contribution: number;
}

export interface PreviewResult {
  features: Record<string, number>;
  breakdown: AgentContribution[];
  pooled_logit: number;
  extremized_logit: number;
  calibrated_logit: number;
  extremizing_exponent: number;
  calibration_slope: number;
  calibration_intercept: number;
  probability: number;
  disagreement: number;
  confidence: number;
}

export interface AgentInfo {
  agent: string;
  label: string;
  lens: string;
  formula: string;
  rationale: string;
  weight: number;
  solo_brier: number;
}

export interface CalibrationReport {
  n_questions: number;
  seed: number;
  brier_score: number;
  target_band: [number, number];
  within_target: boolean;
  brier_skill_score: number;
  climatology_brier: number;
  log_loss: number;
  accuracy: number;
  reliability: number;
  resolution: number;
  uncertainty: number;
  per_agent: { agent: string; weight: number; brier: number }[];
  extremizing_exponent: number;
}

export interface Commandment {
  number: number;
  title: string;
  body: string;
  engine_hook: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return (await res.json()) as T;
}

export async function previewForecast(features: Features): Promise<PreviewResult> {
  const res = await fetch(`${API_BASE}/api/engine/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(features),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Forecast failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as PreviewResult;
}

export const fetchAgents = () => get<AgentInfo[]>("/api/engine/agents");
export const fetchCalibration = () => get<CalibrationReport>("/api/engine/calibration");
export const fetchDecalogue = () => get<Commandment[]>("/api/decalogue");
