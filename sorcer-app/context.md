# PROJECT CONTEXT: SOURCER (DYNAMIC ENGINE)

## 1. Project Overview
**Name:** Sourcer
**Goal:** Build a dynamic AI Model Router that selects the most sustainable LLM in real-time based on environmental variables (Grid Carbon, Weather/Cooling, Model Efficiency).
**Core Innovation:** We do NOT default to a small model. We use Data Science to find the *cleanest* high-performance model at any given second.

## 2. Tech Stack (Strict Constraints)
- **Frontend:** Next.js 14, Tailwind, Vercel AI SDK.
- **Backend:** Python (FastAPI).
- **Data Pipeline:** - **Grid Data:** WattTime API or ElectricityMaps (Real-time CO2/kWh).
    - **Weather Data:** OpenWeatherMap API (Real-time Temp at Data Center locations).
- **ML Model:** A lightweight Scikit-Learn regression model to forecast grid intensity for the next 24h.
- **Database:** Pinecone (Semantic Cache), Redis (Task Queue).

## 3. The "Oracle" Logic (Backend)
**Endpoint:** `POST /api/oracle/route`
**Input:** User Prompt + Urgency Level.
**Process:**
1.  **Fetch Candidates:** List available models (GPT-4, Claude 3, Gemini 1.5, Llama 3).
2.  **Map to Infrastructure:** - *Assumption:* GPT-4 -> US-East (Virginia).
    - *Assumption:* Claude -> US-West (Oregon/AWS).
    - *Assumption:* Gemini -> US-Central (Iowa/Google).
3.  **Calculate "Carbon Score":**
    - `Score = (Grid_Carbon_Intensity * Model_Energy_Usage) * Cooling_Factor(Local_Temp)`
4.  **Select Winner:** The model with the lowest Score.
5.  **Return:** The selected `model_id` to the Frontend.

## 4. Key Features to Build

### A. The "Forecast" Widget (Frontend)
- A graph showing "Carbon Intensity" over the next 24 hours.
- A "Best Time" indicator: "Wait 4 hours to save 40% carbon."

### B. The "Night Owl" Scheduler (Backend)
- A Celery task that doesn't just run at 4 AM fixed time.
- It runs `check_forecast()` and executes specifically when the ML model predicts the *absolute lowest* carbon dip.

## 5. API Contracts

**GET /api/forecast**
```json
{
  "current_best_model": "claude-3-sonnet",
  "reason": "Oregon Grid is 90% Hydro right now.",
  "forecast": [
    {"hour": "14:00", "intensity": "high"},
    {"hour": "04:00", "intensity": "optimal"}
  ]
}