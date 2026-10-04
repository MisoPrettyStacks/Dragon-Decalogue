# Setup Guide — DragonflyDecalogue

## Quick Start (Development)

### 1. Clone/Extract

```bash
cd dragonfly-decalogue
```

### 2. Test the Engine (No Server Required)

```bash
python test_engine.py
```

This runs the forecasting engine directly, outputs a calibration report, and verifies the Brier score.

Expected output:
```
Brier score: 0.077770
Target band: 0.075 – 0.085
Within target: True
```

### 3. Start Backend Server

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

Server starts on `http://localhost:8000`

- OpenAPI docs: `http://localhost:8000/docs`
- Root: `http://localhost:8000/`

### 4. Test an Endpoint

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

## Directory Structure

```
dragonfly-decalogue/
├── backend/
│   ├── lib/
│   │   ├── engine.py          (eight agents + aggregation)
│   │   ├── benchmark.py       (calibration + scoring)
│   │   ├── decalogue.py       (commandments)
│   │   ├── bundle.py          (source bundler)
│   │   └── db.py              (in-memory store)
│   ├── models/
│   │   └── forecast.py        (Pydantic schemas)
│   ├── routers/
│   │   └── forecast.py        (FastAPI endpoints)
│   ├── server.py              (FastAPI app)
│   ├── weights.json           (tuned hyperparameters)
│   └── requirements.txt
├── test_engine.py             (standalone test)
├── README.md                  (overview)
├── SETUP.md                   (this file)
└── QUICKSTART.md              (API examples)
```

## Dependencies

### Backend

- Python 3.8+
- FastAPI 0.104+
- Uvicorn 0.24+
- Pydantic 2.5+

Install:
```bash
cd backend
pip install -r requirements.txt
```

### Frontend (Optional)

None required for API-only deployment. A React/TypeScript app can be added later.

## Running in Production

### Via Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Via Systemd

Create `/etc/systemd/system/dragonfly.service`:

```ini
[Unit]
Description=DragonflyDecalogue Forecasting Engine
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/dragonfly/backend
ExecStart=/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable dragonfly
sudo systemctl start dragonfly
```

## Environment Variables

None required. All configuration is in `weights.json`.

To override weight location:
```bash
export DRAGONFLY_WEIGHTS=/path/to/weights.json
```

## Testing

Run the test suite:

```bash
python test_engine.py
```

Run FastAPI tests (coming soon):
```bash
cd backend
pytest
```

## Customization

### Edit Weights

Modify `backend/weights.json`:

```json
{
  "agent_weights": {
    "market_signal": 0.25,  // increase crowd weight
    "expert_panel": 0.08     // decrease expert weight
  },
  "extremizing_exponent": 1.3  // less extreme forecasts
}
```

Then restart the server. Calibration updates automatically.

### Add Custom Features

Edit `backend/lib/engine.py`, add a feature to `FEATURE_DEFAULTS`, and add an agent function (or modify existing ones).

### Change Benchmark

Edit `backend/lib/benchmark.py`:
- `SEED` — reproducibility seed
- `N_QUESTIONS` — question count
- `BETA_SHAPE` — difficulty distribution

## Troubleshooting

### "ModuleNotFoundError: No module named 'fastapi'"

```bash
cd backend
pip install -r requirements.txt
```

### Brier score is wrong

Check that `weights.json` is in `backend/` and is valid JSON:

```bash
python -c "import json; json.load(open('backend/weights.json'))"
```

### Server won't start

Check port 8000 is free:

```bash
lsof -i :8000
```

Or use a different port:

```bash
uvicorn server:app --port 8001
```

## Next Steps

1. **Download source bundle** — `GET /api/bundle/source.zip`
2. **Create a question** — `POST /api/questions` with title and features
3. **Check calibration** — `GET /api/engine/calibration`
4. **Read commandments** — `GET /api/decalogue`
5. **Edit weights** — Modify `weights.json` and restart

## Support

- Docs: `/docs` (OpenAPI/Swagger)
- Source: `https://github.com/...` (add your repo)
- Issues: Report calibration drifts, feature requests, performance bugs

---

Built on structured forecasting principles. No APIs. No secrets. Reproducible.
