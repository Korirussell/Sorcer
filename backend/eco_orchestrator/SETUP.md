# Backend Setup Guide

This guide walks you through everything needed to run the **Carbon-Aware AI Orchestrator** backend from scratch. You need **Redis**, **PostgreSQL**, Python dependencies, and environment configuration.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Python & Dependencies](#2-python--dependencies)
3. [PostgreSQL](#3-postgresql)
4. [Redis](#4-redis)
5. [Environment Variables (.env)](#5-environment-variables-env)
6. [Database Setup (Seed)](#6-database-setup-seed)
7. [Running the Server](#7-running-the-server)
8. [Optional: Vertex AI (LLMs)](#8-optional-vertex-ai-llms)
9. [Optional: Carbon/Grid APIs](#9-optional-carbongrid-apis)
10. [Verify Everything](#10-verify-everything)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

- **Python 3.10+**
- **PostgreSQL** (running locally or reachable via `DATABASE_URL`)
- **Redis** (running locally or reachable via `REDIS_HOST` / `REDIS_PORT`)
- (Optional) **Google Cloud** account and service account key for Vertex AI (Gemini, Claude, Llama)
- (Optional) **WattTime** and/or **Electricity Maps** credentials for real-time grid carbon data

---

## 2. Python & Dependencies

From the **backend root** (this folder: `backend/eco_orchestrator`):

```bash
cd backend/eco_orchestrator
```

Create a virtual environment (recommended):

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
```

Install dependencies from **requirements.txt**:

```bash
pip install -r requirements.txt
```

> **Note:** The project uses `requirements.txt` (sometimes referred to as “req” or “req.txt” in conversation—this is the file to use). There is no separate `req.txt`; always use `requirements.txt` in this directory.

This installs FastAPI, uvicorn, Redis/asyncpg, Vertex AI / Anthropic / LangGraph, CodeCarbon, and other dependencies.

---

## 3. PostgreSQL

The backend uses PostgreSQL for **deferred tasks** and **receipts** (carbon-savings ledger). The app expects a database named `eco_db` by default.

### Install PostgreSQL

- **Windows:** [PostgreSQL installer](https://www.postgresql.org/download/windows/)
- **macOS:** `brew install postgresql@16` (or latest) then `brew services start postgresql@16`
- **Linux:** `sudo apt install postgresql postgresql-contrib` (or equivalent), then start the service

### Create the database

Using the default user `postgres` and password `postgres`:

```bash
# Option A: using createdb (if in PATH)
createdb eco_db

# Option B: using psql
psql -U postgres -c "CREATE DATABASE eco_db;"
```

### Connection string

The app uses the `DATABASE_URL` environment variable (see [Environment Variables](#5-environment-variables-env)). Default:

```
postgresql://postgres:postgres@localhost:5432/eco_db
```

Adjust username, password, host, or port in `.env` if your setup differs.

---

## 4. Redis

The backend uses **Redis** for caching (e.g. prompt cache, grid/carbon cache). Redis must be running or the app will log warnings and run in a no-op cache mode.

### Install and run Redis

**Using Docker (easiest):**

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Local install:**

- **Windows:** [Redis for Windows](https://github.com/microsoftarchive/redis/releases) or use WSL and run Redis inside Linux.
- **macOS:** `brew install redis` then `brew services start redis`
- **Linux:** `sudo apt install redis-server` then `sudo systemctl start redis-server`

### Default connection

- **Host:** `localhost` (override with `REDIS_HOST` in `.env`)
- **Port:** `6379` (override with `REDIS_PORT` in `.env`)

Check that Redis is up:

```bash
redis-cli ping
# Should reply: PONG
```

---

## 5. Environment Variables (.env)

Create a `.env` file in **backend/eco_orchestrator** (same folder as `requirements.txt` and `app/`):

```env
# ----- Required for DB (deferral / worker) -----
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eco_db

# ----- Optional: Redis (defaults: localhost:6379) -----
# REDIS_HOST=localhost
# REDIS_PORT=6379

# ----- Optional: Vertex AI (for LLM calls) -----
# GOOGLE_CLOUD_PROJECT=your-gcp-project
# GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
# DEFAULT_VERTEX_REGION=us-central1

# ----- Optional: Carbon / grid APIs -----
# WATTTIME_USERNAME=your_username
# WATTTIME_PASSWORD=your_password
# ELECTRICITYMAPS_TOKEN=your_token
```

- **DATABASE_URL** — Required if you use deferral or the worker. Must match your Postgres user, host, and database name.
- **REDIS_HOST / REDIS_PORT** — Optional; defaults are `localhost` and `6379`.
- **GOOGLE_* / Vertex** — Needed for real LLM calls (Gemini, Claude, Llama). See [VERTEX_SETUP.md](./VERTEX_SETUP.md).
- **WATTTIME_* / ELECTRICITYMAPS_TOKEN** — For live grid carbon data; without them the app falls back to a default intensity value.

**Security:** Do **not** commit `.env` or `service-account.json` to git. They are listed in `.gitignore`.

---

## 6. Database Setup (Seed)

After Postgres is running and `DATABASE_URL` is set, create the `tasks` and `receipts` tables by running the seed script **once**:

```bash
cd backend/eco_orchestrator
python scripts/seed_db.py
```

Expected output:

```
Connecting to DB... (localhost:5432/eco_db)
✓ Table tasks ready.
✓ Table receipts ready.
Done. DB is seeded.
```

If you see a connection error, ensure Postgres is running and `DATABASE_URL` in `.env` is correct.

---

## 7. Running the Server

From **backend/eco_orchestrator**:

```bash
uvicorn app.main:app --reload
```

- **Host/port:** By default the API runs at `http://127.0.0.1:8000`.
- **Reload:** `--reload` restarts the server when you change code (dev only).

**Minimal “get it running” checklist:**

| Step | Command / Action |
|------|-------------------|
| 1. Postgres running | Start PostgreSQL; create `eco_db` if needed |
| 2. Redis running | `docker run -d -p 6379:6379 redis` or start Redis locally |
| 3. Dependencies | `pip install -r requirements.txt` |
| 4. `.env` | Create `.env` with at least `DATABASE_URL` |
| 5. Seed DB | `python scripts/seed_db.py` |
| 6. Start API | `uvicorn app.main:app --reload` |

Then open:

- **Health:** http://127.0.0.1:8000/health  
- **Docs:** http://127.0.0.1:8000/docs  

---

## 8. Optional: Vertex AI (LLMs)

For real LLM calls (orchestrate, bypass, etc.) you need Google Cloud Vertex AI configured:

1. Place **service-account.json** in `backend/eco_orchestrator/`.
2. Set in `.env`:
   - `GOOGLE_CLOUD_PROJECT`
   - `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json`
   - `DEFAULT_VERTEX_REGION` (e.g. `us-central1`)

Full steps, model list, and gcloud CLI (for Meta/Llama) are in **[VERTEX_SETUP.md](./VERTEX_SETUP.md)**.

---

## 9. Optional: Carbon/Grid APIs

- **WattTime:** Set `WATTTIME_USERNAME` and `WATTTIME_PASSWORD` (or `WATTTIME_TOKEN`) in `.env`.
- **Electricity Maps:** Set `ELECTRICITYMAPS_TOKEN` in `.env`.

Without these, the app still runs but uses a fallback carbon intensity value and logs a warning.

---

## 10. Verify Everything

1. **Health:**  
   `curl http://127.0.0.1:8000/health` → `{"status":"ok"}`

2. **Postgres:**  
   After seeding, you can check tables:
   ```bash
   psql -U postgres -d eco_db -c "\dt"
   ```
   You should see `tasks` and `receipts`.

3. **Redis:**  
   With Redis running, startup logs should show something like: `✓ Redis connected (localhost:6379)`. If Redis is down, you’ll see a warning and no-op cache mode.

4. **API docs:**  
   Open http://127.0.0.1:8000/docs and try endpoints (e.g. POST `/orchestrate` with a body).

---

## 11. Troubleshooting

| Issue | What to check |
|-------|----------------|
| **“Could not connect to Postgres”** | Postgres is running; `DATABASE_URL` in `.env` is correct; database `eco_db` exists. |
| **“Redis disabled (no-op mode)”** | Start Redis (e.g. `docker run -p 6379:6379 redis`). Optionally set `REDIS_HOST` / `REDIS_PORT` in `.env`. |
| **“Module not found” / import errors** | Run all commands from `backend/eco_orchestrator`; use `pip install -r requirements.txt`; ensure virtualenv is activated. |
| **Vertex / LLM errors** | See [VERTEX_SETUP.md](./VERTEX_SETUP.md). Confirm `GOOGLE_APPLICATION_CREDENTIALS` and `GOOGLE_CLOUD_PROJECT`; ensure Vertex AI API is enabled. |
| **Deferral/worker not running tasks** | Postgres must be running; DB must be seeded (`python scripts/seed_db.py`); `DATABASE_URL` must be set. |

---

## Quick Reference

| What | Where |
|------|--------|
| Dependencies | `backend/eco_orchestrator/requirements.txt` |
| Env file | `backend/eco_orchestrator/.env` |
| Seed DB | `python scripts/seed_db.py` (from `backend/eco_orchestrator`) |
| Start server | `uvicorn app.main:app --reload` (from `backend/eco_orchestrator`) |
| Vertex/LLM setup | [VERTEX_SETUP.md](./VERTEX_SETUP.md) |
| API reference | [ENDPOINTS_REFERENCE.md](./ENDPOINTS_REFERENCE.md) |
