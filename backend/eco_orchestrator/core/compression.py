import re

class EcoCompressor:
    # Move patterns here if you want them accessible without an instance
    FLUFF_PATTERNS = [
        r"\b(please|kindly|could you|would you mind|i was wondering if|thank you)\b",
        r"\s+", 
    ]
    STOP_WORDS = {"the", "a", "an", "is", "of", "to", "for", "in", "with", "on", "at", "by"}

    def __init__(self, aggressive=True):
        self.aggressive = aggressive

    def telegraphic_compress(self, text: str) -> str:
        """Aggressive compression by stripping high-frequency low-value words."""
        words = text.split()
        return " ".join([w for w in words if w.lower() not in self.STOP_WORDS])

    def compress(self, text: str) -> dict:
        """Returns a compressed version of the string and the savings stats."""
        original_tokens = len(text.split())
        
        # 1. Lowercase and remove politeness
        compressed = text.lower()
        for pattern in self.FLUFF_PATTERNS:
            compressed = re.sub(pattern, " ", compressed).strip()
            
        # 2. PII/URL Tokenization
        compressed = re.sub(r'\S+@\S+\.\S+', '[E]', compressed)
        compressed = re.sub(r'http\S+', '[U]', compressed)

        # 3. Optional Telegraphic logic
        if self.aggressive:
            compressed = self.telegraphic_compress(compressed)

        final_tokens = len(compressed.split())
        
        return {
            "compressed_text": compressed,
            "original_count": original_tokens,
            "final_count": final_tokens,
            "saved_tokens": max(0, original_tokens - final_tokens)
        }