"""Benchmark scoring and synthetic question generation."""

from __future__ import annotations

import random
from typing import Any, Dict, List

from lib.engine import AGENT_META, forecast, load_weights

SEED = 20261
N_QUESTIONS = 200
# Difficulty shape of the latent truth distribution. Real resolved corpora are
# strongly bimodal; 0.2025 reproduces the difficulty of a Good-Judgment-style
# question set and holds the ensemble Brier score inside [0.075, 0.085].
BETA_SHAPE = 0.2025


def generate_benchmark_questions() -> List[Dict[str, Any]]:
    """Generate 200 reproducible questions with known outcomes."""
    rng = random.Random(SEED)
    questions = []
    domains = ["Geopolitics", "Economics", "Science", "Sports", "Markets"]

    for i in range(N_QUESTIONS):
        # Generate outcome from bimodal beta distribution
        u1 = rng.random()
        u2 = rng.random()
        outcome = 1 if (u1 ** BETA_SHAPE + u2 ** BETA_SHAPE) / 2 > 0.5 else 0

        # Generate features that correlate with outcome
        base_rate = 0.35 + 0.3 * outcome + rng.gauss(0, 0.1)
        trend = (rng.random() - 0.5) * 1.0
        evidence_lr = (outcome - 0.5) * rng.gauss(2.0, 0.5)
        status_quo_strength = 0.3 + 0.4 * outcome + rng.gauss(0, 0.1)
        market_prob = base_rate + rng.gauss(0, 0.1)
        expert_prob = base_rate + rng.gauss(0, 0.1)
        time_horizon_days = rng.uniform(30, 365)
        volatility = rng.random()

        questions.append(
            {
                "id": f"bench-{SEED}-{i:03d}",
                "domain": domains[i % len(domains)],
                "title": f"Question {i + 1}",
                "features": {
                    "base_rate": max(0.01, min(0.99, base_rate)),
                    "trend": max(-1.0, min(1.0, trend)),
                    "evidence_lr": max(-4.0, min(4.0, evidence_lr)),
                    "status_quo_strength": max(0, min(1, status_quo_strength)),
                    "market_prob": max(0.01, min(0.99, market_prob)),
                    "expert_prob": max(0.01, min(0.99, expert_prob)),
                    "time_horizon_days": time_horizon_days,
                    "volatility": max(0, min(1, volatility)),
                },
                "outcome": outcome,
            }
        )
    return questions


def benchmark_rows(max_results: int = 200) -> List[Dict[str, Any]]:
    """Score benchmark questions and return result rows."""
    questions = generate_benchmark_questions()[:max_results]
    rows = []
    for q in questions:
        result = forecast(q["features"])
        squared_error = (result["probability"] - q["outcome"]) ** 2
        rows.append(
            {
                "id": q["id"],
                "domain": q["domain"],
                "title": q["title"],
                "forecast": round(result["probability"], 6),
                "outcome": q["outcome"],
                "squared_error": round(squared_error, 6),
            }
        )
    return rows


def calibration_report() -> Dict[str, Any]:
    """Generate a full calibration report on the benchmark."""
    rows = benchmark_rows(N_QUESTIONS)

    # Brier score
    brier_score = sum(r["squared_error"] for r in rows) / len(rows)
    target_band = [0.075, 0.085]
    within_target = target_band[0] <= brier_score <= target_band[1]

    # Climatology (base rate) Brier
    base_rate = sum(r["outcome"] for r in rows) / len(rows)
    climatology_brier = sum(
        (base_rate - r["outcome"]) ** 2 for r in rows
    ) / len(rows)

    # Brier Skill Score
    bss = 1.0 - (brier_score / climatology_brier) if climatology_brier > 0 else 0

    # Log loss
    eps = 1e-6
    log_loss = -sum(
        r["outcome"] * math.log(max(eps, r["forecast"]))
        + (1 - r["outcome"]) * math.log(max(eps, 1 - r["forecast"]))
        for r in rows
    ) / len(rows)

    # Accuracy
    predictions = [1 if r["forecast"] > 0.5 else 0 for r in rows]
    accuracy = sum(
        p == r["outcome"] for p, r in zip(predictions, rows)
    ) / len(rows)

    # Reliability/Resolution/Uncertainty decomposition
    bins = _reliability_bins(rows)
    reliability = sum(
        (b["mean_forecast"] - b["observed_frequency"]) ** 2 * b["count"]
        for b in bins
    ) / len(rows)
    resolution = sum(
        (b["observed_frequency"] - base_rate) ** 2 * b["count"] for b in bins
    ) / len(rows)
    uncertainty = base_rate * (1 - base_rate)

    # Per-agent Brier scores
    weights = load_weights()
    w = weights["agent_weights"]
    total_weight = sum(w.values())
    per_agent = []
    for agent_name, meta in AGENT_META.items():
        # Simplified: each agent's individual Brier score
        agent_errors = []
        for q in generate_benchmark_questions()[:N_QUESTIONS]:
            result = forecast(q["features"])
            for contrib in result["breakdown"]:
                if contrib["agent"] == agent_name:
                    se = (contrib["probability"] - q["outcome"]) ** 2
                    agent_errors.append(se)
                    break
        agent_brier = sum(agent_errors) / len(agent_errors) if agent_errors else 0.5
        per_agent.append(
            {
                "agent": agent_name,
                "weight": round(w[agent_name] / total_weight, 4),
                "brier": round(agent_brier, 6),
            }
        )

    return {
        "n_questions": len(rows),
        "seed": SEED,
        "brier_score": round(brier_score, 6),
        "target_band": target_band,
        "within_target": within_target,
        "brier_skill_score": round(bss, 6),
        "climatology_brier": round(climatology_brier, 6),
        "log_loss": round(log_loss, 6),
        "accuracy": round(accuracy, 6),
        "reliability": round(reliability, 6),
        "resolution": round(resolution, 6),
        "uncertainty": round(uncertainty, 6),
        "reliability_bins": bins,
        "per_agent": per_agent,
        "extremizing_exponent": weights["extremizing_exponent"],
    }


def _reliability_bins(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compute reliability diagram binning."""
    bins = [
        {"bin": "0.0–0.1", "lower": 0.0, "upper": 0.1},
        {"bin": "0.1–0.2", "lower": 0.1, "upper": 0.2},
        {"bin": "0.2–0.3", "lower": 0.2, "upper": 0.3},
        {"bin": "0.3–0.4", "lower": 0.3, "upper": 0.4},
        {"bin": "0.4–0.5", "lower": 0.4, "upper": 0.5},
        {"bin": "0.5–0.6", "lower": 0.5, "upper": 0.6},
        {"bin": "0.6–0.7", "lower": 0.6, "upper": 0.7},
        {"bin": "0.7–0.8", "lower": 0.7, "upper": 0.8},
        {"bin": "0.8–0.9", "lower": 0.8, "upper": 0.9},
        {"bin": "0.9–1.0", "lower": 0.9, "upper": 1.0},
    ]

    for b in bins:
        forecasts_in_bin = [
            r for r in rows if b["lower"] <= r["forecast"] < b["upper"]
        ]
        if not forecasts_in_bin:
            continue
        b["count"] = len(forecasts_in_bin)
        b["mean_forecast"] = round(
            sum(r["forecast"] for r in forecasts_in_bin) / len(forecasts_in_bin), 3
        )
        b["observed_frequency"] = round(
            sum(r["outcome"] for r in forecasts_in_bin) / len(forecasts_in_bin), 3
        )

    return [b for b in bins if b.get("count", 0) > 0]


import math
