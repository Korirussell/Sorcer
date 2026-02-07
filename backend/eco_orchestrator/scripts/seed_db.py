"""
Seed Postgres so tasks and receipts tables exist. Run once before using deferral or worker.

  cd backend/eco_orchestrator && python scripts/seed_db.py

Uses DATABASE_URL from env or .env (default: postgresql://user:pass@localhost:5432/eco_db).
"""
import asyncio
import os
import sys
from pathlib import Path

# Add package root so we can load dotenv and use core
_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

from dotenv import load_dotenv
load_dotenv(_root / ".env")

import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/eco_db")

TASKS_TABLE = """
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    prompt TEXT NOT NULL,
    model_tier TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    target_intensity FLOAT NOT NULL,
    status TEXT NOT NULL DEFAULT 'deferred',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

RECEIPTS_TABLE = """
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    response TEXT NOT NULL,
    co2_saved_g FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""


async def seed():
    print(f"Connecting to DB... ({DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'check DATABASE_URL'})")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
    except Exception as e:
        print("ERROR: Could not connect to Postgres.", e)
        print("Start Postgres and set DATABASE_URL (or use default).")
        sys.exit(1)

    try:
        await conn.execute(TASKS_TABLE)
        print("✓ Table tasks ready.")
        await conn.execute(RECEIPTS_TABLE)
        print("✓ Table receipts ready.")
    finally:
        await conn.close()

    print("Done. DB is seeded.")


if __name__ == "__main__":
    asyncio.run(seed())
