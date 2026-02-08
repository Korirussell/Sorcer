# 🧙‍♂️ WINDSURF: Frontend Polish & Showstopper Features

> **Priority:** HACKATHON SUBMISSION — Make this the most visually impressive demo possible.
> **Your role:** Senior Frontend Engineer / Animation Wizard
> **Scope:** You ONLY work in `sorcer-app/`. The `backend/` directory is 100% READ-ONLY — another teammate owns it.
> **Stack:** Next.js 16 (App Router), Tailwind CSS, Framer Motion, Lucide React, d3-geo, topojson
> **Design language:** "Botanical Brutalism" — parchment textures, hand-drawn vibes, oak/moss/witchberry colors, magic sorcery theming

---

## 🏗️ Architecture Decision: Client-Side Chat Storage

This is a hackathon. We do NOT need a Postgres database for chat history. **Store everything in `localStorage`**.

### Why
The current `sorcer-app/lib/db/queries.ts` imports `server-only` and uses Drizzle ORM with Postgres. This requires a real database connection, which we don't have set up. We need a drop-in replacement.

### What to Build

Create `sorcer-app/lib/localChatStore.ts`:

```typescript
// All chat data lives in localStorage under these keys:
// "sorcer-chats" → ChatRecord[]
// "sorcer-messages-{chatId}" → Message[]

interface ChatRecord {
  id: string;
  title: string;
  createdAt: string; // ISO date
  carbonSaved: number; // grams CO₂
  promptCount: number;
  model: string;
  region: string;
}

interface StoredMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  // Carbon metadata per message:
  carbon: {
    cost_g: number;         // actual grams CO₂ for this message
    baseline_g: number;     // what it would have cost on the default (dirty) grid
    saved_g: number;        // baseline - cost
    model: string;
    region: string;
    cfe_percent: number;    // Carbon Free Energy % of the region used
    tokens_in: number;
    tokens_out: number;
    latency_ms: number;
    cached: boolean;        // was prompt caching used?
    cache_hit_tokens: number;
    compressed: boolean;    // was prompt compression used?
    original_tokens: number;
    compressed_tokens: number;
    compression_ratio: number; // e.g. 0.62 means 38% reduction
  };
}
```

### Integration Points
- The sidebar (`SorcerSidebar.tsx`) currently has hardcoded `chatHistory`. Replace it with data from `localChatStore`.
- The homepage (`app/page.tsx`) creates a new chat and navigates to `/chat/{id}`. Keep this flow but save to localStorage.
- The chat page (`app/(chat)/chat/[id]/page.tsx`) should load messages from localStorage.
- When messages stream in from the AI, save them to localStorage with carbon metadata.

### Seed Dummy Data on First Load
If localStorage is empty, seed it with **8-10 realistic demo chats** that showcase our features. Each chat should have 3-6 messages. Make the data IMPRESSIVE — show real prompt caching hits, compression ratios, different models, different regions. Example:

```
Chat 1: "Analyze carbon impact of cloud computing"
  - User message → routed to Gemini Flash in us-central1 (89% CFE)
  - Assistant response: 0.12g CO₂ (baseline: 0.57g) → saved 79%
  - Prompt cached: yes (saved 340 tokens)
  - Compression: 0.72 ratio

Chat 2: "Compare sustainable AI architectures" 
  - User → Claude Sonnet in europe-west1 (82% CFE)
  - Heavy analysis → 0.31g CO₂ (baseline: 0.89g) → saved 65%
  - Prompt cached: no (first query)
  - Compression: 0.58 ratio (42% reduction!)
```

---

## 📋 TASK LIST

### Task 0: Fix the Model Selector Dropdown (CRITICAL BUG)

**The bug:** The dropdown in `SpellBar.tsx` is invisible. It opens upward (`absolute bottom-full`) but the parent `<form>` has class `specimen-card` which applies `overflow: hidden` (in `globals.css` line 340).

**The fix:**
The dropdown needs to escape the `overflow: hidden` container. Options (pick the best):

1. **Portal approach (recommended):** Render the dropdown in a React Portal so it's outside the clipped container. Use `createPortal` to mount it to `document.body`, then position it absolutely relative to the button using `getBoundingClientRect()`.
2. **Remove overflow hidden from specimen-card:** Change `.specimen-card` in `globals.css` to `overflow: visible` — but be careful this doesn't break other cards that rely on hidden overflow (the `::before` pseudo-element with `border-radius: inherit` and `filter: url(#rough-edge)` might clip weirdly).
3. **Move the dropdown outside the form:** Restructure the JSX so the dropdown renders outside the `specimen-card` form, using absolute positioning relative to a non-clipped parent.

**Test:** Open the homepage, click the "Auto ▾" pill on the left side of the SpellBar. A dropdown should appear above it showing "Auto Sustainable", then "Eco", "Balanced", "Power" models. Currently it's completely hidden.

---

### Task 1: Map Zoom + Fix City Markers

**File:** `sorcer-app/components/RealmMapSimple.tsx`

#### 1a. Add Zoom Controls
The map currently has no zoom. Add:
- A zoom state (1x to 3x) controlled by `+` and `−` buttons in the bottom-right corner
- Mouse wheel zoom (with Ctrl/Cmd held to prevent accidental scroll-zoom)
- Pinch-to-zoom on touch devices
- Smooth animated zoom transitions using Framer Motion or CSS transitions
- A "Reset zoom" button that snaps back to 1x
- When zoomed in, allow click-and-drag panning (translate the SVG viewBox)

Style the zoom controls to match the botanical/parchment theme:
```
+/- buttons: small specimen-card style, rounded, oak text, subtle border
Position: bottom-right of the map container, overlaid
```

#### 1b. Fix City Markers Moving with Mouse
Currently, the data center markers are inside a parallax group (line ~562):
```jsx
<g style={{ transform: `translate(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)` }}>
```

The city building silhouettes (line ~494) are NOT in a parallax group — they're fine. But the **data center markers** move with the mouse parallax and it looks broken when you're trying to click them.

**Fix:** Keep the parallax ONLY on decorative elements (sea creatures, ocean labels, region labels). Remove parallax from the data center markers group (line ~562) and the compass rose (line ~669). Data centers should be rock-solid static because users need to click them.

The parallax layers should be:
- **Static (no transform):** US states, cities, data centers, compass rose, ornate border, scale bar
- **Light parallax (0.5-0.8x):** Region labels, title cartouche
- **Heavy parallax (2-3x):** Sea creatures, ocean labels, particles (decorative only)

---

### Task 2: The Carbon Breakdown Feature (KEY HACKATHON DIFFERENTIATOR)

This is the **#1 most important visual feature**. Create a new page/view that shows an **advanced breakdown of each chat's carbon footprint** with insane animations.

#### 2a. New Page: `/breakdown/[chatId]`

Create `sorcer-app/app/breakdown/[chatId]/page.tsx`

This page shows a deep-dive into a single chat's carbon impact. Load data from `localChatStore`.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  ← Back to Chat                                      │
│                                                       │
│  "Analyze carbon impact of cloud computing"           │
│  5 messages · Gemini Flash · us-central1              │
│                                                       │
│  ┌────────── HERO STAT ──────────┐                   │
│  │  🌿 0.82 kg CO₂ SAVED        │                   │
│  │  ████████████░░ 73% reduction  │                   │
│  │  Equivalent to 2.1 tree-hours  │                   │
│  └───────────────────────────────┘                   │
│                                                       │
│  ┌── PROMPT CACHING ──┐  ┌── COMPRESSION ──┐        │
│  │  ⚡ 1,240 tokens    │  │  📦 38% smaller  │        │
│  │  saved from cache   │  │  4,200 → 2,604   │        │
│  │  [animated counter] │  │  [shrink anim]    │        │
│  └────────────────────┘  └─────────────────┘        │
│                                                       │
│  ┌─── MESSAGE-BY-MESSAGE TIMELINE ───┐               │
│  │  Each message shows:              │               │
│  │  - Carbon cost vs baseline bar    │               │
│  │  - Model + region badge           │               │
│  │  - Cache hit indicator            │               │
│  │  - Compression ratio ring         │               │
│  │  - Energy source breakdown donut  │               │
│  └───────────────────────────────────┘               │
│                                                       │
│  ┌─── ROUTING VISUALIZATION ───┐                     │
│  │  Animated path showing the   │                     │
│  │  journey from user → region  │                     │
│  │  → model selection           │                     │
│  └──────────────────────────────┘                     │
└─────────────────────────────────────────────────────┘
```

#### 2b. Animation Requirements (GO CRAZY)

These animations are what will win the hackathon. Use Framer Motion extensively:

1. **Hero stat counter:** Numbers roll up from 0 like a slot machine. The CO₂ amount should have a slight overshoot (spring animation). The progress bar fills with a liquid/wave effect.

2. **Prompt Caching Visualization:**
   - Show tokens flowing from a "cache" icon to the model as glowing particles
   - The cached tokens should pulse green, non-cached tokens pulse amber
   - An animated counter showing "1,240 tokens saved" with each digit rolling up independently
   - A circular progress ring showing cache hit rate (e.g., 68% cached)
   - When you hover, particles explode outward briefly

3. **Prompt Compression Visualization:**
   - Show a "squishing" animation: a bar representing the original prompt physically compresses (squash and stretch) down to the compressed size
   - Display the compression ratio as a ring/gauge that fills
   - Show before/after token counts with the "before" number physically shrinking/fading
   - Add a satisfying "whoosh" motion as the compression happens on page load
   - Color gradient from red (no compression) to green (max compression)

4. **Message Timeline:**
   - Each message card staggers in from below with spring physics
   - The carbon cost bars animate from left to right, with the "saved" portion pulsing green
   - Energy source breakdown donuts animate in with each slice rotating into place
   - Model/region badges have a subtle "stamp" animation (scale overshoot)
   - Cache hit messages get a ⚡ lightning bolt that flashes

5. **Routing Visualization:**
   - An animated SVG path that traces from "Your Prompt" → "Carbon Oracle" → "Selected Region" → "Model"
   - Each node pulses when the path reaches it
   - The path itself should be dashed and animate (like ants marching)
   - Use the botanical colors: moss for clean routes, witchberry for dirty

6. **Background magic effects:**
   - Floating particles (tiny leaves/sparkles) that drift across the page
   - Subtle parallax on scroll
   - The "saved" stat should have a faint green glow/aura

#### 2c. Navigation
- Add a "View Breakdown →" button on each chat message or on the chat page header
- Add it to the Carbon Ledger receipt detail modal (the existing one at `/ledger`)
- Add a new nav item in the sidebar: "Spellbook" or keep it as part of chat history

---

### Task 3: More Magic Elements Throughout

The app needs to feel **enchanted**. Add these across the entire site:

#### 3a. Floating Particles System
Create a reusable `<MagicParticles />` component that renders floating particles across the page:
- Tiny leaf shapes, sparkle dots, and faint rune symbols
- They drift slowly (random walk), fade in/out
- Density increases when near "active" elements (hovering over cards, during loading)
- Use `requestAnimationFrame` for performance — NOT re-renders
- Render on a canvas overlay (z-index below interactive elements)
- Respond to mouse: particles gently push away from the cursor

#### 3b. Enhanced Loading States
When the chat is streaming (AI is responding):
- Show an animated "spell casting" effect: concentric rings expanding from the input bar
- The SpellBar border should glow moss-green and pulse
- Tiny runes/symbols should orbit around a loading indicator
- Text should appear with a typewriter effect but with a magical "materialization" — each word fades in with a slight upward motion and a tiny sparkle

#### 3c. Page Transitions
- Add `<AnimatePresence>` page transitions between routes
- Pages should slide/fade with a subtle "page turn" effect (like turning a page in a grimoire)
- The sidebar navigation icons should have a subtle bounce when the active page changes

#### 3d. Micro-interactions
- All buttons should have a subtle "ink splash" on click (a brief radial gradient that fades)
- Cards should have a very subtle tilt-on-hover (3D perspective) — already exists on homepage, extend to all `specimen-card` elements
- The sidebar chat items should have a "quill writing" animation when a new chat appears
- Scroll should reveal elements with stagger animations (not just fade-in, but actually interesting motion)

#### 3e. Cursor Trail
Add a subtle cursor trail effect on the homepage:
- A trail of 5-8 small dots that follow the cursor with decreasing opacity
- Colors alternate between moss and topaz
- The dots should have slight random offset (not perfectly on the cursor path)
- Disable on mobile (touch devices)

---

### Task 4: Sidebar Chat History from localStorage

**File:** `sorcer-app/components/SorcerSidebar.tsx`

The sidebar currently has hardcoded `chatHistory` (line 41-45). Replace with real data:

1. Import from `localChatStore` and load chats
2. Show each chat with:
   - Title (first user message, truncated)
   - Time ago
   - Eco indicator (green dot if carbon was saved, amber if not)
   - Carbon saved badge (e.g., "−0.45kg")
3. Clicking a chat should navigate to `/chat/{id}`
4. The "New Conversation" button should create a new chat in localStorage and navigate to it
5. Add a "View Breakdown" icon button on each chat that goes to `/breakdown/{chatId}`
6. Add a "Clear All" option in the footer

---

### Task 5: Enhanced Homepage Polish

**File:** `sorcer-app/app/page.tsx`

1. **Animated tagline:** The subtitle "Route prompts to the cleanest available intelligence..." should have words that highlight/glow sequentially on a loop (like a neon sign effect but in the botanical palette)

2. **Live stats ticker:** Below the SpellBar, add a horizontal scrolling ticker showing live-ish stats:
   - "127.5 kg CO₂ saved today"
   - "342 prompts routed sustainably"
   - "78% eco mode adoption"
   - These should slowly scroll left, like a news ticker, with botanical dividers (leaf icons)
   - Pull numbers from localStorage aggregate

3. **Feature card animations:** The 3 feature cards should stagger in on page load with spring physics and have the parallax tilt already implemented but more dramatic

4. **"Last expedition" summary:** Below the feature cards, show a small summary of the user's last chat:
   - "Last expedition: 'Analyze carbon impact...' → Gemini Flash → us-central1 → saved 0.45kg"
   - With a small animated progress bar showing the savings

---

## 🎨 Design Token Reference

Use these EXACT colors (from `globals.css`):
- `--parchment: #F7F3E8` (background)
- `--oak: #6B3710` (text)
- `--oak-light: #8B5E3C` (secondary text)
- `--moss: #4B6A4C` (eco/green — good)
- `--moss-light: #5E8260`
- `--topaz: #DDA059` (amber — warnings, mixed)
- `--witchberry: #B52121` (red — bad/dirty)
- `--miami: #59C9F1` (accent blue)
- `--sage: #A0A088` (neutral)

Font families:
- `var(--font-header)` — Cinzel-like, for big headings
- `var(--font-sub)` — Cursive/handwriting feel, for labels
- `var(--font-body)` — Clean sans-serif (Geist)
- `var(--font-code)` — Monospace (JetBrains Mono / Geist Mono)

Key CSS classes:
- `.specimen-card` — The main card style (parchment bg, oak border, shadow, rounded, **overflow: hidden**)
- `.glass-panel` — Frosted glass effect
- `.enchanted-terminal` — Mossy dark panel for code/output
- `.magic-orb` — Circular green button with glow

---

## ⚠️ Critical Rules

1. **NO backend changes.** Zero. Not even reading backend files. Frontend only.
2. **Use Framer Motion** for ALL animations. It's already installed.
3. **Use Lucide React** for icons. Already installed.
4. **localStorage** for all data persistence. No database.
5. **Mobile responsive.** Everything must work on mobile screens.
6. **Performance:** Use `memo`, `useMemo`, `useCallback` aggressively. Canvas for particle systems. Don't re-render the entire page for cursor trails.
7. **Accessibility:** All interactive elements need focus states, keyboard navigation, aria labels. Screen readers should still work (particles/trails are decorative only).
8. **The `.specimen-card` class has `overflow: hidden`** — remember this when positioning dropdowns or any element that needs to escape its card container.
9. **Seed localStorage with impressive dummy data on first visit.** The demo needs to look lived-in.
10. **TypeScript strict.** No `any` types. No `@ts-ignore`.

---

## 📦 Files to Create

```
sorcer-app/
├── lib/
│   └── localChatStore.ts          # localStorage CRUD for chats + messages
├── app/
│   └── breakdown/
│       └── [chatId]/
│           └── page.tsx           # Carbon breakdown deep-dive page
├── components/
│   ├── MagicParticles.tsx         # Floating particles background
│   ├── CarbonBreakdown.tsx        # Main breakdown visualization component
│   ├── PromptCacheViz.tsx         # Animated prompt caching visualization
│   ├── CompressionViz.tsx         # Animated compression visualization
│   ├── MessageTimeline.tsx        # Per-message carbon timeline
│   ├── RoutingViz.tsx             # Animated routing path visualization
│   └── StatsTicker.tsx            # Scrolling stats ticker for homepage
```

## 📦 Files to Modify

```
sorcer-app/
├── app/
│   ├── page.tsx                   # Add stats ticker, last expedition, word glow
│   └── layout.tsx                 # Add MagicParticles, page transitions
├── components/
│   ├── SpellBar.tsx               # Fix dropdown (portal), add casting animation
│   ├── SorcerSidebar.tsx          # Load chats from localStorage, add breakdown links
│   ├── RealmMapSimple.tsx         # Add zoom, fix parallax on data centers
│   └── chat.tsx                   # Save messages to localStorage with carbon metadata
├── globals.css                    # Possibly fix overflow: hidden issue
```

---

## 🏁 Priority Order

1. **Task 0:** Fix dropdown (5 min, huge UX fix)
2. **Task 1:** Map zoom + fix markers (30 min)
3. **Architecture:** Build `localChatStore.ts` + seed data (30 min)
4. **Task 4:** Wire sidebar to localStorage (20 min)
5. **Task 2:** Carbon Breakdown page with ALL animations (2+ hours — this is the star)
6. **Task 3:** Magic elements throughout (1 hour)
7. **Task 5:** Homepage polish (30 min)

**Total estimated time: 5-6 hours of focused work.**

Go make this magical. ✨🧙‍♂️

