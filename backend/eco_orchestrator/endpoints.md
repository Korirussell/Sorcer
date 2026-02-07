# Carbon-Aware AI Orchestrator: API Reference (V2)
**Design Philosophy:** Verifiable, transparent, and high-performance carbon optimization.

---

## 1. Action Endpoints

### POST /orchestrate
Primary entry point for LLM requests.
* **Input (JSON):**
    ```json
    {
      "prompt": "string",
      "user_id": "uuid",
      "project_id": "string",
      "is_urgent": false,  // True: Immediate | False: Defer for Green
      "bypass_eco": false
    }
    ```
* **Output (JSON):**
    ```json
    {
      "status": "complete",
      "chat_id": "user_id_uuid",
      "response": "string", 
      "receipt_id": "rec_uuid",
      "deferred": false
    }
    ```

---

## 2. Transparency Layer (The Proof)

### GET /receipt/{receipt_id}
Detailed environmental impact of a singular prompt.
* **Output (JSON):**
    ```json
    {
      "timestamp": "ISO-TIMESTAMP",
      "server_location": "us-central1 (Iowa)",
      "model_used": "gemini-1.5-flash",
      "baseline_co2_est": 4.2, // gCO2
      "actual_co2": 1.8,       // gCO2
      "net_savings": 2.4,      // gCO2
      "was_cached": false
    }
    ```

### GET /analytics/nutrition/{receipt_id}
Summary data for the UI "Nutrition Label" badge.
* **Output (JSON):**
    ```json
    {
      "energy_kwh": 0.004,
      "grid_source": {
        "wind": 60,
        "solar": 22,
        "gas": 18
      },
      "og_co2": 4.2,
      "end_co2": 1.8,
      "net_savings": 2.4
    }
    ```

---

## 3. Intelligence Endpoints

### GET /grid/map
Current global "Greenness" ranking.
* **Output (JSON):**
    ```json
    {
      "regions": [
        { 
          "name": "us-central1", 
          "score": 92, 
          "breakdown": { "solar": 80, "nuclear": 12, "coal": 8 } 
        }
      ]
    }
    ```

### POST /analyze/prompt
Pre-check efficiency rating.
* **Input (JSON):** `{"prompt": "string"}`
* **Output (JSON):**
    ```json
    {
      "score": 85, // Higher is more efficient
      "suggestions": ["Remove redundant adjectives"],
      "potential_co2_savings": "0.8g"
    }
    ```