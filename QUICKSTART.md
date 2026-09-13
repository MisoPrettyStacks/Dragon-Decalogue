# API Quickstart — DragonflyDecalogue

Base URL: `http://localhost:8000/api`

All endpoints return JSON. OpenAPI docs at `/docs`.

## Forecast Engine

### Preview a Forecast

`POST /api/engine/preview`

No database persistence. Use this to experiment with features.

**Request:**
```bash
curl -X POST http://localhost:8000/api/engine/preview \
  -H "Content-Type: application/json" \
  -d '{
    "base_rate": 0.35,
    "trend": 0.1,
    "evidence_lr": 1.5,
    "status_quo_strength": 0.6,
    "market_prob": 0.42,
    "expert_prob": 0.38,
    "time_horizon_days": 90,
    "volatility": 0.25
  }'
```

**Response:**
```json
{
  "features": {
    "base_rate": 0.35,
    "trend": 0.1,
    "evidence_lr": 1.5,
    "status_quo_strength": 0.6,
    "market_prob": 0.42,
    "expert_prob": 0.38,
    "time_horizon_days": 90,
    "volatility": 0.25
  },
  "breakdown": [
    {
      "agent": "market_signal",
      "label": "Market Signal",
      "lens": "Crowd",
      "formula": "p = market_prob",
      "rationale": "Money-weighted aggregation from comparable markets.",
      "probability": 0.42,
      "logit": -0.3215,
      "weight": 0.2,
      "contribution": -0.0643
    },
    ... 7 more agents
  ],
  "pooled_logit": 0.1562,
  "extremized_logit": 0.2343,
  "calibrated_logit": 0.2343,
  "extremizing_exponent": 1.5,
  "probability": 0.5583,
  "disagreement": 0.0842,
  "confidence": 0.9158
}
```

### List Agents

`GET /api/engine/agents`

Show the eight agents, their weights, and solo Brier scores.

**Request:**
```bash
curl http://localhost:8000/api/engine/agents
```

**Response:**
```json
[
  {
    "agent": "market_signal",
    "label": "Market Signal",
    "lens": "Crowd",
    "formula": "p = market_prob",
    "rationale": "Money-weighted aggregation from comparable markets.",
    "weight": 0.2,
    "solo_brier": 0.187
  },
  {
    "agent": "bayesian_update",
    "label": "Bayesian Updater",
    "lens": "Evidence",
    "formula": "p = σ( logit(base_rate) + log_LR )",
    "rationale": "Posterior odds = prior odds × likelihood ratio.",
    "weight": 0.18,
    "solo_brier": 0.163
  },
  ... 6 more
]
```

### Get Calibration Report

`GET /api/engine/calibration`

Full Brier score decomposition and reliability bins on the 200-question benchmark.

**Request:**
```bash
curl http://localhost:8000/api/engine/calibration
```

**Response:**
```json
{
  "n_questions": 200,
  "seed": 20261,
  "brier_score": 0.07777,
  "target_band": [0.075, 0.085],
  "within_target": true,
  "brier_skill_score": 0.5234,
  "climatology_brier": 0.1653,
  "log_loss": 0.1234,
  "accuracy": 0.875,
  "reliability": 0.0031,
  "resolution": 0.0876,
  "uncertainty": 0.2484,
  "reliability_bins": [
    {
      "bin": "0.0–0.1",
      "lower": 0.0,
      "upper": 0.1,
      "count": 18,
      "mean_forecast": 0.058,
      "observed_frequency": 0.083
    },
    ...
  ],
  "per_agent": [
    {
      "agent": "market_signal",
      "weight": 0.2,
      "brier": 0.187
    },
    ...
  ],
  "extremizing_exponent": 1.5
}
```

### Get Benchmark

`GET /api/engine/benchmark?limit=200`

Predictions and outcomes for the reproducible benchmark.

**Request:**
```bash
curl "http://localhost:8000/api/engine/benchmark?limit=5"
```

**Response:**
```json
[
  {
    "id": "bench-20261-000",
    "domain": "Geopolitics",
    "title": "Question 1",
    "forecast": 0.341,
    "outcome": 0,
    "squared_error": 0.1162
  },
  {
    "id": "bench-20261-001",
    "domain": "Economics",
    "title": "Question 2",
    "forecast": 0.687,
    "outcome": 1,
    "squared_error": 0.0098
  },
  ...
]
```

## Questions

### Create a Question

`POST /api/questions`

Forecast and persist a question to the database.

**Request:**
```bash
curl -X POST http://localhost:8000/api/questions \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Will the Fed cut rates in 2026?",
    "domain": "Economics",
    "resolution_criteria": "Federal funds rate drops to <5% by Dec 31, 2026",
    "features": {
      "base_rate": 0.35,
      "trend": -0.2,
      "evidence_lr": 2.0,
      "status_quo_strength": 0.7,
      "market_prob": 0.55,
      "expert_prob": 0.50,
      "time_horizon_days": 500,
      "volatility": 0.3
    }
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Will the Fed cut rates in 2026?",
  "domain": "Economics",
  "resolution_criteria": "Federal funds rate drops to <5% by Dec 31, 2026",
  "created_at": "2026-09-13T18:30:45.123456Z",
  "features": { ... },
  "breakdown": [ ... ],
  "pooled_logit": 0.2134,
  "extremized_logit": 0.3201,
  "calibrated_logit": 0.3201,
  "extremizing_exponent": 1.5,
  "probability": 0.5794,
  "disagreement": 0.0732,
  "confidence": 0.9268,
  "resolved": null
}
```

### List Questions

`GET /api/questions`

Return all questions, newest first. Max 500.

**Request:**
```bash
curl http://localhost:8000/api/questions
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Will the Fed cut rates in 2026?",
    "domain": "Economics",
    "created_at": "2026-09-13T18:30:45.123456Z",
    "probability": 0.5794,
    "confidence": 0.9268,
    "disagreement": 0.0732,
    "resolved": null
  },
  ...
]
```

### Get Question

`GET /api/questions/{id}`

Retrieve full details of a single question.

**Request:**
```bash
curl http://localhost:8000/api/questions/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Will the Fed cut rates in 2026?",
  "domain": "Economics",
  "resolution_criteria": "...",
  "created_at": "2026-09-13T18:30:45.123456Z",
  "features": { ... },
  "breakdown": [ ... ],
  "probability": 0.5794,
  ...
}
```

### Delete Question

`DELETE /api/questions/{id}`

Remove a question from the database.

**Request:**
```bash
curl -X DELETE http://localhost:8000/api/questions/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "deleted": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Decalogue

### Get Commandments

`GET /api/decalogue`

The eleven commandments of forecasting, wired to the engine.

**Request:**
```bash
curl http://localhost:8000/api/decalogue
```

**Response:**
```json
[
  {
    "number": 1,
    "title": "Triage",
    "body": "Focus on questions where hard work pays off...",
    "engine_hook": "Every question carries a disagreement score..."
  },
  {
    "number": 2,
    "title": "Break the problem into tractable sub-problems",
    "body": "Fermi-ize...",
    "engine_hook": "The eight-feature vector IS the decomposition..."
  },
  ...
]
```

## Bundle

### Get Manifest

`GET /api/bundle/manifest`

List of files included in the source bundle.

**Request:**
```bash
curl http://localhost:8000/api/bundle/manifest
```

**Response:**
```json
{
  "file_count": 42,
  "total_bytes": 185000,
  "files": [
    "backend/lib/engine.py",
    "backend/lib/benchmark.py",
    "backend/weights.json",
    ...
  ],
  "download_url": "/api/bundle/source.zip"
}
```

### Download Source

`GET /api/bundle/source.zip`

Complete reproducible source code, weights, calibration report, and benchmark outcomes. No secrets, no APIs.

**Request:**
```bash
curl -O http://localhost:8000/api/bundle/source.zip
unzip dragonfly-decalogue-source.zip
```

## Error Handling

All errors return JSON with `detail` field.

```json
{
  "detail": "Question not found"
}
```

HTTP status codes:
- 200 — Success
- 201 — Created
- 404 — Not found
- 422 — Validation error
- 500 — Server error

## Rate Limiting

None (yet). Add via FastAPI middleware if needed.

## CORS

Enabled for all origins. Modify in `backend/server.py` if needed.

---

For more, see `/docs` (OpenAPI) or `README.md`.
