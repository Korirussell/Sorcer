import asyncio
from core.database import EcoDatabase
from core.llm_client import LLMClient
from core.logger import GreenLogger

async def monitor_deferred_tasks():
    db = EcoDatabase()
    client = LLMClient()
    logger = GreenLogger()
    
    while True:
        # 1. Check current grid (Mocking 150g for demo)
        current_grid = 150.0 
        
        # 2. Get ready tasks
        ready_tasks = await db.get_runnable_tasks(current_grid)
        
        for task in ready_tasks:
            print(f"Executing deferred task: {task['id']}")
            
            # 3. Call LLM
            response = await client.generate(task['prompt'], task['model_tier'])
            
            # 4. Save results (Using mock stats for brevity)
            stats = {"co2_saved_grams": 1.4} 
            await db.complete_task(task['id'], response, stats)
            
        # 5. Sleep for 60s to save CPU energy
        await asyncio.sleep(60)