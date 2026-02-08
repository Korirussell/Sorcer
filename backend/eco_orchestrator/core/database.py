import asyncpg
import os
from datetime import datetime, timezone

class EcoDatabase:
    def __init__(self):
        self.dsn = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/eco_db")

    async def add_task_to_queue(self, prompt, model, deadline, target):
        conn = await asyncpg.connect(self.dsn)
        task_id = await conn.fetchval('''
            INSERT INTO tasks (prompt, model_tier, deadline, target_intensity, status)
            VALUES ($1, $2, $3, $4, 'deferred')
            RETURNING id
        ''', prompt, model, deadline, target)
        await conn.close()
        return task_id

    async def get_task_by_id(self, task_id: int):
        """Fetch a single task by id. Returns dict with prompt, model_tier, etc. or None."""
        conn = await asyncpg.connect(self.dsn)
        row = await conn.fetchrow(
            "SELECT id, prompt, model_tier, deadline, target_intensity, status FROM tasks WHERE id = $1",
            task_id,
        )
        await conn.close()
        if row is None:
            return None
        return dict(row)

    async def get_runnable_tasks(self, current_intensity):
        conn = await asyncpg.connect(self.dsn)
        now = datetime.now(timezone.utc)
        # Run when: grid is green (current <= target) OR deadline passed
        rows = await conn.fetch('''
            SELECT id, prompt, model_tier, deadline, target_intensity, status 
            FROM tasks 
            WHERE status = 'deferred' 
            AND (target_intensity >= $1 OR deadline <= $2)
            ORDER BY deadline ASC
        ''', current_intensity, now)
        await conn.close()
        return rows

    async def complete_task(self, task_id, response, co2_stats):
        conn = await asyncpg.connect(self.dsn)
        async with conn.transaction():
            await conn.execute('UPDATE tasks SET status = $1 WHERE id = $2', 'completed', task_id)
            await conn.execute('''
                INSERT INTO receipts (task_id, response, co2_saved_g)
                VALUES ($1, $2, $3)
            ''', task_id, response, co2_stats['co2_saved_grams'])
        await conn.close()