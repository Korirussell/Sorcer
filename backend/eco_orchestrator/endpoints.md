# Carbon-Aware AI Orchestrator: API Reference
Goal: Minimize environmental footprint via verifiable AI orchestration.

---

## 1. Discovery Endpoints
Used to populate the dashboard and initial user state.

### GET /user/{user_id}/summary
Description: Initial load to populate sidebars and global stats.
Input (Path): user_id (uuid)
Output (JSON):
{
  "chat_ids": ["uuid_chat1", "uuid_chat2"],
  "project_ids": ["proj_marketing", "proj_dev"],
  "pending_tasks_count": 3,
  "total_user_savings_g": 450.5
}

### GET /chat/{chat_id}/history
Description: Fetches full message history and efficiency stats for a specific thread.
Input (Path): chat_id (uuid)
Output (JSON):
{
  "messages": [
    {"role": "user", "content": "string", "receipt_id": "rec_1"},
    {"role": "assistant", "content": "string", "receipt_id": "rec_1"}
  ],
  "total_chat_co2_saved_g": 12.4,
  "efficiency_score": 0.94
}

---

## 2. Action Endpoints
Core processing and routing logic.

### POST /orchestrate
Description: Main entry point for green-optimized prompts.
Input (JSON):
{
  "prompt": "string",
  "user_id": "uuid",
  "project_id": "string",
  "is_urgent": false,
  "bypass_eco": false
}
Output (JSON):
{
  "status": "complete",
  "chat_id": "user_id_uuid",
  "response": "string",
  "receipt_id": "rec_uuid",
  "deferred": false
}

### POST /deferred/execute/{task_id}
Description: Triggers a task held for a green window.
Input (Path): task_id (string)
Output (JSON):
{
  "status": "processing",
  "new_eta": "ISO-TIMESTAMP",
  "current_grid_intensity": 140.2
}

### POST /bypass
Description: Direct LLM access with a carbon debt penalty calculation.
Input (JSON):
{
  "prompt": "string",
  "api_key": "string"
}
Output (JSON):
{
  "response": "string",
  "warning": "No CO2 savings applied",
  "potential_savings_lost": "1.4g"
}

---

## 3. Transparency and Analytics
Verifiable environmental impact and user feedback.

### GET /receipt/{receipt_id}
Description: Detailed impact of a singular prompt.
Input (Path): receipt_id (string)
Output (JSON):
{
  "timestamp": "ISO-TIMESTAMP",
  "server_location": "us-central1 (Iowa)",
  "model_used": "gemini-1.5-flash",
  "baseline_co2_est": 4.2,
  "actual_co2": 1.8,
  "net_savings": 2.4,
  "was_cached": false
}

### GET /analytics/nutrition/{receipt_id}
Description: Powers the UI Nutrition Label badge.
Input (Path): receipt_id (string)
Output (JSON):
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

---

## 4. Intelligence and Governance
Pre-check and administrative tracking.

### POST /analyze/prompt
Description: Pre-check efficiency rating.
Input (JSON): {"prompt": "string"}
Output (JSON):
{
  "score": 85,
  "suggestions": ["Remove redundant adjectives"],
  "potential_co2_savings": "0.8g"
}

### GET /grid/map
Description: Global ranking of cloud regions.
Output (JSON):
{
  "regions": [
    { 
      "name": "us-central1", 
      "score": 92, 
      "breakdown": { "solar": 80, "nuclear": 12, "coal": 8 } 
    }
  ]
}

### GET /budget/status/{project_id}
Description: Usage tracking against a carbon cap.
Input (Path): project_id (string)
Output (JSON):
{
  "limit_g": 5000,
  "used_g": 1200,
  "remaining_percent": 76.0,
  "policy_active": "Standard"
}

### GET /leaderboard
Description: Rankings for departments or users.
Input (Query): filter (string)
Output (JSON):
{
  "rankings": [
    { "name": "Engineering", "saved_kg": 24.5 },
    { "name": "Marketing", "saved_kg": 18.2 }
  ]
}