#!/usr/bin/env python3
"""Quick test of the forecasting engine (no server needed)."""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from lib.engine import forecast
from lib.benchmark import calibration_report, benchmark_rows
from lib.decalogue import COMMANDMENTS

print("=" * 60)
print("DragonflyDecalogue — Engine Test")
print("=" * 60)

# Test 1: Single forecast
print("\n[1] Single Forecast")
print("-" * 60)

features = {
    "base_rate": 0.35,
    "trend": 0.1,
    "evidence_lr": 1.5,
    "status_quo_strength": 0.6,
    "market_prob": 0.42,
    "expert_prob": 0.38,
    "time_horizon_days": 90,
    "volatility": 0.25,
}

result = forecast(features)
print(f"Input features: {features}")
print(f"\nForecasted probability: {result['probability']:.4f}")
print(f"Disagreement (agent spread): {result['disagreement']:.4f}")
print(f"Confidence: {result['confidence']:.4f}")

print("\nAgent breakdown (top 3):")
for contrib in result["breakdown"][:3]:
    print(f"  {contrib['label']:20s} → {contrib['probability']:.4f} (weight: {contrib['weight']:.4f})")

# Test 2: Calibration report
print("\n[2] Calibration Report (200-question benchmark)")
print("-" * 60)

report = calibration_report()
print(f"Brier score: {report['brier_score']:.6f}")
print(f"Target band: {report['target_band'][0]} – {report['target_band'][1]}")
print(f"Within target: {report['within_target']}")
print(f"Brier skill score: {report['brier_skill_score']:.6f}")
print(f"Log loss: {report['log_loss']:.6f}")
print(f"Accuracy: {report['accuracy']:.4f}")

print("\nReliability decomposition:")
print(f"  Reliability: {report['reliability']:.6f}")
print(f"  Resolution:  {report['resolution']:.6f}")
print(f"  Uncertainty: {report['uncertainty']:.6f}")

print("\nPer-agent Brier scores (top 3):")
for agent in sorted(report["per_agent"], key=lambda x: x["brier"])[:3]:
    print(f"  {agent['agent']:20s} → {agent['brier']:.6f} (weight: {agent['weight']:.4f})")

# Test 3: Benchmark sample
print("\n[3] Benchmark Sample (first 5 questions)")
print("-" * 60)

rows = benchmark_rows(5)
for row in rows:
    print(f"{row['title']:20s} | forecast: {row['forecast']:.3f} | outcome: {row['outcome']} | error: {row['squared_error']:.6f}")

# Test 4: Commandments
print("\n[4] The Eleven Commandments")
print("-" * 60)

for cmd in COMMANDMENTS[:3]:
    print(f"\n{cmd['number']}. {cmd['title']}")
    print(f"   {cmd['body'][:70]}...")

print(f"\n... ({len(COMMANDMENTS)} total)")

print("\n" + "=" * 60)
print("✓ Engine test complete")
print("=" * 60)
