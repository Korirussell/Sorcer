# 🧙‍♂️ WINDSURF: Semantic Cache Visualization Upgrade + Animation Polish

> **Priority:** HIGH — These are the "wow factor" features that will impress hackathon judges.
> **Your role:** Senior Frontend Engineer + Data Visualization Specialist
> **Scope:** `sorcer-app/` — frontend only.
> **Design language:** "Botanical field notes" — parchment, ink, specimen cards, moss/oak/topaz/witchberry palette. Think Victorian naturalist's journal meets futuristic data viz.

---

## 🧠 CONTEXT: What Judges Want to See

This is a **Carbon Arbitrage Engine** — it saves CO₂ by intelligently routing AI prompts to the cleanest data centers. The three core optimizations are:

1. **Semantic Caching** — If a similar prompt was recently answered, serve the cached result (zero carbon cost)
2. **Prompt Compression** — Remove redundant tokens before sending to the LLM
3. **Carbon-Aware Routing** — Pick the data center with the most renewable energy right now

Semantic caching is the **most technically impressive** optimization. But right now it's barely visualized — just a small "⚡ Cached" badge and a progress ring on the breakdown page. **A judge has no visceral understanding of what's happening.** We need to make the cache feel ALIVE — like you can SEE the intelligence working.

---

## 🎯 TASK 1: Semantic Cache Neighborhood Graph (THE SHOWSTOPPER)

Build a **2D prompt embedding visualization** — a "Semantic Constellation" — that makes the cache feel like a living neural network.

### What It Shows
Every prompt the user has sent becomes a **node** on a 2D scatter plot. Similar prompts cluster together. When a new prompt comes in:
- A **new node appears** at the edge and gravitates toward its semantic neighborhood
- If it's close enough to an existing node → **golden "HIT" connection line** pulses between them, the matched node glows, and the response is served instantly
- If it's a miss → the node settles into its position and becomes a new cache entry

### Visual Design

```
┌──────────────────────────────────────────────────┐
│  Semantic Cache · 7 entries · 3 hits              │
│                                                    │
│         ○ "carbon footprint"                      │
│        ╱                                           │
│    ◉━━━━━━⚡ HIT ━━━━━━◉ "carbon impact of AI"  │
│   (new)  ╲                                        │
│           ○ "emissions data"                      │
│                                                    │
│                    ○ "optimize python"             │
│                   ╱                                │
│              ○ "pandas pipeline"                   │
│                                                    │
│                         ○ "kubernetes scaling"     │
│                                                    │
│   ── Miss    ━━ Hit connection    ⚡ Active hit   │
└──────────────────────────────────────────────────┘
```

### Implementation Details

**Component:** `components/SemanticCacheGraph.tsx`

**Layout:** Force-directed graph (use simple spring physics — no need for D3, keep it lightweight):
- Each node has an (x, y) position
- Similar prompts attract (spring force)
- All nodes repel slightly (prevent overlap)
- Simulate ~20 frames on mount to settle positions

**Similarity:** Since we don't have real embeddings from the backend, **fake it convincingly:**
- Use keyword overlap + Jaccard similarity between prompts
- Prompts sharing 2+ significant words cluster together
- Threshold for "cache hit": similarity > 0.6

**Node design:**
- **Circle** with radius proportional to token count
- **Color:** moss for cached/hit entries, oak/30 for regular entries, topaz glow for active hits
- **Label:** First 20 chars of prompt, truncated with ellipsis
- **Pulse animation** on the most recent hit

**Connection lines:**
- **Hit connections:** Golden/topaz animated dashed line between the new prompt and its cache match
- **Cluster connections:** Very faint oak/5 lines between prompts with similarity > 0.4

**Interactions:**
- Hover a node → show full prompt text + cache metadata (tokens, hit count) in a tooltip
- The graph updates live as new prompts are sent in the chat

**Animation on new prompt:**
1. New node appears at edge with `scale: 0 → 1` spring animation
2. Node gravitates toward cluster (0.8s spring physics)
3. If HIT: golden line draws from node to match (0.5s), match node pulses with topaz glow, "⚡ CACHE HIT" label fades in
4. If MISS: node settles, subtle ripple effect, faint connections draw to nearby nodes

**Where it appears:**
- **Primary:** In the chat page breakdown popup, replacing or augmenting the current "Semantic Cache Hit" section
- **Secondary:** On the breakdown page (`/breakdown/[chatId]`) as a full-width visualization
- **Tertiary:** Small thumbnail version in the sidebar for the active chat

**Data source:** Read from localStorage via `getMessages(chatId)` — each message has `carbon.cached`, `carbon.cache_hit_tokens`. Build the graph from all user prompts across all chats.

---

## 🎯 TASK 2: Cache Hit Celebration Animation

When a cache hit happens during the optimization sequence, make it **unmissable**:

### Current (boring):
- "Semantic Cache" step shows "— Hit!" text
- That's it

### New (spectacular):
1. When the cache_check phase finds a hit:
   - The step indicator **explodes** with a topaz/gold burst (like a supernova)
   - Radiating ring effect (expanding circle, fading out)
   - "⚡ INSTANT" badge flies in from the right with a spring bounce
   - The subsequent phases (compression, routing, map, generating) get **SKIPPED** with a satisfying "fast forward" whoosh — each phase briefly flashes and auto-completes in 100ms instead of 500-800ms
   - Total time from cache hit to response: ~0.5s instead of ~2.4s

2. A **"Saved X seconds"** counter appears showing estimated time saved:
   ```
   ⚡ Cache Hit! Saved ~3.2 seconds · 0g carbon
   ```

3. The response appears almost instantly with a special **golden shimmer border** instead of the normal assistant bubble border, so it's visually distinct from a generated response.

### Component changes:
- Modify `OptimizationSequence` in `app/chat/[id]/page.tsx`
- Add a `cacheHit: boolean` prop
- When `cacheHit === true`, skip to accelerated timeline
- Add the burst/celebration animation

---

## 🎯 TASK 3: Speed Up the Route Map Animation

The route map animation is too slow for repeated use. Currently:
- Container reveal: 0.5s
- Path draw: 1.5s
- Circle travel: 1.8s
- Destination appear: delay 1.2s
- **Total: ~2.3s**

### New timings:
- Container reveal: 0.3s
- Path draw: 0.7s
- Circle travel: 0.8s
- Destination appear: delay 0.5s
- **Total: ~1.0s**

Also speed up the optimization phase delays:
```typescript
// BEFORE (too slow)
{ phase: "cache_check", ms: 600 },
{ phase: "compressing", ms: 500 },
{ phase: "routing",     ms: 500 },
{ phase: "map",         ms: 800 },

// AFTER (snappy)
{ phase: "cache_check", ms: 400 },
{ phase: "compressing", ms: 350 },
{ phase: "routing",     ms: 350 },
{ phase: "map",         ms: 500 },
```

Total optimization sequence: **~1.6s** instead of **~2.4s** (33% faster).

### Files to change:
- `app/chat/[id]/page.tsx` — the `sendPrompt` function's setTimeout delays AND the `OptimizationSequence` component's inline SVG animation durations
- Also update the `RouteMapViz` component in `components/RouteMapViz.tsx` if it has its own animation durations

---

## 🎯 TASK 4: Cache Performance Timeline

Add a **horizontal timeline** at the top of the chat that shows cache performance over the conversation:

```
Cache Timeline
──●────●────⚡────●────⚡────⚡──▶
  1    2     3     4     5     6
miss  miss  HIT   miss  HIT   HIT
                                    Hit Rate: 50% ↑
```

### Design:
- Horizontal line with circular nodes for each prompt
- **Miss nodes:** Small, oak/20 colored, hollow circle
- **Hit nodes:** Larger, topaz/gold filled, ⚡ icon, subtle glow
- Connecting line shows the conversation progression
- Right side shows running hit rate percentage with trend arrow
- Animates each new node in with a spring

### Location:
- Appears as a collapsible bar just below the chat header
- Collapsed by default (just shows "Cache: 50% hit rate ⚡")
- Expands on click to show the full timeline

### Component: `components/CacheTimeline.tsx`

---

## 🎯 TASK 5: New Animation Ideas (Polish & Delight)

### 5A. Quill Writing Effect for AI Responses
Instead of plain character-by-character streaming, add an **ink flow effect**:
- Each character appears with a tiny ink drop animation (opacity 0 → 1 with a slight blur → sharp)
- A faint ink trail connects characters as they appear (like a quill dragging across parchment)
- The blinking cursor changes from a plain line to a **tiny quill nib** (SVG, 8x12px)
- Ink color is slightly transparent at first, then darkens (like real ink drying)

Implementation: CSS `@keyframes` on each character span, staggered by index. Use `text-shadow` for the wet-ink glow.

### 5B. Carbon Particles Flowing to Indicator
When the carbon savings card appears on an assistant message:
- **Green leaf particles** (3-5 of them) fly upward from the savings number
- They arc gracefully toward the **CarbonIndicator** in the top-right corner
- When they arrive, the CarbonIndicator's number ticks up with a satisfying pulse
- Gives a visceral sense of "my savings are accumulating"

Implementation: Absolute-positioned Framer Motion elements that animate from the savings card's position to the CarbonIndicator's position. Use `getBoundingClientRect()` for coordinates.

### 5C. Spell Casting Burst on Submit
When the user presses Enter/clicks Send on the SpellBar:
- A circular **ink splash** radiates outward from the send button (200ms, quick)
- The SpellBar briefly glows with a moss border pulse
- Micro-particles scatter outward from the button (botanical: tiny leaf/seed shapes)
- The input text "dissolves" upward as it's being sent (each word fades up and out in sequence, 50ms stagger)

Implementation: Trigger on form submit. Use Framer Motion `AnimatePresence` for the dissolving text, canvas or SVG for the splash.

### 5D. Sidebar Carbon Vine Growth
The sidebar already exists. Add a **growing vine** along the left edge:
- Starts as a tiny sprout at the bottom
- Grows taller with each prompt sent (vine height = `min(promptCount * 15%, 100%)`)
- Small leaves appear at each "node" (one per prompt)
- **Leaves are green for cache hits, amber for misses**
- When the vine reaches the top, it blooms (small flower animation)
- Resets when a new chat starts

This gives the sidebar a living, organic feel that directly represents the user's activity.

### 5E. "Grimoire Page Turn" on Chat Navigation
When navigating from homepage to chat:
- Instead of the default fade/slide PageTransition, use a **page flip** effect
- The homepage content rotates on a vertical axis like a book page turning
- The chat page content appears from behind
- Duration: 0.4s, ease: "easeInOut"
- Use CSS `perspective` + `rotateY` transform

Implementation: Modify `components/PageTransition.tsx` — detect when navigating to `/chat/*` routes and use the page-flip variant.

### 5F. Parchment Burn-In for the Optimization Sequence
When each optimization step completes:
- The checkmark doesn't just pop in — it **burns in** like a hot brand on parchment
- Brief brown→amber→green color transition (100ms)
- Tiny smoke wisps rise from the checkmark (2-3 small opacity-fading circles moving upward)
- Subtle "singe" ring effect around the checkmark icon

This fits the botanical/medieval aesthetic perfectly.

---

## 📁 FILES TO CREATE/MODIFY

| File | Action |
|------|--------|
| `components/SemanticCacheGraph.tsx` | **CREATE** — The constellation graph (Task 1) |
| `components/CacheTimeline.tsx` | **CREATE** — The horizontal cache performance timeline (Task 4) |
| `components/CacheCelebration.tsx` | **CREATE** — The cache hit celebration burst effect (Task 2) |
| `components/QuillCursor.tsx` | **CREATE** — Quill nib SVG cursor for streaming (Task 5A) |
| `components/CarbonParticleFlow.tsx` | **CREATE** — Particles flying to CarbonIndicator (Task 5B) |
| `app/chat/[id]/page.tsx` | **MODIFY** — Integrate CacheTimeline, speed up timings, add cache celebration, integrate particle flow, quill cursor |
| `components/RouteMapViz.tsx` | **MODIFY** — Speed up animation durations (Task 3) |
| `components/SpellBar.tsx` | **MODIFY** — Add ink splash on submit (Task 5C) |
| `components/SorcerSidebar.tsx` | **MODIFY** — Add carbon vine growth (Task 5D) |
| `components/PageTransition.tsx` | **MODIFY** — Add grimoire page-flip variant for chat routes (Task 5E) |

---

## ⚡ PRIORITY ORDER (If Time-Limited)

1. **Task 3** — Speed up map animation (5 min, huge UX improvement)
2. **Task 2** — Cache hit celebration (15 min, most visible impact during demo)
3. **Task 1** — Semantic Cache Graph (45 min, THE showstopper for judges)
4. **Task 5B** — Carbon particles flowing to indicator (15 min, delightful polish)
5. **Task 4** — Cache timeline (20 min, shows technical depth)
6. **Task 5C** — Spell casting burst on submit (10 min, fun micro-interaction)
7. **Task 5A** — Quill writing effect (20 min, aesthetic polish)
8. **Task 5D** — Sidebar vine growth (20 min, thematic cohesion)
9. **Task 5E** — Page-flip transition (15 min, slick navigation feel)
10. **Task 5F** — Parchment burn-in (10 min, detail polish)

---

## 🎨 DESIGN SYSTEM REFERENCE

### Colors (Tailwind custom):
```
bg-parchment      — #fffbf0 (warm cream, main bg)
bg-parchment-dark  — #f5edd6 (slightly darker, card bg)
text-oak           — #6B3710 (dark brown, primary text)
text-oak-light     — #8B6914 (lighter brown, secondary)
text-moss / bg-moss — #4B6A4C (green, success/eco)
text-topaz / bg-topaz — #DDA059 (gold/amber, cache/balanced)
text-witchberry     — #B52121 (red, warnings/dirty)
text-miami / bg-miami — #59C9F1 (teal, compression)
```

### Component Classes:
```
specimen-card  — Parchment card with border and shadow
glass-panel    — Frosted glass effect
font-header    — Nanum Pen Script (handwritten, for titles)
font-sub       — Caveat (handwritten bold, for labels)
font-sans      — DM Sans (clean, for body text)
font-code      — Victor Mono (monospace, for code/data)
```

### Animation Style:
- **Spring physics** for bouncy entrances: `type: "spring", stiffness: 150, damping: 22`
- **Staggered children**: `delay: index * 0.1` to `0.15`
- **SVG path drawing**: `pathLength: 0 → 1` with `ease: "easeInOut"`
- **Pulsing indicators**: `animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}`
- **Color transitions**: 200-300ms duration
- **Page transitions**: 250ms fade + slight y-shift

### Existing Animation Components (don't break these):
- `MagicParticles` — Canvas floating particles (leaves, ferns, seeds)
- `CursorOrb` — Canvas cursor glow with ember trail
- `SearchVines` — SVG ink vines around focused SpellBar
- `ScrollBackground` — Scroll-reactive background effects
- `MagicalVine` — SVG eco-level vine on right edge
- `SpellCastingLoader` — Multi-ring pulsing orb for loading

---

## 🧪 HOW TO TEST

### Cache Graph (Task 1):
1. Open the app, send 3-4 different prompts
2. Send a prompt similar to one you already sent (e.g. "carbon emissions" after "carbon footprint")
3. Open the breakdown popup → cache graph should show the cluster with a HIT connection
4. Prompts about similar topics should cluster together

### Cache Celebration (Task 2):
1. Send a prompt → see normal optimization sequence
2. Send a very similar prompt → cache_check phase should show the golden burst celebration
3. Subsequent phases should fast-forward through quickly
4. Response should appear almost instantly with golden shimmer border

### Speed (Task 3):
1. Send any prompt
2. The entire optimization sequence + map animation should complete in ~1.6s (not ~2.4s)
3. The route map path should draw noticeably faster

### Animations (Task 5):
1. **Particles:** After a response, green particles should fly to the top-right CarbonIndicator
2. **Submit burst:** Press Enter on SpellBar → ink splash visible for a split second
3. **Quill cursor:** During streaming, the blinking cursor should look like a quill nib
4. **Vine:** After several prompts, check the sidebar for a growing vine

---

## ⚠️ GOTCHAS

1. **Performance:** The SemanticCacheGraph uses spring physics simulation. Cap it at 50 nodes max (older entries get pruned). Use `requestAnimationFrame` for the simulation, not `setInterval`. Memoize heavily.

2. **localStorage reads:** All prompt data comes from `lib/localChatStore.ts`. Use `getMessages()` and `getAllChats()`. Don't create new storage keys.

3. **CarbonIndicator position:** It's `fixed top-4 right-4`. When animating particles to it, use `document.querySelector` to get its `getBoundingClientRect()`. Don't hardcode coordinates.

4. **Route map:** `RouteMapViz.tsx` uses `react-simple-maps` with TopoJSON. The inline SVG map in `OptimizationSequence` is separate and simpler. Speed up BOTH.

5. **The `(chat)` route group** (`app/(chat)/`) is a separate system. Don't touch it. Your changes go in `app/chat/[id]/page.tsx` and standalone components.

6. **Framer Motion v11+** is installed. Use `motion.div`, `AnimatePresence`, `useMotionValue`, `useTransform` etc. No need for external animation libraries.

7. **Canvas components** (`MagicParticles`, `CursorOrb`) use `requestAnimationFrame`. If adding new canvas animations, make sure they clean up properly on unmount to prevent memory leaks.

---

## 🎯 TASK 6: "Developer Details" — Semantic Cache Web Graph (Full Page)

Add a **"Developer Details"** button (or a "Cache Map" icon) accessible from the chat header or breakdown popup. When clicked, it opens a **full-page visualization** of the semantic cache as an **interactive web/graph**.

### What It Shows
A force-directed network graph where:
- **Every user prompt** across all chats is a node
- **Edges connect semantically similar prompts** (keyword overlap > 40%)
- **Cache hits** are shown as thick golden/topaz edges between the new prompt and its matched cached prompt
- **Clusters** form naturally — "carbon" questions cluster together, "code" questions cluster together, etc.

### Visual Design
- Nodes are circles: size = token count, color = model used (moss for Eco, topaz for Balanced, witchberry for Power)
- **Cached nodes** have a golden ring/glow
- **Hit connections** are thick, animated dashed topaz lines with a traveling particle
- **Cluster connections** are thin, faint oak/10 lines
- Background: dark parchment with subtle grid lines (like graph paper in a journal)
- Top bar shows: `{total_nodes} prompts cached · {hit_count} cache hits · {hit_rate}% hit rate`
- Click a node → sidebar panel shows: full prompt text, response preview, carbon meta, cache hit count

### Implementation
- Use **canvas** (not DOM nodes) for performance — same pattern as `MagicParticles.tsx`
- Simple force simulation: spring attraction between similar nodes, repulsion between all nodes, damping
- Cap at 100 nodes max. Older entries fade to lower opacity.
- Animate new nodes flying in from the edge when navigating from chat
- Can be a new page route: `app/cache-map/page.tsx` or a full-screen modal

---

## 🎯 TASK 7: REDESIGN PROFILE PAGE — 3D Impact Visualization with "Reckless Toggle" (THE WOW FACTOR)

**This is the single most impressive thing on the entire site.** Redesign the profile/stats page (`app/profile/page.tsx`) into an **immersive 3D data visualization** that makes judges' jaws drop, with a toggle that shows "what if you were reckless?"

### Install Dependencies First
```bash
cd sorcer-app
npm install @react-three/fiber @react-three/drei three
npm install -D @types/three
```

### The Concept

The profile page becomes a **living 3D terrarium/ecosystem** that represents the user's sustainability impact. The more carbon they've saved, the more lush and alive the scene is. Then there's a toggle: **"Sustainable" ↔ "Reckless"** — flip it, and the scene **decays, burns, and dies** in real time, showing what their footprint would look like without Sorcer.

### The Stats (Display These Prominently)

Replace the current boring grid cards with these stats, calculated from localStorage data:

```typescript
interface ImpactStats {
  promptsCached: number;         // Total cache hits across all chats
  totalRecycledPrompts: number;  // Number of prompts served from cache
  promptsShortened: number;      // Number of prompts that were compressed
  totalTokensSaved: number;      // Sum of (original_tokens - compressed_tokens) + cache_hit_tokens
  energySaved_kWh: number;       // Estimated: totalTokensSaved * 0.000004 kWh/token
  carbonSaved_g: number;         // Direct from localStorage aggregate
  waterSaved_mL: number;         // Estimated: energySaved_kWh * 1.8 L/kWh (data center cooling)
  treeHoursEquivalent: number;   // carbonSaved_g / 22 (a tree absorbs ~22g CO₂/hour)
}
```

Calculate all of these from the existing `localChatStore` data. The `getAggregateStats()` function already computes some. Extend it or compute alongside.

### The 3D Scene — "Sustainable Mode" (Default)

Use `@react-three/fiber` + `@react-three/drei`:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│         🌿 YOUR SUSTAINABILITY TERRARIUM 🌿                     │
│                                                                   │
│    ┌─────────────────────────────────────────────────────┐       │
│    │                                                       │       │
│    │           [3D SCENE: Lush floating island]            │       │
│    │                                                       │       │
│    │     🌳🌲  green particles rising  🌿🌱               │       │
│    │      ╱ ╲   water flowing          ╱ ╲                │       │
│    │    ┌─────terrain─────────────────────┐                │       │
│    │    │  moss-covered, flowers, vines   │                │       │
│    │    └─────────────────────────────────┘                │       │
│    │         slowly rotating, ambient glow                 │       │
│    │                                                       │       │
│    └─────────────────────────────────────────────────────┘       │
│                                                                   │
│    ┌──── SUSTAINABLE ━━━━━━━━━○──────── RECKLESS ────┐          │
│    │              ↑ Toggle switch                       │          │
│    └────────────────────────────────────────────────────┘          │
│                                                                   │
│    ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│    │ 847  │ │ 12   │ │ 234  │ │ 18K  │ │ 0.07 │ │ 3.2  │      │
│    │tokens│ │cached│ │short │ │saved │ │ kWh  │ │ g CO₂│      │
│    │saved │ │hits  │ │ened  │ │token │ │saved │ │saved │      │
│    └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
│                                                                   │
│    ┌──────┐ ┌──────────────────────────────────────────┐        │
│    │ 127  │ │ 🌊 5.8 mL water saved                    │        │
│    │ mL   │ │ 🌳 0.15 tree-hours of CO₂ absorption    │        │
│    │water │ │ 💡 Enough to power an LED for 4.2 min   │        │
│    └──────┘ └──────────────────────────────────────────┘        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**3D Scene Elements (Sustainable):**
- **Floating island** — Low-poly terrain mesh with moss-green color, slowly rotating
- **Trees/plants** — Simple cone + cylinder meshes (low-poly style), quantity proportional to carbon saved
- **Green particles** — Rise gently upward like fireflies/spores, count = `totalTokensSaved / 100`
- **Water stream** — A flowing ribbon of blue particles representing water saved
- **Glowing orb** at center — Represents the sustainability score, pulsing with moss-green light
- **Orbiting leaves** — Small leaf meshes orbiting the island, one per cache hit
- **Ambient lighting** — Warm, golden, like sunlight through a canopy
- The scene **slowly auto-rotates** and responds to mouse drag for manual orbit

**Stats cards** float below the 3D scene as glass-morphism cards with the specimen-card style. Each stat has:
- Big animated number (counting up on mount)
- Label
- Small icon
- Comparison text: "vs {reckless_value} without Sorcer"

### The 3D Scene — "Reckless Mode" (Toggle ON)

When the user flips the toggle, the scene **transforms in real time** (2-3 second transition):

1. **Trees shrink and turn brown/gray** (scale + color lerp)
2. **Green particles turn red/orange** and fall downward instead of rising (gravity flip)
3. **Water stream dries up** (particles fade out)
4. **Terrain cracks** — color shifts from green to brown/gray, maybe add crack texture
5. **Central orb turns red** and pulses angrily
6. **Smoke/ash particles** replace the leaves
7. **Ambient light turns cold/gray** — like overcast industrial sky
8. **Background darkens** to a bleak gray-parchment

The stats cards **also flip** to show the "reckless" values:

| Stat | Sustainable Value | Reckless Value |
|------|-------------------|----------------|
| Tokens saved | 18,247 | 0 |
| Carbon saved | 3.2g | 0g (+ 3.2g ADDED) |
| Energy saved | 0.07 kWh | 0 (+ 0.07 kWh WASTED) |
| Water saved | 127 mL | 0 (+ 127 mL WASTED) |
| Cache hits | 12 | 0 (every prompt = full LLM call) |
| Prompts compressed | 234 | 0 (all tokens sent raw) |

Each stat card transition:
- Number counts DOWN from sustainable to 0
- Color transitions from moss → witchberry
- A "strikethrough" line animates across the original number
- The "reckless" number appears below in witchberry/red: **"+3.2g CO₂ ADDED"**

### Toggle Design
A beautiful pill-shaped toggle centered below the 3D scene:
```
┌─────────────────────────────────────────────┐
│  🌿 Sustainable  ━━━━━━━○  Reckless  💀   │
└─────────────────────────────────────────────┘
```
- Left side: moss green with leaf icon
- Right side: witchberry red with skull icon
- The toggle knob slides with a spring animation
- When switching to Reckless: the toggle bar itself transitions from green to red gradient

### Equivalencies Section (Below the stats)
Show tangible real-world equivalents that make the numbers MEAN something:

```typescript
const equivalencies = [
  { 
    icon: "🌳", 
    sustainable: `${treeHours.toFixed(1)} tree-hours of CO₂ absorption`,
    reckless: `Would need ${treeHours.toFixed(1)} tree-hours to offset your damage`
  },
  { 
    icon: "🌊", 
    sustainable: `${waterSaved.toFixed(0)} mL of cooling water preserved`,
    reckless: `${waterSaved.toFixed(0)} mL of water wasted on unnecessary compute`
  },
  { 
    icon: "💡", 
    sustainable: `Enough energy saved to power an LED bulb for ${(energySaved * 60).toFixed(1)} minutes`,
    reckless: `Wasted enough energy to power an LED bulb for ${(energySaved * 60).toFixed(1)} minutes`
  },
  { 
    icon: "🚗", 
    sustainable: `Equivalent to ${(carbonSaved / 404).toFixed(3)} miles NOT driven`,
    reckless: `Like driving ${(carbonSaved / 404).toFixed(3)} extra miles for no reason`
  },
];
```

These flip between sustainable (positive framing, moss green) and reckless (negative framing, witchberry red) when the toggle switches.

### React Three Fiber Setup

```tsx
// app/profile/page.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, Environment, Stars } from '@react-three/drei';

function SustainabilityScene({ isReckless, stats }: { isReckless: boolean; stats: ImpactStats }) {
  return (
    <Canvas camera={{ position: [0, 2, 5], fov: 45 }} style={{ height: '400px' }}>
      <ambientLight intensity={isReckless ? 0.3 : 0.6} />
      <pointLight 
        position={[5, 5, 5]} 
        color={isReckless ? '#ff4444' : '#4B6A4C'} 
        intensity={isReckless ? 0.5 : 1} 
      />
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
        <TerrainIsland isReckless={isReckless} carbonSaved={stats.carbonSaved_g} />
        <Trees count={Math.min(stats.promptsCached, 20)} isReckless={isReckless} />
        <CentralOrb score={stats.carbonSaved_g} isReckless={isReckless} />
      </Float>
      <Particles count={stats.totalTokensSaved / 50} isReckless={isReckless} />
      {!isReckless && <Stars radius={100} depth={50} count={500} factor={2} saturation={0} fade />}
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      <Environment preset={isReckless ? 'warehouse' : 'forest'} />
    </Canvas>
  );
}
```

### Files to Modify:
| File | Action |
|------|--------|
| `app/profile/page.tsx` | **REWRITE** — Replace with 3D terrarium + reckless toggle + impact stats |
| `components/ProfileStats.tsx` | **REPLACE** or **REPURPOSE** — The stat cards can be kept but redesigned as glass cards below the 3D scene |
| `components/ImpactScene.tsx` | **CREATE** — The React Three Fiber 3D scene |
| `components/RecklessToggle.tsx` | **CREATE** — The sustainable/reckless toggle |
| `lib/gamification.ts` | **MODIFY** — Add `calculateImpactStats()` function that computes all the new stats from localStorage |
| `types/gamification.ts` | **MODIFY** — Add `ImpactStats` interface |
| `package.json` | **MODIFY** — Add `@react-three/fiber`, `@react-three/drei`, `three`, `@types/three` |

---

## ⚡ UPDATED PRIORITY ORDER (Full Task List)

1. **Task 3** — Speed up map animation (5 min)
2. **Task 2** — Cache hit celebration animation (15 min)
3. **Task 7** — 🔥 **3D PROFILE PAGE WITH RECKLESS TOGGLE** 🔥 (60-90 min, THE wow factor)
4. **Task 1** — Semantic Cache Constellation Graph (45 min)
5. **Task 6** — Developer Details full-page cache web (30 min)
6. **Task 5B** — Carbon particles flowing to indicator (15 min)
7. **Task 4** — Cache timeline in chat header (20 min)
8. **Task 5C** — Spell casting burst on submit (10 min)
9. **Task 5A** — Quill writing effect (20 min)
10. **Task 5D** — Sidebar vine growth (20 min)
11. **Task 5E** — Page-flip transition (15 min)
12. **Task 5F** — Parchment burn-in (10 min)
