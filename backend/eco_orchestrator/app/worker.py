import asyncio
from loguru import logger

from core.database import EcoDatabase
from core.orchestrator import EcoOrchestrator
from core.grid_engine import get_default_grid_data


async def monitor_deferred_tasks():
    """Poll for deferred tasks and execute when grid is green or deadline passed."""
    db = EcoDatabase()
    orch = EcoOrchestrator()

    while True:
        try:
            grid_data = get_default_grid_data()
            intensity = grid_data["carbon_intensity_g_per_kwh"]
            runnable = await db.get_runnable_tasks(intensity)
            if runnable:
                logger.info(f"Worker found {len(runnable)} runnable deferred task(s)")
            for row in runnable:
                task = dict(row)
                result = await orch.execute_deferred_task(task)
                if result:
                    logger.info(f"Worker completed deferred task {task['id']} | receipt={result['receipt_id']}")
                else:
                    logger.warning(f"Worker failed to complete deferred task {task['id']}")
        except Exception as e:
            logger.warning(f"Deferred worker cycle failed: {e}")

        await asyncio.sleep(60)
