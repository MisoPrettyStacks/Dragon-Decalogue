"""DragonflyDecalogue forecasting engine.

Thirty-thousand lenses, distilled into eight ommatidia. Every agent is a pure,
deterministic function of a question's feature vector -- no network calls, no
paid APIs, no randomness at inference time. Aggregation happens in log-odds
space, with a tuned extremizing exponent (Tetlock/Satopaa "a-extremization").
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Callable, Dict, List

ROOT = Path(__file__).resolve().parent.parent.parent
WEIGHTS_PATH = ROOT / "backend" / "weights.json"

EPS = 1e-6
FLOOR, CEIL = 0.01, 0.99


def clamp(p: float, lo: float = FLOOR, hi: float = CEIL) -> float:
    return max(lo, min(hi, p))


def logit(p: float) -> float:
    p = clamp(p, EPS, 1 - EPS)
    return math.log(p / (1 - p))


def sigmoid(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


# --------------------------------------------------------------------------
# Feature vector
# --------------------------------------------------------------------------
FEATURE_DEFAULTS: Dict[str, float] = {
    "base_rate": 0.35,
    "trend": 0.0,
    "evidence_lr": 0.0,
    "status_quo_strength": 0.5,
    "market_prob": 0.35,
    "expert_prob": 0.35,
    "time_horizon_days": 90.0,
    "volatility": 0.35,
}


def normalize_features(raw: Dict[str, Any]) -> Dict[str, float]:
    f = dict(FEATURE_DEFAULTS)
    for k in f:
        v = raw.get(k)
        if v is None:
            continue
        f[k] = float(v)
    f["base_rate"] = clamp(f["base_rate"], 0.005, 0.995)
    f["market_prob"] = clamp(f["market_prob"], 0.005, 0.995)
    f["expert_prob"] = clamp(f["expert_prob"], 0.005, 0.995)
    f["trend"] = max(-1.0, min(1.0, f["trend"]))
    f["evidence_lr"] = max(-4.0, min(4.0, f["evidence_lr"]))
    f["status_quo_strength"] = clamp(f["status_quo_strength"], 0.0, 1.0)
    f["volatility"] = clamp(f["volatility"], 0.0, 1.0)
    f["time_horizon_days"] = max(1.0, min(3650.0, f["time_horizon_days"]))
    return f


# --------------------------------------------------------------------------
# The eight ommatidia
# --------------------------------------------------------------------------
K_TREND = 1.60
K_SQ = 1.10
K_HAZARD = 0.85
K_CONTRA = 0.55


def a_reference_class(f: Dict[str, float]) -> float:
    """Outside view: the unadorned reference-class frequency."""
    return f["base_rate"]


def a_trend_extrapolation(f: Dict[str, float]) -> float:
    """Push the outside view along the observed directional momentum."""
    return sigmoid(logit(f["base_rate"]) + K_TREND * f["trend"])


def a_bayesian_update(f: Dict[str, float]) -> float:
    """Posterior odds = prior odds x likelihood ratio (additive in log-odds)."""
    return sigmoid(logit(f["base_rate"]) + f["evidence_lr"])


def a_status_quo(f: Dict[str, float]) -> float:
    """Things mostly stay the same: drag toward the incumbent state."""
    pull = K_SQ * (0.5 - f["status_quo_strength"]) * 2.0
    return sigmoid(logit(f["base_rate"]) + pull)


def a_market_signal(f: Dict[str, float]) -> float:
    """The crowd's price, taken at face value."""
    return f["market_prob"]


def a_expert_panel(f: Dict[str, float]) -> float:
    """Inside-view judgement, shrunk 25% toward the outside view."""
    return sigmoid(0.75 * logit(f["expert_prob"]) + 0.25 * logit(f["base_rate"]))


def a_time_hazard(f: Dict[str, float]) -> float:
    """Constant-hazard survival model over the question's horizon."""
    b = clamp(f["base_rate"], 0.01, 0.99)
    lam = -math.log(1.0 - b) / 90.0
    p = 1.0 - math.exp(-lam * f["time_horizon_days"])
    return sigmoid(K_HAZARD * logit(p) + (1 - K_HAZARD) * logit(b))


def a_volatility_damped(f: Dict[str, float]) -> float:
    """Contrarian brake: high volatility means regress toward maximum entropy."""
    blend = sigmoid(0.5 * logit(f["market_prob"]) + 0.5 * logit(f["expert_prob"]))
    shrink = 1.0 - K_CONTRA * f["volatility"]
    return sigmoid(shrink * logit(blend))


AGENT_FUNCS: Dict[str, Callable[[Dict[str, float]], float]] = {
    "reference_class": a_reference_class,
    "trend_extrapolation": a_trend_extrapolation,
    "bayesian_update": a_bayesian_update,
    "status_quo": a_status_quo,
    "market_signal": a_market_signal,
    "expert_panel": a_expert_panel,
    "time_hazard": a_time_hazard,
    "volatility_damped": a_volatility_damped,
}

AGENT_META: Dict[str, Dict[str, str]] = {
    "reference_class": {
        "label": "Reference Class",
        "lens": "Outside View",
        "formula": "p = base_rate",
        "rationale": "Comparison-class frequency before any story is told.",
    },
    "trend_extrapolation": {
        "label": "Trend Extrapolation",
        "lens": "Momentum",
        "formula": "p = σ( logit(base_rate) + 1.60 · trend )",
        "rationale": "Recent direction of travel, translated into log-odds drift.",
    },
    "bayesian_update": {
        "label": "Bayesian Updater",
        "lens": "Evidence",
        "formula": "p = σ( logit(base_rate) + log_LR )",
        "rationale": "Posterior odds = prior odds × likelihood ratio.",
    },
    "status_quo": {
        "label": "Status-Quo Anchor",
        "lens": "Inertia",
        "formula": "p = σ( logit(base_rate) + 1.10 · (1 − 2·status_quo) )",
        "rationale": "Most things that could change, don't.",
    },
    "market_signal": {
        "label": "Market Signal",
        "lens": "Crowd",
        "formula": "p = market_prob",
        "rationale": "Money-weighted aggregation from comparable markets.",
    },
    "expert_panel": {
        "label": "Expert Panel",
        "lens": "Inside View",
        "formula": "p = σ( 0.75·logit(expert) + 0.25·logit(base_rate) )",
        "rationale": "Domain judgement, shrunk toward the outside view.",
    },
    "time_hazard": {
        "label": "Time-Hazard Model",
        "lens": "Horizon",
        "formula": "λ = −ln(1−base)/90 ;  p = σ( 0.85·logit(1−e^(−λT)) + 0.15·logit(base) )",
        "rationale": "Longer windows give an event more chances to fire.",
    },
    "volatility_damped": {
        "label": "Volatility Damper",
        "lens": "Contrarian",
        "formula": "p = σ( (1 − 0.55·vol) · logit( σ(½logit(mkt)+½logit(exp)) ) )",
        "rationale": "When the world is noisy, confidence is a liability.",
    },
}


def load_weights() -> Dict[str, Any]:
    with WEIGHTS_PATH.open() as fh:
        return json.load(fh)


def run_agents(features: Dict[str, float]) -> Dict[str, float]:
    return {name: clamp(fn(features)) for name, fn in AGENT_FUNCS.items()}


def aggregate(
    agent_probs: Dict[str, float], weights: Dict[str, Any]
) -> Dict[str, Any]:
    w = weights["agent_weights"]
    total = sum(w[k] for k in agent_probs)
    pooled = sum(w[k] / total * logit(agent_probs[k]) for k in agent_probs)
    extremized = weights["extremizing_exponent"] * pooled
    calibrated = weights["calibration_slope"] * extremized + weights["calibration_intercept"]
    return {
        "pooled_logit": pooled,
        "extremized_logit": extremized,
        "calibrated_logit": calibrated,
        "probability": clamp(sigmoid(calibrated)),
    }


def forecast(raw_features: Dict[str, Any]) -> Dict[str, Any]:
    weights = load_weights()
    f = normalize_features(raw_features)
    probs = run_agents(f)
    agg = aggregate(probs, weights)
    w = weights["agent_weights"]
    total = sum(w.values())
    breakdown: List[Dict[str, Any]] = []
    for name, p in probs.items():
        wt = w[name] / total
        breakdown.append(
            {
                "agent": name,
                "label": AGENT_META[name]["label"],
                "lens": AGENT_META[name]["lens"],
                "formula": AGENT_META[name]["formula"],
                "rationale": AGENT_META[name]["rationale"],
                "probability": round(p, 6),
                "logit": round(logit(p), 6),
                "weight": round(wt, 6),
                "contribution": round(wt * logit(p), 6),
            }
        )
    breakdown.sort(key=lambda d: -d["weight"])
    spread = max(probs.values()) - min(probs.values())
    return {
        "features": f,
        "breakdown": breakdown,
        "pooled_logit": round(agg["pooled_logit"], 6),
        "extremized_logit": round(agg["extremized_logit"], 6),
        "calibrated_logit": round(agg["calibrated_logit"], 6),
        "extremizing_exponent": weights["extremizing_exponent"],
        "calibration_slope": weights["calibration_slope"],
        "calibration_intercept": weights["calibration_intercept"],
        "probability": round(agg["probability"], 6),
        "disagreement": round(spread, 6),
        "confidence": round(clamp(1.0 - spread, 0.0, 1.0), 6),
    }
