# 🧙‍♂️ WINDSURF BUILD v3 — Critical Fixes + Polish + 3D Enhancements

> **READ FIRST:** Read `CONTEXT.md` in the project root for architecture, design system, and API contract. Frontend is in `sorcer-app/`. Backend (`backend/`) is **READ-ONLY** — never modify it.

---

## 📂 KEY FILE MAP

| Purpose | File |
|---|---|
| Root layout (fonts, SVG filters, ThemeProvider) | `sorcer-app/app/layout.tsx` |
| Sidebar + shell wrapper | `sorcer-app/components/LayoutClient.tsx` |
| Sidebar navigation | `sorcer-app/components/SorcerSidebar.tsx` |
| Home page | `sorcer-app/app/page.tsx` |
| Chat layout (separate sidebar) | `sorcer-app/app/(chat)/layout.tsx` |
| Map page | `sorcer-app/app/map/page.tsx` |
| Map component (the big one) | `sorcer-app/components/RealmMapSimple.tsx` |
| Profile page | `sorcer-app/app/profile/page.tsx` |
| Ledger page | `sorcer-app/app/ledger/page.tsx` |
| Scheduler page | `sorcer-app/app/scheduler/page.tsx` |
| Profile stats | `sorcer-app/components/ProfileStats.tsx` |
| Badges | `sorcer-app/components/AchievementBadge.tsx` |
| Leaderboard | `sorcer-app/components/Leaderboard.tsx` |
| Gamification lib | `sorcer-app/lib/gamification.ts` |
| Global CSS & design tokens | `sorcer-app/app/globals.css` |
| Tailwind config | `sorcer-app/tailwind.config.ts` |
| Carbon indicator (top-right leaf) | `sorcer-app/components/CarbonIndicator.tsx` |
| Carbon Pulse (BEING REMOVED) | `sorcer-app/components/CarbonPulse.tsx` |
| Scroll background effects | `sorcer-app/components/ScrollBackground.tsx` |
| Page transition animations | `sorcer-app/components/PageTransition.tsx` |
| SpellBar (prompt input) | `sorcer-app/components/SpellBar.tsx` |
| PageHeader reusable component | `sorcer-app/components/PageHeader.tsx` |

---

## 🎨 DESIGN SYSTEM — You MUST Use These

**Color Tokens (CSS vars & Tailwind classes):**
- `parchment` / `parchment-dark` — backgrounds (#F7F3E8 / #EDE8D6)
- `oak` / `oak-light` — text/primary (#6B3710 / #8B5E3C)
- `moss` / `moss-light` — success/eco/green (#4B6A4C / #5E8260)
- `sage` — muted (#A0A088)
- `witchberry` — warning/danger (#B52121)
- `topaz` — amber/medium (#DDA059)
- `miami` — info/links (#59C9F1)

**Fonts (CSS variables):**
- `--font-header` → Nanum Pen Script (display headings)
- `--font-sub` → Caveat (labels, captions)
- `--font-body` / `font-sans` → DM Sans (body text)
- `--font-code` / `font-mono` → Victor Mono (code)

**Card style:** Use `.specimen-card` class for all card containers.
**Glass overlays:** Use `.glass-panel` class.
**Animations:** Framer Motion is installed. Use it.
**Icons:** Lucide React is installed. Use it.

---

# 🚨 PRIORITY 1: CRITICAL HOMEPAGE FIXES

## TASK 1A: REMOVE CarbonPulse from Homepage
**File: `sorcer-app/app/page.tsx`**

The breathing orb "CarbonPulse" component on the homepage is ugly and unwanted. **Remove it completely.**

1. Delete the entire `CarbonPulse` import line
2. Delete this entire block (lines ~122-125):
```tsx
{/* Carbon Pulse */}
<div className="mb-10">
  <CarbonPulse />
</div>
```
3. You can also delete the `CarbonPulse.tsx` component file entirely since it won't be used anywhere.

## TASK 1B: REMOVE the Right-Hand Stats Sidebar from Homepage
**File: `sorcer-app/app/page.tsx`**

The entire right-side `<aside>` section (lines ~157-260) with "Live Grid Status", "Your Session", "Georgia Impact", "Recent Activity", and "Quick Links" cards is ugly and poorly positioned. **Almost all of it must go.**

**What to REMOVE:**
- The entire `<aside>` element and ALL its children
- Remove the `lg:flex-row` from the parent `div` — the homepage should be single-column centered layout again
- Remove "Your Session" stats card entirely
- Remove "Georgia Impact" card entirely (it looks pandering / catery)
- Remove "Recent Activity" card entirely
- Remove "Quick Links" card entirely

**What to KEEP (but relocate):**
The **"Live Grid Status"** card is the ONE good thing. Move it into the `CarbonIndicator` component (the leaf pill in the top-right corner at `sorcer-app/components/CarbonIndicator.tsx`). Here's what to do:

### Merge Live Grid Status into CarbonIndicator
**File: `sorcer-app/components/CarbonIndicator.tsx`**

Currently this is a tiny fixed pill in the top-right corner showing just a leaf icon and kg CO₂ counter. Enhance it to be **expandable/collapsible**:

1. Keep the small pill as the **collapsed state** (current look is fine)
2. When clicked/tapped, expand it downward to reveal the Live Grid Status panel:
   ```
   ┌──────────────────────┐
   │ 🍃 127.5 kg CO₂      │  ← collapsed (existing)
   ├──────────────────────┤
   │ LIVE GRID STATUS     │  ← expanded (new)
   │ ● Pacific NW   142g  │
   │ ● Midwest      312g  │
   │ ● Southeast    198g  │
   │ ● Northeast    285g  │
   │ ● Southwest    478g  │
   └──────────────────────┘
   ```
3. Use `AnimatePresence` + `motion.div` for a smooth slide-down animation
4. Click again to collapse back to just the pill
5. The expanded panel should use the same `glass-panel` styling
6. Keep the colored status dots (green/yellow/red) for each region
7. Add a small chevron icon on the pill that rotates when expanded

### After removing the aside, the homepage layout should be:
```tsx
<div className="min-h-[calc(100vh-3rem)] py-10">
  <div className="flex flex-col max-w-2xl mx-auto w-full px-6 text-center">
    {/* Logo */}
    {/* Title "Sorcer" */}
    {/* Subtitle */}
    {/* SpellBar */}
    {/* Backend status banner (if offline) */}
    {/* Feature cards (3-column grid) */}
    {/* Footer tagline */}
  </div>
</div>
```

Single column, centered, clean. No sidebar.

---

# 🚨 PRIORITY 2: REMOVE GEORGIA IMPACT FROM CARBON LEDGER

## TASK 2: Remove "Georgia Community Impact" Section
**File: `sorcer-app/app/ledger/page.tsx`**

The "Georgia Community Impact" section (lines ~417-457) with the Georgia state outline, the peach emoji, "142 Georgia Users", etc. looks **pandering and fake**. We don't have real data to populate it. **Remove the entire section.**

Delete everything between the "Carbon Budget" section and the "Receipt History" section — specifically the entire `motion.div` that contains "Georgia Community Impact".

The ledger page should flow: Hero Stat → Charts Row → Carbon Budget → Receipt History. That's it.

---

# 🚨 PRIORITY 3: FIX THE MAP — WRONG PIN LOCATIONS

## TASK 3: Fix Data Center Pin Positions on the Map
**File: `sorcer-app/components/RealmMapSimple.tsx`**

The data center markers are NOT appearing at their correct geographic locations. Cities and states are wrong. This is the MOST IMPORTANT fix.

### Root Cause
The projection configuration is slightly off. The `geoAlbersUsa()` default is `.scale(1070).translate([480, 250])` for a 960×600 viewBox. Currently the code uses `.scale(MAP_W * 1.2).translate([MAP_W / 2, MAP_H / 2])` which equals `.scale(1152).translate([480, 300])`.

### The Fix

**Step 1:** Fix the projection in the `RealmMapInner` component (around line 343):
```typescript
const projection = useMemo(
  () => geoAlbersUsa().scale(1070).translate([MAP_W / 2, MAP_H / 2 - 25]),
  []
);
```

**Step 2:** Fix the SAME projection in the `USStates` component (around line 101):
```typescript
const projection = useMemo(
  () => geoAlbersUsa().scale(1070).translate([width / 2, height / 2 - 25]),
  [width, height]
);
```

**CRITICAL:** Both projections MUST be identical. The `USStates` component renders the state boundaries and the `RealmMapInner` projects the data center pins. If these use different projections, the pins won't align with the states.

**Step 3:** Verify coordinates are correct. Check that every DATA_CENTER entry has `lng` (longitude, negative for US) and `lat` (latitude, positive for US). The `project()` function must call `projection([lng, lat])` — longitude FIRST, latitude SECOND. This is how d3-geo expects it.

**Step 4:** After fixing, visually verify these placements:
- The Dalles, OR should be in northern Oregon
- Quincy, WA should be in central Washington state
- Ashburn, VA should be near Washington DC
- Phoenix, AZ should be in southern Arizona
- Dallas, TX should be in north-central Texas
- Chicago, IL should be on Lake Michigan
- San Jose, CA should be in the SF Bay Area
- Council Bluffs, IA should be on the Iowa-Nebraska border
- Hillsboro, OR should be near Portland, OR
- Mayes County, OK should be in northeastern Oklahoma

### Step 5: Shared Projection Utility
To avoid the two-projection mismatch problem entirely, extract the projection into a shared module:

Create `sorcer-app/lib/mapProjection.ts`:
```typescript
import { geoAlbersUsa } from "d3-geo";

export const MAP_W = 960;
export const MAP_H = 600;

export function createMapProjection() {
  return geoAlbersUsa()
    .scale(1070)
    .translate([MAP_W / 2, MAP_H / 2 - 25]);
}
```

Then import and use this in BOTH `USStates` and `RealmMapInner` so they're guaranteed to be identical.

---

# PRIORITY 4: SIMPLIFY THE TASK SCHEDULER

## TASK 4: Rework the Scheduler Page to Be Simpler and Cuter
**File: `sorcer-app/app/scheduler/page.tsx`**

The current scheduler is too complex and corporate-looking. It needs to be **simpler, cuter, and magic-themed** — like a whimsical little tick-tock clockwork thing that posts scrolls.

### Design Vision: "The Enchanted Clock Tower"

Think of it as an old wizard's clockwork device that queues up spell scrolls. The vibe should be:
- Parchment scroll items instead of generic task cards
- A cute animated clock/hourglass as the centerpiece
- Magic-themed language: "spell scrolls" not "tasks", "dispatched" not "completed"

### What to Change

**A. Remove the ScheduleForm** (the textarea + time window buttons section). Scheduling should only happen from the SpellBar on the homepage. The scheduler page is **read-only**.

**B. Simplify the page structure to just:**
1. **Header** — "The Enchanted Scroll Queue" or similar
2. **A cute animated hourglass/clock centerpiece** — small SVG animation, sand flowing or clock hands turning. Should be subtle but magical.
3. **Forecast strip** — keep the 24-hour carbon forecast but make it smaller and simpler. Just a thin horizontal bar with green/yellow/red segments and a label showing optimal window. No need for the full expanded version.
4. **Simple scroll list** — each task rendered as a little parchment scroll:

```
┌─── 📜 ───────────────────────────────┐
│ "Analyze environmental impact..."     │
│ ⏳ Pending · us-central1 · ~2.3g CO₂ │
│                        [▶ Cast] [✕]  │
└───────────────────────────────────────┘
```

- Use scroll/parchment styling (rounded corners, sepia border, slight tilt via `rotate-[-0.5deg]`)
- The 📜 emoji or a `Scroll` icon from lucide-react
- Alternate slight rotations on items for a scattered-papers look
- When a task completes, show a ✨ sparkle animation briefly
- When cancelled, the scroll burns away (scale down + fade to orange/red)

**C. Add a cute empty state** when no tasks exist:
- An hourglass illustration
- "No scrolls in the queue"
- "Schedule a spell from the Spell Bar on the home page"
- A link/button to go home

**D. Keep it simple.** No massive forecast chart. No stats grid at the top. Just the scroll list and a small inline forecast bar. Minimal, cute, magical.

---

# PRIORITY 5: SIDEBAR LOGO — TOP LEFT CORNER

## TASK 5: Ensure Logo Appears Correctly in Sidebar Header
**File: `sorcer-app/components/SorcerSidebar.tsx`**

The user says the logo is STILL not showing properly in the top-left corner. Check the sidebar header section:

1. The logo at `/images/logo.png` should be clearly visible in the sidebar header
2. Make sure the `<Image>` component has the correct path: `src="/images/logo.png"`
3. The logo box should be `w-11 h-11` with a clean background (`bg-parchment border border-oak/15`)
4. The logo image itself should be `width={32} height={32}` with `className="object-contain"`
5. There should be NO background color that clashes with or hides the logo
6. Test that the logo actually renders — check for 404 errors in the console
7. If the logo file doesn't exist at `public/images/logo.png`, log a warning but show a fallback (the Leaf icon)

**Also check `sorcer-app/components/LayoutClient.tsx`** — the collapsed sidebar state shows a small logo pill (line 63-64). Make sure that also works.

---

# PRIORITY 6: 3D DISPLAY ENHANCEMENTS

## TASK 6: Add 3D Effects and Depth Throughout the App

### 6A. Map — Enhanced 3D Parallax
**File: `sorcer-app/components/RealmMapSimple.tsx`**

The parallax effect exists but is too subtle. Enhance it:

1. **Increase parallax movement:**
   - Background layer (state boundaries): shift by `mousePos * 0.5px`
   - Mid layer (terrain labels, cities): shift by `mousePos * 1.5px`
   - Foreground layer (data center markers): shift by `mousePos * 3px`
   - Top layer (sea creatures, decorations): shift by `mousePos * 4px`
   - These layers moving at different speeds creates depth

2. **Add CSS perspective transform to the map container:**
```tsx
<motion.div
  style={{
    perspective: "1200px",
    transformStyle: "preserve-3d",
  }}
>
  <motion.div
    style={{
      transform: `rotateX(${mousePos.y * 0.8}deg) rotateY(${-mousePos.x * 0.8}deg)`,
      transformOrigin: "center center",
    }}
  >
    {/* SVG map content */}
  </motion.div>
</motion.div>
```

This will make the entire map tilt slightly toward the mouse, creating a 3D card effect.

3. **Add an edge shadow** that shifts with mouse movement — when the map tilts, one edge should have a deeper shadow:
```tsx
boxShadow: `${-mousePos.x * 3}px ${-mousePos.y * 3}px 20px rgba(107,55,16,0.15)`
```

4. **Cloud layers over dirty data centers** should float ABOVE the map plane:
```tsx
<g style={{ transform: `translate(${mousePos.x * 5}px, ${mousePos.y * 5}px) translateZ(20px)` }}>
  {/* Storm clouds */}
</g>
```

### 6B. Homepage — 3D Feature Cards
**File: `sorcer-app/app/page.tsx`**

Add a 3D tilt effect to the feature cards:
1. On mouse enter, track mouse position relative to the card
2. Apply subtle `rotateX` / `rotateY` transform (max ±5deg)
3. Add a shifting highlight/gradient that follows the mouse
4. Use `perspective: 600px` on the card container
5. On mouse leave, smoothly animate back to flat

### 6C. SpellBar — 3D Depth
**File: `sorcer-app/components/SpellBar.tsx`**

Add subtle 3D depth to the SpellBar when focused:
1. When the input is focused, the SpellBar should appear to "lift" slightly — add a growing shadow and very slight scale
2. The SearchVines decoration should shift slightly for parallax
3. The model selector and submit buttons should appear at a slightly different depth

### 6D. Profile Page — 3D Score Ring
**File: `sorcer-app/app/profile/page.tsx`**

The sustainability score ring can have a 3D effect:
1. Add a subtle `rotate3d` transform on mouse hover
2. The ring should appear to float above the card surface
3. Add a soft drop shadow behind the ring that shifts

### 6E. Ledger Page — 3D Bar Charts
**File: `sorcer-app/app/ledger/page.tsx`**

The weekly and monthly charts can have 3D bar effects:
1. Use CSS `transform: perspective(300px) rotateX(5deg)` on the chart container to give bars a slight 3D angle
2. Add side faces to bars using CSS (darker shade pseudo-elements) for an isometric look
3. Bars should "grow" from the bottom with a 3D feel

---

# PRIORITY 7: CREATIVE HACKATHON EXTRAS

## TASK 7A: Magical Particle Cursor Trail on Map
**File: `sorcer-app/components/RealmMapSimple.tsx`**

When the user moves their mouse over the map, leave a trail of fading sparkle particles:
- Small dots (2-3px) in moss/topaz/oak colors
- Each dot fades out over ~800ms
- Max 20-30 particles at a time (ring buffer)
- Very low opacity (0.3 max) so it's subtle
- Disable on mobile (no hover)

## TASK 7B: Animated Map Entrance — Scroll Unfurl
**File: `sorcer-app/components/RealmMapSimple.tsx`**

When the map page loads, animate the map appearing like a scroll being unrolled:
1. Start with the map height compressed to ~15% and opacity 0
2. Expand to full height with a slight overshoot bounce
3. Elements appear in sequence: borders → states → terrain labels → data centers → decorations
4. Use Framer Motion's `staggerChildren` for the sequential reveal
5. Total unfurl animation: ~1.5 seconds

## TASK 7C: Enchanted Ink Writing Effect for Page Headers
**File: `sorcer-app/components/PageHeader.tsx`**

When a page loads, the title text should appear as if being written by an invisible quill:
1. Characters appear one by one from left to right
2. A small quill/pen cursor SVG leads the text
3. Speed: ~30ms per character
4. The subtitle fades in after the title finishes writing
5. Only plays on first visit (use a sessionStorage flag so it doesn't replay on every navigation)

## TASK 7D: Glowing Rune Borders on Active Cards
Add a subtle animated border glow to interactive cards:
1. When hovering over a `specimen-card`, add a faint glowing border animation
2. The glow should slowly cycle through moss → topaz → moss colors
3. Use CSS `box-shadow` animation or a pseudo-element with animated gradient border
4. Very subtle — just enough to notice, not distracting

## TASK 7E: Achievement Toast with Scroll Animation
**File: Create `sorcer-app/components/AchievementToast.tsx`**

When the user achieves something (first prompt, 5 prompts, etc.), show a dramatic toast:
1. A parchment scroll unfurls from the top of the screen
2. Shows badge icon, title, and description
3. Shimmer/sparkle animation plays
4. Auto-dismisses after 4 seconds
5. Can be manually dismissed
6. Store unlocked achievements in localStorage
7. Wire into the existing badge system from `lib/gamification.ts`

## TASK 7F: Map Legend with Animated Icons
**File: `sorcer-app/components/RealmMapSimple.tsx`**

The current legend is just colored dots. Make it more visually interesting:
1. Instead of plain dots, use tiny animated icons:
   - Clean: tiny animated tree swaying
   - Mixed: small fog wisps drifting
   - Dirty: small storm cloud with lightning flash
2. Add a toggleable "show/hide legend" with smooth animation
3. Position the legend inside the map, bottom-left, on a small parchment card

## TASK 7G: Dynamic Favicon
**File: `sorcer-app/app/layout.tsx` or create a hook**

Change the browser tab favicon dynamically based on the current grid status:
- Green leaf when grid is clean
- Yellow leaf when mixed
- Red leaf when dirty
- This is a small touch judges notice

---

# STILL-OPEN TASKS FROM PREVIOUS PROMPT (verify these are done)

## CHECK 1: Dark Mode
Verify dark mode works (Tailwind config uses CSS variables, not hardcoded hex). Toggle the "Corrupt/Purify" button in the sidebar — the entire app should switch themes cleanly.

## CHECK 2: Collapsible Sidebar
Verify the sidebar can be collapsed on desktop with the `PanelLeftClose` button, state persists in localStorage, and there's a small pill to reopen it.

## CHECK 3: Onboarding Tour Replay
Verify the "Tour Guide" button in the sidebar footer works — it should remove `sorcer-tour-seen` from localStorage and restart the tour.

## CHECK 4: Keyboard Shortcuts
Verify `⌘1` through `⌘5` navigate to Field Notes, Carbon Ledger, Realm Map, Your Profile, and Task Scroll respectively.

## CHECK 5: SpellBar Scheduling
Verify the clock icon next to the send button in the SpellBar opens a dropdown with scheduling options. When selected, it should show a toast notification.

## CHECK 6: Loading Skeletons
Verify each page has proper skeleton loading states.

---

# IMPLEMENTATION ORDER

Execute in this EXACT order:

1. **Task 1A** — Remove CarbonPulse from homepage (2 min)
2. **Task 1B** — Remove right-hand sidebar from homepage + move Live Grid Status into expandable CarbonIndicator (20 min)
3. **Task 2** — Remove Georgia Impact from Ledger (2 min)
4. **Task 3** — FIX MAP PIN LOCATIONS (30 min — take your time, this matters)
5. **Task 5** — Verify sidebar logo (5 min)
6. **Task 4** — Simplify scheduler page (25 min)
7. **Task 6** — 3D display enhancements (40 min)
8. **Task 7** — Creative extras (remaining time — do as many as possible, prioritize 7B, 7C, 7A, 7F)
9. **Checks 1-6** — Verify all previously built features still work (10 min)

---

## ⚠️ RULES

1. **Never modify files in `/backend/`** — it is read-only.
2. **Always use the existing design system** — colors, fonts, card styles from `globals.css` and `tailwind.config.ts`.
3. **All components must be `"use client"`** unless they're pure server components.
4. **Use TypeScript strictly** — no `any`, no `// @ts-ignore`.
5. **Use existing packages** — `framer-motion`, `lucide-react`, `d3-geo`, `topojson-client`, `next-themes` are already installed. Don't add new dependencies unless absolutely necessary.
6. **Maintain the botanical journal / hand-drawn / fantasy map aesthetic** throughout.
7. **Test each component after building** — make sure there are no runtime errors.
8. **Logo is at `public/images/logo.png`** — reference it as `/images/logo.png`.
9. **Dark mode must work everywhere** — use CSS variables, not hardcoded colors.
10. **DO NOT add Georgia community impact sections.** We don't have real data for that. It looks fake and pandering. Remove any remaining "Georgia Impact" references.

---

## 🎯 SUCCESS CRITERIA

When done, the app should have:
- ✅ **Clean homepage** — no pulse orb, no right-side stats, just logo + title + SpellBar + feature cards (single centered column)
- ✅ **Expandable Live Grid Status** — tucked into the top-right carbon indicator, click to expand/collapse
- ✅ **No Georgia Impact anywhere** — removed from ledger and homepage
- ✅ **MAP PINS AT CORRECT LOCATIONS** — data centers appear where they actually are geographically
- ✅ **Cute simplified scheduler** — magic-themed scroll queue, no input form, just the queue display
- ✅ **Logo visible in sidebar** — top-left corner, clearly rendered
- ✅ **3D depth throughout** — parallax map, tilting cards, lifted SpellBar, 3D charts
- ✅ **Creative extras** — scroll unfurl, quill writing headers, sparkle cursor, animated legend
- ✅ All previously built features (dark mode, collapsible sidebar, tour, shortcuts, scheduling from SpellBar) still working
- ✅ Zero TypeScript errors, zero runtime crashes

**Go build. Make it magical.** 🧙‍♂️
