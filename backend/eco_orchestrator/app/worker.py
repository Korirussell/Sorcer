import asyncio
from loguru import logger

from core.database import EcoDatabase
from core.llm_client import LLMClient
from core.logger import GreenLogger


async def monitor_deferred_tasks():
    db = EcoDatabase()
    client = LLMClient()
    logger_instance = GreenLogger()

    while True:
        try:
            current_grid = 150.0
            ready_tasks = await db.get_runnable_tasks(current_grid)

            for task in ready_tasks:
                try:
                    logger.info(f"Executing deferred task: {task['id']}")
                    response = await client.generate(task["prompt"], task["model_tier"])
                    stats = {"co2_saved_grams": 1.4}
                    await db.complete_task(task["id"], response, stats)
                except Exception as e:
                    logger.warning(f"Deferred task {task.get('id')} failed: {e}")

        except Exception as e:
            logger.warning(
                f"Deferred worker cycle failed (DB down or tables missing?): {e}"
            )

        await asyncio.sleep(60)
