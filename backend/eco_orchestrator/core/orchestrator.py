from core.compression import EcoCompressor
from core.classifier import ComplexityScorer
from core.llm_client import LLMClient
from core.logger import GreenLogger
from core.cache import cache
from core.database import EcoDatabase
class EcoOrchestrator:
    def __init__(self):
        self.compressor = EcoCompressor()
        self.scorer = ComplexityScorer()
        self.client = LLMClient()
        self.logger = GreenLogger()
        self.ledger = {} # Dummy DB for receipt_id lookup
        self.cache = cache()
        self.db = EcoDatabase() 
        

    async def process(self, req):

        '''
        ok so we compress, 
        '''

        
        if req.bypass_eco:
            results = await self.client.raw_llm_generate(req.prompt)
            #ok this is deeper than i thought. we need to still get receipt, estimate of energy etc
        

        #0 : CHECK CACHE
        
        # 1. Compress & Scub
        comp = self.compressor.compress(req.prompt)
        
        # 2. Triage
        triage = self.scorer.score(comp['compressed_text'])
        tier = triage['tier']
        # 3. Get Grid (Your "Boy's" logic)
        grid_intensity = 450.0 # Placeholder
        GRID_THRESHOLD = 200
        if not req.is_urgent and grid_intensity > GRID_THRESHOLD:
            task_id = await self.db.add_task_to_queue(
                comp['compressed_text'], tier, req.deadline, GRID_THRESHOLD
            )
            return {"status": "deferred", "task_id": str(task_id), "message": "Queued for green window."}
        # 4. Execute
        
        raw_response = await self.client.generate(comp['compressed_text'], triage['tier'])
        
        # 5. Log & Generate Receipt
        impact = self.logger.calculate_savings({
            "original_tokens": comp['original_count'],
            "final_tokens": comp['final_count'],
            "model": triage['tier']
        }, grid_intensity)
        
        receipt_id = f"rec_{id(raw_response)}"
        self.ledger[receipt_id] = impact # Now get_receipt works!
        
        return {
            "response": raw_response,
            "receipt_id": receipt_id,
            "eco_stats": impact
        }