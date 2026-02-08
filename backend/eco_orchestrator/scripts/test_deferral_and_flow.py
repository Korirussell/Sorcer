"""
FULL TEST: Postgres + Deferral + Backend Flow

Run this script to verify:
  1. Postgres connects and tables exist
  2. Deferral process works (add task → execute → receipt)
  3. Original backend flow works (compress → triage → LLM → receipt)

Click the Run button (triangle) to run. Prints hella output.

  cd backend/eco_orchestrator
  python scripts/test_deferral_and_flow.py

Requires: Postgres running, Vertex AI creds (or TEST_FLOW_MOCK_LLM=1)
"""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

from dotenv import load_dotenv
load_dotenv(_root / ".env")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _p(msg: str, char: str = "="):
    print(f"\n{char * 60}")
    print(msg)
    print(char * 60)


def _step(n: int, msg: str):
    print(f"\n>>> STEP {n}: {msg}")


def _ok(msg: str = "OK"):
    print(f"   [OK] {msg}")


def _fail(msg: str):
    print(f"   [FAIL] {msg}")


# ---------------------------------------------------------------------------
# Part 1: Postgres
# ---------------------------------------------------------------------------

async def test_postgres() -> bool:
    """Connect to Postgres, seed tables if needed, verify."""
    _p("PART 1: POSTGRES", "=")
    _step(1, "Connecting to Postgres...")
    dsn = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/eco_db")
    print(f"   DATABASE_URL: {dsn.split('@')[-1] if '@' in dsn else dsn}")
    try:
        import asyncpg
        conn = await asyncpg.connect(dsn)
        _ok("Connected!")
    except Exception as e:
        err_str = str(e)
        if "eco_db" in err_str and "does not exist" in err_str.lower():
            print("\n   Database eco_db does not exist. Creating...")
            try:
                # Connect to postgres DB to create eco_db
                base_dsn = dsn.replace("/eco_db", "/postgres")
                tmp = await asyncpg.connect(base_dsn)
                await tmp.execute("CREATE DATABASE eco_db")
                await tmp.close()
                _ok("Created database eco_db")
                conn = await asyncpg.connect(dsn)
                _ok("Connected!")
            except Exception as e2:
                _fail(str(e2))
                print("\n   Manual: psql -U postgres -c 'CREATE DATABASE eco_db;'")
                return False
        else:
            _fail(err_str)
            print("\n   Start Postgres and set DATABASE_URL in .env")
            print("   Docker: docker run -d -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=eco_db -p 5432:5432 postgres:16")
            return False

    _step(2, "Seeding tables (tasks, receipts)...")
    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                prompt TEXT NOT NULL,
                model_tier TEXT NOT NULL,
                deadline TIMESTAMPTZ NOT NULL,
                target_intensity FLOAT NOT NULL,
                status TEXT NOT NULL DEFAULT 'deferred',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        _ok("Table tasks ready")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS receipts (
                id SERIAL PRIMARY KEY,
                task_id INTEGER NOT NULL REFERENCES tasks(id),
                response TEXT NOT NULL,
                co2_saved_g FLOAT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        _ok("Table receipts ready")
    except Exception as e:
        _fail(str(e))
        await conn.close()
        return False

    _step(3, "Verifying tables...")
    count = await conn.fetchval("SELECT COUNT(*) FROM tasks")
    print(f"   tasks row count: {count}")
    count = await conn.fetchval("SELECT COUNT(*) FROM receipts")
    print(f"   receipts row count: {count}")
    await conn.close()
    _ok("Postgres OK")
    return True


# ---------------------------------------------------------------------------
# Part 2: Deferral
# ---------------------------------------------------------------------------

async def test_deferral() -> bool:
    """Add deferred task, run get_runnable_tasks, execute, verify receipt."""
    _p("PART 2: DEFERRAL PROCESS", "=")
    from core.database import EcoDatabase
    from core.orchestrator import EcoOrchestrator
    from core.receipt_store import get_receipt

    db = EcoDatabase()
    orch = EcoOrchestrator()

    _step(1, "Adding deferred task to queue...")
    prompt = "What is 3 + 3?"
    tier = "gemini-2.0-flash"
    deadline = datetime.now(timezone.utc) + timedelta(hours=24)
    target = 200.0
    try:
        task_id = await db.add_task_to_queue(prompt, tier, deadline, target)
        _ok(f"Task added: id={task_id}, prompt={prompt!r}")
    except Exception as e:
        _fail(str(e))
        return False

    _step(2, "get_runnable_tasks with intensity=999 (dirty grid)...")
    runnable_high = await db.get_runnable_tasks(999.0)
    print(f"   runnable count: {len(runnable_high)} (should be 0 - grid too dirty)")
    if len(runnable_high) > 0:
        _fail("Expected 0 runnable when grid dirty")
        return False
    _ok("Correct: no runnable tasks when grid dirty")

    _step(3, "get_runnable_tasks with intensity=50 (green grid)...")
    runnable_low = await db.get_runnable_tasks(50.0)
    print(f"   runnable count: {len(runnable_low)} (should be >= 1)")
    if len(runnable_low) == 0:
        _fail("Expected at least 1 runnable when grid green")
        return False
    task = dict(runnable_low[0])
    _ok(f"Task {task['id']} is runnable")

    _step(4, "execute_deferred_task...")
    use_mock = os.getenv("TEST_FLOW_MOCK_LLM", "").strip() in ("1", "true", "yes")
    if use_mock:
        from unittest.mock import AsyncMock
        async def _mock_generate(prompt, model_name):
            return "[MOCK] 3 + 3 = 6"
        orch.client.generate = AsyncMock(side_effect=_mock_generate)
        print("   (using MOCK LLM)")
    result = await orch.execute_deferred_task(task)
    if result is None:
        _fail("execute_deferred_task returned None")
        return False
    _ok(f"Executed! receipt_id={result['receipt_id']}")
    print(f"   response: {result['response'][:60]!r}...")
    print(f"   eco_stats: {result['eco_stats']}")

    _step(5, "Verifying receipt in store...")
    receipt = get_receipt(result["receipt_id"])
    if receipt is None:
        _fail("receipt not found in store")
        return False
    _ok(f"Receipt found: {result['receipt_id']}")
    print(f"   net_savings: {receipt.get('net_savings')} g CO2")

    _step(6, "Verifying task completed in DB...")
    updated = await db.get_task_by_id(task["id"])
    if updated is None or updated.get("status") != "completed":
        _fail(f"task status = {updated.get('status') if updated else 'None'}")
        return False
    _ok("Task status = completed")
    print("\n   [OK] DEFERRAL PROCESS OK")
    return True


# ---------------------------------------------------------------------------
# Part 3: Original Backend Flow
# ---------------------------------------------------------------------------

async def test_backend_flow() -> bool:
    """Run the original test_flow.py main()."""
    _p("PART 3: BACKEND FLOW (compress -> triage -> LLM -> receipt)", "=")
    # Load and run test_flow main (scripts has no __init__.py)
    import importlib.util
    spec = importlib.util.spec_from_file_location("test_flow", _root / "scripts" / "test_flow.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    result = await mod.main()
    if result is None:
        return False
    print("\n   [OK] BACKEND FLOW OK")
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main():
    print("\n" + "=" * 60)
    print("  FULL TEST: Postgres + Deferral + Backend Flow")
    print("=" * 60)

    ok1 = await test_postgres()
    if not ok1:
        print("\n" + "!" * 60)
        print("  POSTGRES FAILED - fix Postgres and re-run")
        print("!" * 60)
        sys.exit(1)

    ok2 = await test_deferral()
    if not ok2:
        print("\n" + "!" * 60)
        print("  DEFERRAL FAILED - check logs above")
        print("!" * 60)
        sys.exit(1)

    ok3 = await test_backend_flow()
    if not ok3:
        print("\n" + "!" * 60)
        print("  BACKEND FLOW FAILED - check logs above")
        print("!" * 60)
        sys.exit(1)

    _p("ALL TESTS PASSED", "=")
    print("  [OK] Postgres OK")
    print("  [OK] Deferral process OK")
    print("  [OK] Backend flow OK")
    print("=" * 60 + "\n")
    print("Dreams come true.")


if __name__ == "__main__":
    # Check LLM creds
    mock = os.getenv("TEST_FLOW_MOCK_LLM", "").strip() in ("1", "true", "yes")
    has_creds = mock or os.getenv("GOOGLE_API_KEY") or (os.getenv("GOOGLE_APPLICATION_CREDENTIALS") and os.getenv("GOOGLE_CLOUD_PROJECT"))
    if not has_creds:
        print("ERROR: Set Vertex AI creds or TEST_FLOW_MOCK_LLM=1")
        sys.exit(1)
    asyncio.run(main())
