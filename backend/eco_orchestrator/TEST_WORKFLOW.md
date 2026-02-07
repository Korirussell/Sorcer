# How to test the workflow

## 1. API key and env

- Put `GOOGLE_API_KEY=your_key` in `backend/eco_orchestrator/.env` (already there for dev).
- The app loads `.env` on startup.

## 2. Postgres (optional for basic test)

- **To test only POST /orchestrate:** You can skip Postgres. The app runs; deferral is off (grid placeholder 100 < 200), so no DB is used.
- **To test deferral or the worker:** Start Postgres, then:
  ```bash
  cd backend/eco_orchestrator
  python scripts/seed_db.py
  ```
  Creates `tasks` and `receipts` tables. If Postgres isn’t running, the script exits with an error.

## 3. Redis (optional)

- If Redis isn’t running, the app still starts; cache is disabled. No need to start Redis to test.

## 4. Start the server

From repo root or from `backend/eco_orchestrator`:

```bash
cd backend/eco_orchestrator
uvicorn app.main:app --reload
```

If port 8000 is in use, stop the other process or use `--port 8001`.

## 5. Hit the API

- **Health:** `GET http://127.0.0.1:8000/health`
- **Orchestrate (main flow):**
  ```bash
  curl -X POST http://127.0.0.1:8000/orchestrate \
    -H "Content-Type: application/json" \
    -d "{\"prompt\":\"What is 2+2?\",\"user_id\":\"u1\",\"project_id\":\"p1\"}"
  ```
  You should get `status: complete`, `response` from Gemini, `receipt_id`, and `eco_stats`.
- **Receipt:** `GET http://127.0.0.1:8000/receipt/{receipt_id}` (use the `receipt_id` from the orchestrate response).
- **Docs:** `http://127.0.0.1:8000/docs`

## 6. If you changed code

Restart the server (or rely on `--reload`). The app now uses **gemini-2.0-flash** (new API); if you still see `gemini-1.5-flash` in errors, the old process is still running.

## Summary

| Want to…              | Do this |
|-----------------------|--------|
| Test orchestrate only | .env with GOOGLE_API_KEY → start uvicorn → POST /orchestrate |
| Test with DB/worker   | Start Postgres → run `python scripts/seed_db.py` → start uvicorn |
| Test with cache       | Start Redis → start uvicorn |
