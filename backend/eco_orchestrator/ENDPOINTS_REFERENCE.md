# Endpoints & Core Reference

## Endpoints (by router)

### main.py (app entry)
| Method | Path | Description | Handler (internal method) |
|--------|------|-------------|----------------------------|
| GET | `/health` | Liveness check. | `health()` |

---

### discovery.py
| Method | Path | Description | Handler | Request/class |
|--------|------|-------------|---------|----------------|
| GET | `/user/{user_id}/summary` | Initial dashboard load: chat IDs, project IDs, pending task count, total user savings (g). | `get_user_summary(user_id: UUID)` | path: `user_id` (UUID) |
| GET | `/chat/{chat_id}/history` | Full message history and per-chat CO2 saved and efficiency score. | `get_chat_history(chat_id: UUID)` | path: `chat_id` (UUID) |

---

### action.py
| Method | Path | Description | Handler | Request/class |
|--------|------|-------------|---------|----------------|
| POST | `/orchestrate` | Main entry: green-optimized prompt flow (compress, optional cache, then process). | `orchestrate(req: OrchestrateRequest)` | **OrchestrateRequest** (prompt, user_id, project_id, is_urgent). Uses **EcoCompressor.compress()**. |
| POST | `/deferred/execute/{task_id}` | Run a task that was held for a green window. | `deferred_execute(task_id: str)` | path: `task_id` |
| POST | `/bypass` | Direct LLM call with carbon-debt warning (no eco optimization). | `bypass(prompt: str)` | body: `prompt` (embed) |

---

### transparency.py
| Method | Path | Description | Handler | Request/class |
|--------|------|-------------|---------|----------------|
| GET | `/receipt/{receipt_id}` | Per-prompt impact: timestamp, server location, model, baseline/actual CO2, net savings, cache flag. | `get_receipt(receipt_id: str)` | path: `receipt_id` |
| GET | `/analytics/nutrition/{receipt_id}` | Nutrition-label data: energy (kWh), grid mix, og/end CO2, net savings. | `get_analytics_nutrition(receipt_id: str)` | path: `receipt_id` |

---

### intelligence.py
| Method | Path | Description | Handler | Request/class |
|--------|------|-------------|---------|----------------|
| POST | `/analyze/prompt` | Pre-check prompt efficiency (score, suggestions, potential CO2 savings). | `analyze_prompt()` | (body not yet wired) |
| GET | `/grid/map` | Global regions ranked by greenness (score + fuel breakdown). Intended: cache or call energy API. | `get_grid_map()` | — |

---

### governance.py
| Method | Path | Description | Handler | Request/class |
|--------|------|-------------|---------|----------------|
| GET | `/budget/status/{project_id}` | Carbon cap usage: limit_g, used_g, remaining %, policy. | `get_budget_status(project_id: str)` | path: `project_id` |
| GET | `/leaderboard` | Rankings (e.g. by department or user). | `get_leaderboard(filter: str)` | query: `filter` |

---

## Core modules (class / function names)

| Module | Class / function | Methods / notes |
|--------|-------------------|-----------------|
| **core.compression** | **EcoCompressor** | `__init__(aggressive=True)`, `telegraphic_compress(text)`, `compress(text)` → dict (compressed_text, original_count, final_count, saved_tokens) |
| **core.classifier** | **ComplexityScorer** | `__init__()`, `_get_lexical_density(text)`, `_get_avg_sentence_length(text)`, `score(text)` → dict (total_score, tier, etc.). Module-level: `score_complexity(text)` → float |
| **core.grid_engine** | (no class) | `get_grid_carbon(region=None)` → dict (region, intensity). Placeholder for WattTime/ElectricityMap. |
| **core.pii_scrubber** | (no class) | `scrub_pii(text)` → str. Placeholder. |
| **core.orchestrator** | **EcoOrchestrator** | `__init__()`, `async process(req)` — compress, triage, (cache), LLM. Uses EcoCompressor, ComplexityScorer. |
| **core.llm_client** | **LLMClient** | `__init__()`, `async generate(prompt, model_name)`, `async raw_llm_generate(prompt, model_name)`. |
| **core.logger** | **GreenLogger** | `__init__()`, `calculate_savings(stats, grid_intensity)` → wh_saved, co2_saved_grams, efficiency_multiplier. |

---

## Quick lookup: handler → core usage

- **orchestrate** → `EcoCompressor.compress()` (action.py uses module-level `compressor`).
- **analyze_prompt** → (intended: **ComplexityScorer** or similar).
- **get_grid_map** → (intended: cache + **grid_engine** or energy API).
- **get_receipt / get_analytics_nutrition** → (intended: ledger/DB + **GreenLogger**-style stats).
