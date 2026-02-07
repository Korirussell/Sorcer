from core.compression import EcoCompressor
from core.classifier import ComplexityScorer
from core.llm_client import LLMClient
from core.logger import GreenLogger
from core.cache import cache

class EcoOrchestrator:
    def __init__(self):
        self.compressor = EcoCompressor()
        self.scorer = ComplexityScorer()
        self.client = LLMClient()
        self.logger = GreenLogger()
        self.ledger = {} # Dummy DB for receipt_id lookup
        self.cache = cache()

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
        
        # 3. Get Grid (Your "Boy's" logic)
        grid_intensity = 450.0 # Placeholder
        
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