# Sorcer Demo Startup Checklist

Step-by-step guide to get the full stack running for a demo. Follow in order.

---

## Prerequisites

| Tool       | Version  | Check command          |
|------------|----------|------------------------|
| Python     | >= 3.10  | `python --version`     |
| Node / npm | >= 18    | `node -v && npm -v`    |
| PostgreSQL | any      | `psql --version`       |
| Redis      | any      | `redis-cli ping`       |
| gcloud CLI | any      | `gcloud --version`     |

---

## 1. Start Infrastructure

### Redis
```bash
# Option A: Docker (easiest)
docker run -d -p 6379:6379 --name sorcer-redis redis:alpine

# Option B: local install
redis-server
```
Verify: `redis-cli ping` → `PONG`

### PostgreSQL
Make sure Postgres is running, then create the database:
```bash
createdb eco_db
# OR
psql -U postgres -c "CREATE DATABASE eco_db;"
```
Verify: `psql -U postgres -d eco_db -c "SELECT 1;"`

---

## 2. Backend Setup

```bash
cd backend/eco_orchestrator
```

### Install dependencies
```bash
pip install -r requirements.txt
```

### Environment variables
The `.env` file should already exist. Confirm these are set:

| Variable                         | Required | Default / Notes                                    |
|----------------------------------|----------|----------------------------------------------------|
| `GOOGLE_CLOUD_PROJECT`           | Yes      | `sorcer-hackathon`                                 |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes      | Path to service account JSON (e.g. `./service-account.json`) |
| `DATABASE_URL`                   | Yes      | `postgresql://postgres:postgres@localhost:5432/eco_db` |
| `REDIS_HOST`                     | No       | `localhost`                                        |
| `REDIS_PORT`                     | No       | `6379`                                             |
| `GRID_THRESHOLD`                 | No       | `200` (g CO₂/kWh, controls deferral)              |
| `WATTTIME_USERNAME`              | No       | For live grid data                                 |
| `WATTTIME_PASSWORD`              | No       | For live grid data                                 |
| `ELECTRICITYMAPS_TOKEN`          | No       | For live grid data                                 |

### Seed the database (creates `tasks` + `receipts` tables)
```bash
python scripts/seed_db.py
```

### Seed the cache (10 pre-loaded prompt/response pairs)
```bash
python scripts/seed_cache.py
```
Options: `--hash` (hash only), `--semantic` (semantic only), `--clear` (flush first).

### Start the backend server
```bash
uvicorn app.main:app --reload
```
Backend runs on **http://localhost:8000**.  
Docs at **http://localhost:8000/docs**.

> The deferred-task worker starts automatically with the server (no separate process needed).

---

## 3. Frontend Setup

```bash
cd sorcer-app
```

### Install dependencies
```bash
npm install
```

### Start the dev server
```bash
npm run dev
```
Frontend runs on **http://localhost:3000**.

---

## 4. Verify Everything Works

### Quick health check
```bash
# Backend is alive
curl http://localhost:8000/docs

# Redis cache is seeded (should return a cached response instantly)
curl -X POST http://localhost:8000/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is carbon offsetting?", "user_id": "demo", "project_id": "demo"}'
```

Expected: response with `"was_cached": true` and `"cache_type": "hash"`.

### Full flow test (bypasses cache)
```bash
curl -X POST http://localhost:8000/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Tell me something unique about sustainable computing", "user_id": "demo", "project_id": "demo", "is_urgent": true}'
```

Expected: response with `"was_cached": false`, plus `input_tokens`, `compressed_text_tokens`, and `compressed_prompt` fields.

---

## Startup Order (TL;DR)

```
1. Redis          →  docker run -d -p 6379:6379 --name sorcer-redis redis:alpine
2. PostgreSQL     →  ensure running + createdb eco_db
3. Seed DB        →  cd backend/eco_orchestrator && python scripts/seed_db.py
4. Seed Cache     →  python scripts/seed_cache.py
5. Backend        →  uvicorn app.main:app --reload
6. Frontend       →  cd sorcer-app && npm run dev
```

---

## Ports Reference

| Service    | Port  |
|------------|-------|
| Frontend   | 3000  |
| Backend    | 8000  |
| Redis      | 6379  |
| PostgreSQL | 5432  |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Redis disabled (no-op mode)` in backend logs | Redis isn't running. Start it (step 1). |
| `LLM unavailable` on /orchestrate | Check `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service-account JSON. |
| `relation "tasks" does not exist` | Run `python scripts/seed_db.py` (step 3). |
| Frontend can't reach backend | CORS is configured for `localhost:3000` only. Make sure frontend is on that port. |
| Cache seed says "0 entries written" | Redis isn't connected. Check `redis-cli ping`. |
