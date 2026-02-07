class GreenLogger:
    def __init__(self):
        self.WH_PER_TOKEN_PRO = 0.01  # Energy cost for Gemini Pro
        self.WH_PER_TOKEN_FLASH = 0.001 # Energy cost for Gemini Flash

    def calculate_savings(self, stats: dict, grid_intensity: float):
        """
        Input: stats from compression and triage
        Input: grid_intensity (gCO2/kWh) from your teammate's API
        """
        # 1. Calculate what the 'Dirty' baseline would have been
        # (Full prompt sent to the BIG model in the LOCAL region)
        baseline_wh = stats['original_tokens'] * self.WH_PER_TOKEN_PRO
        baseline_co2 = (baseline_wh / 1000) * 450  # 450 is standard 'Dirty' avg
        
        # 2. Calculate the 'Eco' actual spend
        model_rate = self.WH_PER_TOKEN_FLASH if "flash" in stats['model'] else self.WH_PER_TOKEN_PRO
        actual_wh = stats['final_tokens'] * model_rate
        actual_co2 = (actual_wh / 1000) * grid_intensity
        
        return {
            "wh_saved": round(baseline_wh - actual_wh, 6),
            "co2_saved_grams": round(baseline_co2 - actual_co2, 6),
            "efficiency_multiplier": round(baseline_co2 / actual_co2, 1) if actual_co2 > 0 else 100
        }