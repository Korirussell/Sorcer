# 🧙‍♂️ PROJECT CONTEXT: SOURCER

## 1. Project Identity
- **Name:** Sorcer (also referenced as "Sourcer" in some contexts)
- **The Vibe:** "Bioluminescent Brutalism" / "Green Sorcerer"
- **Core Mechanic:** A sustainable AI wrapper that routes prompts based on grid carbon intensity. The system intelligently selects AI models and data center regions to minimize environmental impact while maintaining performance.
- **Tagline:** "Visualize carbon intensity of your grid with bioluminescent brutalism"

## 2. Architecture & Boundaries

### Frontend (`/sorcer-app`)
- **Framework:** Next.js 16.0.10 (App Router)
- **Styling:** Tailwind CSS 4.1.13, Framer Motion 11.18.2
- **Icons:** Lucide React 0.446.0
- **State Management:** React Context (EnergyContext for eco mode/model selection)
- **AI SDK:** Vercel AI SDK 6.0.37 with @ai-sdk/react
- **Database:** Drizzle ORM with PostgreSQL
- **Key Libraries:**
  - CodeMirror 6 for code editing
  - React Flow (@xyflow/react) for visualizations
  - Radix UI components
  - Sonner for toasts
  - Next Themes for dark mode

### Backend (`/backend`)
- **Framework:** Python FastAPI
- **Structure:** `eco_orchestrator/` package
- **Core Modules:**
  - `core/`: classifier, compression, grid_engine, pii_scrubber
  - `graph/`: builder, nodes, state (workflow orchestration)
  - `app/routers/`: API route handlers
  - `app/schemas/`: Pydantic data models

### Boundary Rule
**Frontend consumes Backend APIs. Frontend *never* touches Backend logic directly.** The frontend engineer works exclusively in `sorcer-app/` and treats `backend/` as a read-only API contract.

## 3. The Design System (Current State)

### Colors (Tailwind Custom Palette)
Defined in `tailwind.config.ts` and `globals.css`:
- **`void`**: `#020617` - Deep dark background (primary)
- **`mana`**: `#10b981` - Emerald green (sustainable/eco actions)
- **`toxic`**: `#a3e635` - Lime green (high-energy/warning states)
- **`blight`**: `#7f1d1d` - Dark red (destructive/high carbon)
- **`mist`**: `#e2e8f0` - Light gray (text/foreground)

### Fonts
- **Primary Sans:** Geist (via `next/font/google`)
  - Variable: `--font-geist`
  - Used for: Body text, UI elements
- **Monospace:** Geist Mono
  - Variable: `--font-geist-mono`
  - Used for: Code blocks, technical displays

### Key UI Components

#### Core Interaction Components
- **`SpellBar`** (`components/SpellBar.tsx`): Main input component with model selector
  - Features: Auto/Manual mode toggle, model dropdown (Eco/Force/Power), spell input field
  - Modes: "auto" (AI selects optimal model) or "manual" (user selects)
  - Models: `google/gemini-2.5-flash-lite` (Eco), `anthropic/claude-haiku-4.5` (Force), `openai/gpt-5.2` (Power)

- **`SummonButton`** (`components/SummonButton.tsx`): Floating action button (bottom-right)
  - Fixed position, magical particle effects, mana glow on hover

- **`CarbonIndicator`** (`components/CarbonIndicator.tsx`): Top-right status widget
  - Shows current mode (Auto Sustainable/Eco/Force), carbon saved counter
  - Real-time updates with animation

- **`CarbonReceipt`** (`components/CarbonReceipt.tsx`): Detailed impact modal
  - Transaction breakdown, energy source breakdown, sustainability score
  - Shows CO₂ saved, equivalent trees, money saved

#### Layout Components
- **`LayoutClient`** (`components/LayoutClient.tsx`): Main layout orchestrator
  - Manages sidebar, view switching (default/map/receipt/profile)
  - Integrates CarbonIndicator, SorcerSidebar, background effects

- **`SorcerSidebar`** (`components/SorcerSidebar.tsx`): Left navigation panel
  - Sections: Chat History, Profile, Carbon Footprint, Carbon Map
  - Shows carbon stats, chat history, mode indicators

- **`DynamicBackground`** (`components/DynamicBackground.tsx`): Animated background layer
- **`GardenBackground`** (`components/GardenBackground.tsx`): Organic background effects
- **`BackgroundParticles`** (`components/background-particles.tsx`): Particle system

#### Chat Components
- **`Chat`** (`components/chat.tsx`): Main chat interface
- **`Messages`** (`components/messages.tsx`): Message list renderer
- **`Message`** (`components/message.tsx`): Individual message component
- **`MultimodalInput`** (`components/multimodal-input.tsx`): Chat input with attachments

#### Visualization Components
- **`MedievalMap`** (`components/MedievalMap.tsx`): Global carbon intensity map view
- **`ProfileComparison`** (`components/ProfileComparison.tsx`): User profile analytics

#### AI Elements (in `components/ai-elements/`)
- Artifact, Canvas, Chain-of-Thought, Checkpoint, Confirmation, Connection, Controls
- Conversation, Edge, Image, Inline Citation, Loader, Message, Model Selector
- Node, Open in Chat, Panel, Plan, Prompt Input, Queue, Reasoning, Shimmer
- Sources, Suggestion, Task, Tool, Toolbar, Web Preview

### Design Patterns
- **Bioluminescent Brutalism:** Dark void background with glowing green accents
- **Glassmorphism:** Backdrop blur effects (`backdrop-blur-xl`, `bg-black/20`)
- **Magical Particles:** Animated particle effects on interactive elements
- **Border Glows:** Subtle `border-mana/30` with `shadow-[0_0_20px_#10b981]` effects
- **Rounded Corners:** `rounded-xl`, `rounded-2xl` for modern feel
- **Transitions:** `transition-all duration-200/300` for smooth interactions

## 4. API Contract (The Backend Interface)

### Base URL
The backend FastAPI server runs separately. CORS is configured for `http://localhost:3000` and `http://127.0.0.1:3000`.

### Health Check
- **`GET /health`**
  - Response: `{"status": "ok"}`

### Discovery Endpoints
Used to populate dashboard and initial user state.

#### `GET /user/{user_id}/summary`
**Description:** Initial load to populate sidebars and global stats.

**Path Parameters:**
- `user_id` (UUID): User identifier

**Response:**
```json
{
  "chat_ids": ["uuid_chat1", "uuid_chat2"],
  "project_ids": ["proj_marketing", "proj_dev"],
  "pending_tasks_count": 3,
  "total_user_savings_g": 450.5
}
```

#### `GET /chat/{chat_id}/history`
**Description:** Fetches full message history and efficiency stats for a specific thread.

**Path Parameters:**
- `chat_id` (UUID): Chat thread identifier

**Response:**
```json
{
  "messages": [
    {"role": "user", "content": "string", "receipt_id": "rec_1"},
    {"role": "assistant", "content": "string", "receipt_id": "rec_1"}
  ],
  "total_chat_co2_saved_g": 12.4,
  "efficiency_score": 0.94
}
```

### Action Endpoints
Core processing and routing logic.

#### `POST /orchestrate`
**Description:** Main entry point for green-optimized prompts.

**Request Body:**
```json
{
  "prompt": "string",
  "user_id": "uuid",
  "project_id": "string",
  "is_urgent": false,
  "bypass_eco": false
}
```

**Response:**
```json
{
  "status": "complete",
  "chat_id": "user_id_uuid",
  "response": "string",
  "receipt_id": "rec_uuid",
  "deferred": false
}
```

#### `POST /deferred/execute/{task_id}`
**Description:** Triggers a task held for a green window.

**Path Parameters:**
- `task_id` (string): Task identifier

**Response:**
```json
{
  "status": "processing",
  "new_eta": "ISO-TIMESTAMP",
  "current_grid_intensity": 140.2
}
```

#### `POST /bypass`
**Description:** Direct LLM access with a carbon debt penalty calculation.

**Request Body:**
```json
{
  "prompt": "string",
  "api_key": "string"
}
```

**Response:**
```json
{
  "response": "string",
  "warning": "No CO2 savings applied",
  "potential_savings_lost": "1.4g"
}
```

### Transparency and Analytics Endpoints
Verifiable environmental impact and user feedback.

#### `GET /receipt/{receipt_id}`
**Description:** Detailed impact of a singular prompt.

**Path Parameters:**
- `receipt_id` (string): Receipt identifier

**Response:**
```json
{
  "timestamp": "ISO-TIMESTAMP",
  "server_location": "us-central1 (Iowa)",
  "model_used": "gemini-1.5-flash",
  "baseline_co2_est": 4.2,
  "actual_co2": 1.8,
  "net_savings": 2.4,
  "was_cached": false
}
```

#### `GET /analytics/nutrition/{receipt_id}`
**Description:** Powers the UI Nutrition Label badge.

**Path Parameters:**
- `receipt_id` (string): Receipt identifier

**Response:**
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

### Intelligence and Governance Endpoints
Pre-check and administrative tracking.

#### `POST /analyze/prompt`
**Description:** Pre-check efficiency rating.

**Request Body:**
```json
{
  "prompt": "string"
}
```

**Response:**
```json
{
  "score": 85,
  "suggestions": ["Remove redundant adjectives"],
  "potential_co2_savings": "0.8g"
}
```

#### `GET /grid/map`
**Description:** Global ranking of cloud regions.

**Response:**
```json
{
  "regions": [
    {
      "name": "us-central1",
      "score": 92,
      "breakdown": {
        "solar": 80,
        "nuclear": 12,
        "coal": 8
      }
    }
  ]
}
```

#### `GET /budget/status/{project_id}`
**Description:** Usage tracking against a carbon cap.

**Path Parameters:**
- `project_id` (string): Project identifier

**Response:**
```json
{
  "limit_g": 5000,
  "used_g": 1200,
  "remaining_percent": 76.0,
  "policy_active": "Standard"
}
```

#### `GET /leaderboard`
**Description:** Rankings for departments or users.

**Query Parameters:**
- `filter` (string, optional): Filter criteria

**Response:**
```json
{
  "rankings": [
    {"name": "Engineering", "saved_kg": 24.5},
    {"name": "Marketing", "saved_kg": 18.2}
  ]
}
```

## 5. Current Implementation Status

### ✅ Working Features
- **Frontend UI:** Complete design system with SpellBar, SummonButton, CarbonIndicator, CarbonReceipt
- **Layout System:** Responsive layout with sidebar, dynamic backgrounds, particle effects
- **Energy Context:** React context for managing eco mode (auto/manual) and model selection
- **Chat Interface:** Full chat UI with message rendering, multimodal input, artifact support
- **Design Tokens:** Complete Tailwind config with custom colors, fonts, and theme variables
- **Backend API Structure:** All router endpoints defined with response schemas
- **API Documentation:** Comprehensive `endpoints.md` in backend folder

### 🚧 In Progress / TODO
- **Backend Implementation:** Router endpoints return mock data; core logic (grid_engine, classifier) needs implementation
- **API Integration:** Frontend not yet connected to backend APIs (currently using mock data)
- **Data Models:** Pydantic schemas in `app/schemas/` are placeholder (TODO comments)
- **Grid Engine:** `core/grid_engine.py` exists but needs real-time carbon intensity data integration
- **Vector Store:** `data/vector_store/` directory exists but implementation unclear
- **Carbon Receipt Data:** Currently using mock data; needs backend `/receipt/{receipt_id}` integration
- **MedievalMap:** Component exists but "coming soon" in sidebar; needs `/grid/map` integration
- **Profile Comparison:** Component exists but needs user analytics backend integration
- **Chat History:** Sidebar shows mock data; needs `/chat/{chat_id}/history` integration
- **Orchestration Logic:** `/orchestrate` endpoint needs actual routing logic based on grid intensity

### 📝 Notes for Frontend Engineer
- The backend is **read-only** for you. All API contracts are documented above.
- Current frontend uses mock data for carbon indicators, receipts, and chat history.
- When ready to integrate, use the endpoint URLs above (base URL TBD - check backend configuration).
- The `EnergyContext` manages mode selection but doesn't yet communicate with backend `/orchestrate`.
- All backend endpoints follow RESTful conventions with JSON request/response bodies.
- UUIDs are used for user_id, chat_id, receipt_id, task_id identifiers.

---

**Last Updated:** Generated from codebase analysis
**Frontend Engineer Scope:** `sorcer-app/` directory only
**Backend Scope:** Read-only reference for API contracts

