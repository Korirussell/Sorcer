import asyncio
from loguru import logger

# from core.database import EcoDatabase  # Disabled
from core.llm_client import LLMClient
from core.logger import GreenLogger


async def monitor_deferred_tasks():
    # db = EcoDatabase()  # Disabled
    client = LLMClient()
    logger_instance = GreenLogger()

    while True:
        try:
            # Disabled - no database connection
            logger.info("Deferred task monitoring disabled (no database)")
            
        except Exception as e:
            logger.warning(f"Deferred worker cycle failed: {e}")

        await asyncio.sleep(60)
