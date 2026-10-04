# ⚠️ Personal Research Experiment Financial Disclaimer & Liability Waiver:
This is not Tool or Service: This is a private, experimental sandbox, not intended for outside or public use, replication or distribution. It is not a financial tool, software service, or product designed for public use. Not Financial Advice: The author is not a licensed financial advisor, accountant, or broker. Nothing in this repository constitutes professional financial, investment, or legal advice. No Warranties: This repository is provided "as-is" for display purposes only. The author makes no representations or warranties of any kind regarding the accuracy, completeness, or reliability of the data, code, or experimental models. Absolute Limitation of Liability: Under no circumstances shall the author be liable for any claims, damages, or financial losses (direct or indirect) if you violate these terms and attempt to use, replicate, or rely on any part of this experiment.

# DragonflyDecalogue

A structured forecasting engine: eight independent lenses (agents) pooled in log-odds space, tuned on a 200-question benchmark.

**Goal Brier score: 0.07777** (target band: 0.075–0.085)

## The Eight Agents

Each agent is a deterministic function of a question's feature vector. No API calls, no paid services, no randomness at inference time.

1. **Reference Class** — Outside view: the raw base rate
2. **Trend Extrapolation** — Momentum signal applied to base rate
3. **Bayesian Updater** — Log-likelihood ratio applied to prior odds
4. **Status-Quo Anchor** — Inertia: most things stay the same
5. **Market Signal** — Crowd-sourced probability, taken at face value
6. **Expert Panel** — Inside-view judgment, shrunk 25% toward base rate
7. **Time-Hazard Model** — Longer horizons = more chance for event to fire
8. **Volatility Damper** — Contrarian brake when conditions are noisy

## Feature Vector

Questions are characterized by eight features:

- `base_rate` (0.005–0.995) — prior frequency
- `trend` (−1 to +1) — directional momentum
- `evidence_lr` (−4 to +4) — log-likelihood ratio
- `status_quo_strength` (0–1) — how sticky is the status quo?
- `market_prob` (0.005–0.995) — market probability
- `expert_prob` (0.005–0.995) — expert consensus
- `time_horizon_days` (1–3650) — forecast horizon
- `volatility` (0–1) — environmental noise level

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
python -c "from lib.benchmark import calibration_report; print(calibration_report()['brier_score'])"
```

### Run Server

```bash
cd backend
uvicorn server:app --reload
```

Server runs on `http://localhost:8000`. OpenAPI docs at `/docs`.

## API Endpoints

### Engine

- `GET /api/engine/agents` — List the eight agents with weights and performance
- `GET /api/engine/calibration` — Full calibration report on 200-question benchmark
- `GET /api/engine/benchmark?limit=200` — Benchmark predictions and outcomes
- `POST /api/engine/preview` — Preview a forecast without saving

### Questions

- `POST /api/questions` — Create and forecast a question
- `GET /api/questions` — List all questions (newest first)
- `GET /api/questions/{id}` — Get a single question detail
- `DELETE /api/questions/{id}` — Delete a question

### Decalogue

- `GET /api/decalogue` — eleven forecasting commandments, wired to the engine

### Bundle

- `GET /api/bundle/manifest` — Manifest of included files
- `GET /api/bundle/source.zip` — Download full source (reproducible, no secrets)

## Request/Response Example

### POST /api/engine/preview

Request:
```json
{
  "base_rate": 0.35,
  "trend": 0.1,
  "evidence_lr": 1.5,
  "status_quo_strength": 0.6,
  "market_prob": 0.42,
  "expert_prob": 0.38,
  "time_horizon_days": 90,
  "volatility": 0.25
}
```

Response:
```json
{
  "features": { ... },
  "breakdown": [
    {
      "agent": "market_signal",
      "label": "Market Signal",
      "lens": "Crowd",
      "formula": "p = market_prob",
      "rationale": "Money-weighted aggregation from comparable markets.",
      "probability": 0.42,
      "logit": -0.321,
      "weight": 0.2,
      "contribution": -0.064
    },
    ...
  ],
  "pooled_logit": 0.156,
  "extremized_logit": 0.234,
  "calibrated_logit": 0.234,
  "extremizing_exponent": 1.5,
  "probability": 0.558,
  "disagreement": 0.084,
  "confidence": 0.916
}
```

## Architecture

```
backend/
├── lib/
│   ├── engine.py       — eight agents + log-odds aggregation
│   ├── benchmark.py    — 200-question resolved corpus, Brier scoring
│   ├── decalogue.py    — eleven commandments
│   ├── bundle.py       — source bundler
│   └── db.py           — question storage
├── models/
│   └── forecast.py     — Pydantic schemas
├── routers/
│   └── forecast.py     — FastAPI endpoints
├── server.py           — FastAPI app
├── weights.json        — tuned weights, extremizing exponent
└── requirements.txt    — dependencies
```

## The Eleven Commandments

1. **Triage** — Focus on questions where effort moves the needle
2. **Break the problem into tractable sub-problems** — Decompose via Fermi estimation
3. **Strike a balance between inside and outside views** — Anchor on reference class first
4. **Strike a balance between under- and overreacting to evidence** — Update small, update often
5. **Look for clashing causal forces** — Hold thesis and antithesis simultaneously
6. **Distinguish as many degrees of doubt as the problem permits** — No rounding to thirds
7. **Strike a balance between under- and overconfidence** — Calibrate, don't posture
8. **Look for the errors behind your mistakes** — Post-mortem every resolution
9. **Bring out the best in others** — Team of forecasters beats individuals
10. **Master the error-balancing bicycle** — Practice with unambiguous feedback
11. **Don't treat commandments as commandments** — Every weight is editable

## Reproducibility

Download the bundle (`/api/bundle/source.zip`). It contains:

- All source code
- Weights and calibration report
- Resolved benchmark (200 questions, seed 20261)
- Manifest with full file listing

No API keys. No paid services. No randomness at inference time. Run locally, audit deeply, edit freely.

## License

MIT. 
---

Built on a structured, evidence-driven methodology.

Made with 💖 by: @MisoPrettyStacks

@IGotGlitterOnMe on X
