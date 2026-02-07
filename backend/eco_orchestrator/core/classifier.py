import re
import math

class ComplexityScorer:
    def __init__(self):
        # 1. Structural Markers (Logic & Coding)
        self.code_patterns = [
            r"def\s+\w+\(.*\):",      # Python function
            r"class\s+\w+[:\(]",      # Class definition
            r"import\s+\w+",          # Imports
            r"[\{\}\[\]]{3,}",        # Heavy nested brackets
            r"(\+\+|--|&&|\|\|)",     # Logical operators
            r"(\w+\s*=\s*\w+;)"       # Semicolon assignments
        ]
        
        # 2. STEM/Reasoning Keywords (Weighted high)
        self.complex_keywords = {
            "analyze": 1.5, "calculate": 2.0, "reason": 1.8,
            "optimize": 2.0, "architect": 2.5, "debug": 2.0,
            "theorem": 2.5, "derivative": 2.0, "gradient": 2.0,
            "asymptotic": 3.0, "complexity": 1.5
        }

    def _get_lexical_density(self, text: str) -> float:
        """Unique / Total words. Higher density usually means more info-heavy."""
        words = re.findall(r'\w+', text.lower())
        if not words: return 0.0
        return len(set(words)) / len(words)

    def _get_avg_sentence_length(self, text: str) -> float:
        """Longer sentences usually imply more complex instructions."""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s for s in sentences if s.strip()]
        if not sentences: return 0.0
        word_counts = [len(s.split()) for s in sentences]
        return sum(word_counts) / len(sentences)

    def score(self, text: str) -> dict:
        """
        Returns a score from 0.0 (Easy/Flash) to 10.0 (Hard/Pro).
        Threshold for 'Pro' is usually > 4.5
        """
        if not text: return {"total_score": 0.0, "tier": "flash"}

        raw_score = 0.0
        
        # A. Structure: Check for code patterns (+3.0 per unique pattern)
        for pattern in self.code_patterns:
            if re.search(pattern, text):
                raw_score += 3.0
                break # Cap the code bonus

        # B. Vocabulary: Check weighted keywords
        words = text.lower().split()
        for word, weight in self.complex_keywords.items():
            if word in words:
                raw_score += weight

        # C. Physics: Lexical Density & Sentence Length
        density = self._get_lexical_density(text)
        avg_len = self._get_avg_sentence_length(text)
        
        # Normalize density (0.5-1.0 is common) and length
        raw_score += (density * 5)
        raw_score += (min(avg_len, 50) / 10)

        # Final Scaling
        final_score = min(10.0, round(raw_score, 2))
        
        return {
            "total_score": final_score,
            "lexical_density": round(density, 2),
            "avg_sentence_length": round(avg_len, 2),
            "tier": "gemini-1.5-pro" if final_score > 4.5 else "gemini-1.5-flash"
        }

# Logic for your endpoint
def score_complexity(text: str) -> float:
    scorer = ComplexityScorer()
    res = scorer.score(text)
    return res["total_score"]