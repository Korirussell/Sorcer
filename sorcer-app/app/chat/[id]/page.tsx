"use client";

import { useEffect, useState, useRef, useCallback, useMemo, useReducer, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bot, UserIcon, Leaf, Zap, Flame, Copy, Check, FlaskConical, Search, Shrink, MapPin, Shield, Sparkles } from "lucide-react";
import { SpellBar } from "@/components/SpellBar";
import { RouteMapViz } from "@/components/RouteMapViz";
import { useEnergy } from "@/context/EnergyContext";
import { postOrchestrate, getReceipt } from "@/utils/api";
import {
  getChat,
  getMessages,
  addMessage,
  updateChat,
  createChat,
  type ChatRecord,
  type StoredMessage,
  type CarbonMeta,
} from "@/lib/localChatStore";

// ─── Dummy response generation ──────────────────────────────────────────────

const DUMMY_RESPONSES: Record<string, string> = {
  carbon: `Great question about carbon impact! Here's what the data shows:

**Carbon Footprint by Region:**
| Region | CO₂ g/kWh | CFE % |
|--------|-----------|-------|
| us-central1 (Iowa) | ~120 | 89% |
| us-west1 (Oregon) | ~80 | 92% |
| europe-west1 (Belgium) | ~150 | 82% |
| us-east4 (Virginia) | ~380 | 55% |

By routing your prompt to **us-west1**, Sorcer saved approximately **0.42g CO₂** compared to a default deployment. That's a **78% reduction** — just by choosing the right data center.

The key insight: renewable energy availability varies dramatically by region and time of day. Sorcer's Carbon Oracle monitors these signals in real-time to make optimal routing decisions.`,

  code: `Here's an optimized solution:

\`\`\`python
import asyncio
from dataclasses import dataclass

@dataclass
class CarbonMetrics:
    cost_g: float
    baseline_g: float
    saved_g: float
    region: str

async def process_batch(items: list[str]) -> list[CarbonMetrics]:
    """Process items with carbon-aware scheduling."""
    tasks = [analyze_item(item) for item in items]
    results = await asyncio.gather(*tasks)
    
    total_saved = sum(r.saved_g for r in results)
    print(f"Total carbon saved: {total_saved:.2f}g CO₂")
    
    return results
\`\`\`

This approach uses async processing to batch requests efficiently, reducing both latency and carbon footprint. The \`CarbonMetrics\` dataclass tracks savings per operation.`,

  general: `That's an interesting question! Let me break it down:

**Key Points:**
1. **Efficiency matters** — Small optimizations compound at scale. A 0.3g saving per query becomes tonnes of CO₂ at millions of requests.

2. **Region selection is critical** — Data centers powered by renewable energy can reduce carbon by 60-90% with zero impact on response quality.

3. **Smart caching helps** — Sorcer's prompt caching system reuses previously computed context, saving both compute and carbon. In this conversation, we've already cached several context tokens.

4. **Model selection** — Not every query needs the most powerful model. Sorcer's Oracle analyzes query complexity and routes to the most efficient model that can handle it well.

The bottom line: sustainable AI isn't about doing less — it's about being smarter about *how* we compute.`,

  hello: `Hello! 👋 Welcome to Sorcer — the Carbon Arbitrage Engine.

I'm here to help you with anything while keeping our carbon footprint minimal. Here's what makes this conversation special:

- 🌿 **Carbon-Aware Routing** — Your prompts are routed to the cleanest available data center
- ⚡ **Prompt Caching** — Repeated context is served from cache, saving compute
- 📊 **Real-time Tracking** — Every response tracks its carbon cost vs baseline

Try asking me about:
- Carbon footprint of AI models
- Code optimization
- Sustainable computing strategies
- Or anything else!

*This response was routed through us-central1 (Iowa) — 89% carbon-free energy.*`,
};

function pickDummyResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.length < 15) {
    return DUMMY_RESPONSES.hello;
  }
  if (lower.includes("carbon") || lower.includes("energy") || lower.includes("emission") || lower.includes("green") || lower.includes("sustain")) {
    return DUMMY_RESPONSES.carbon;
  }
  if (lower.includes("code") || lower.includes("function") || lower.includes("python") || lower.includes("script") || lower.includes("build") || lower.includes("implement")) {
    return DUMMY_RESPONSES.code;
  }
  return DUMMY_RESPONSES.general;
}

function makeDummyCarbonMeta(): CarbonMeta {
  const regions = ["us-central1", "us-west1", "europe-west1"];
  const models = ["google/gemini-2.0-flash", "anthropic/claude-haiku-4.5", "openai/gpt-5.2"];
  const region = regions[Math.floor(Math.random() * regions.length)];
  const model = models[Math.floor(Math.random() * models.length)];
  const cfeMap: Record<string, number> = { "us-central1": 89, "us-west1": 92, "europe-west1": 82 };
  const baseline = 0.4 + Math.random() * 0.7;
  const cost = baseline * (0.15 + Math.random() * 0.25);
  return {
    cost_g: Math.round(cost * 100) / 100,
    baseline_g: Math.round(baseline * 100) / 100,
    saved_g: Math.round((baseline - cost) * 100) / 100,
    model,
    region,
    cfe_percent: cfeMap[region] || 85,
    tokens_in: 10 + Math.floor(Math.random() * 30),
    tokens_out: 200 + Math.floor(Math.random() * 600),
    latency_ms: 600 + Math.floor(Math.random() * 2000),
    cached: Math.random() > 0.4,
    cache_hit_tokens: Math.floor(Math.random() * 300),
    compressed: Math.random() > 0.5,
    original_tokens: 20,
    compressed_tokens: 14,
    compression_ratio: 0.6 + Math.random() * 0.3,
  };
}

// ─── Backend integration ────────────────────────────────────────────────────

/** Map backend eco_stats + receipt to frontend CarbonMeta */
function mapBackendToCarbonMeta(
  ecoStats: Record<string, unknown>,
  receipt: Record<string, unknown> | null,
  prompt: string,
  response: string,
): CarbonMeta {
  const baselineCo2 = Number(ecoStats.baseline_co2 ?? receipt?.baseline_co2_est ?? 0.5);
  const actualCo2 = Number(ecoStats.actual_co2 ?? receipt?.actual_co2 ?? 0.1);
  const savedCo2 = Number(ecoStats.co2_saved_grams ?? receipt?.net_savings ?? baselineCo2 - actualCo2);
  const wasCached = Boolean(ecoStats.was_cached ?? receipt?.was_cached ?? false);
  const model = String(receipt?.model_used ?? ecoStats.model ?? "gemini-2.0-flash");
  const region = String(receipt?.server_location ?? "us-central1").split(" ")[0];
  const cfeMap: Record<string, number> = { "us-central1": 89, "us-west1": 92, "europe-west1": 82 };
  const tokensIn = prompt.split(/\s+/).length;
  const tokensOut = response.split(/\s+/).length;
  // Compression: backend eco_stats may have tokens_saved
  const tokensSaved = Number(ecoStats.tokens_saved ?? 0);
  const originalTokens = tokensIn + tokensSaved;
  const compressed = tokensSaved > 0;

  return {
    cost_g: Math.round(actualCo2 * 1000) / 1000,
    baseline_g: Math.round(baselineCo2 * 1000) / 1000,
    saved_g: Math.round(savedCo2 * 1000) / 1000,
    model: model.includes("/") ? model : `google/${model}`,
    region,
    cfe_percent: cfeMap[region] || 85,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    latency_ms: 0, // will be measured client-side
    cached: wasCached,
    cache_hit_tokens: wasCached ? tokensIn : 0,
    compressed,
    original_tokens: originalTokens,
    compressed_tokens: tokensIn,
    compression_ratio: originalTokens > 0 ? tokensIn / originalTokens : 1,
  };
}

/** Try calling the real backend. Returns { response, carbonMeta } or null on failure. */
async function callBackend(
  prompt: string,
  chatId: string,
): Promise<{ response: string; carbonMeta: CarbonMeta; deferred: boolean } | null> {
  try {
    const start = performance.now();
    const result = await postOrchestrate({
      prompt,
      user_id: "sorcer-user",
      project_id: chatId,
    });
    const latency = Math.round(performance.now() - start);

    if (result.deferred) {
      return {
        response: "⏳ Your prompt has been queued for a greener window. The grid is currently carbon-heavy — Sorcer will process this when renewable energy is more available.",
        carbonMeta: { ...makeDummyCarbonMeta(), cost_g: 0, baseline_g: 0, saved_g: 0, latency_ms: latency, cached: false, compressed: false },
        deferred: true,
      };
    }

    // Try to fetch the receipt for richer data
    let receipt: Record<string, unknown> | null = null;
    if (result.receipt_id) {
      try {
        receipt = await getReceipt(result.receipt_id) as unknown as Record<string, unknown>;
      } catch { /* receipt fetch is optional */ }
    }

    const carbonMeta = mapBackendToCarbonMeta(
      (result.eco_stats ?? {}) as Record<string, unknown>,
      receipt,
      prompt,
      result.response,
    );
    carbonMeta.latency_ms = latency;

    return { response: result.response, carbonMeta, deferred: false };
  } catch {
    return null; // Backend unreachable — caller will fall back to dummy
  }
}

// ─── Model badge helper ─────────────────────────────────────────────────────

const MODEL_DISPLAY: Record<string, { icon: typeof Leaf; color: string; label: string }> = {
  "google/gemini-2.0-flash": { icon: Leaf, color: "text-moss", label: "Eco Flash" },
  "google/gemini-2.5-flash-lite": { icon: Leaf, color: "text-moss", label: "Eco" },
  "anthropic/claude-haiku-4.5": { icon: Zap, color: "text-topaz", label: "Balanced" },
  "openai/gpt-5.2": { icon: Flame, color: "text-witchberry", label: "Power" },
};

// ─── Optimization phase types ────────────────────────────────────────────────

type OptPhase = "cache_check" | "compressing" | "routing" | "map" | "generating" | "done";

const OPT_STEPS: { phase: OptPhase; icon: typeof Search; label: string; detail: string; color: string; bg: string }[] = [
  { phase: "cache_check", icon: Search, label: "Semantic Cache", detail: "Searching for similar prompts...", color: "text-topaz", bg: "bg-topaz/15" },
  { phase: "compressing", icon: Shrink, label: "Prompt Compression", detail: "Removing redundant tokens...", color: "text-miami", bg: "bg-miami/15" },
  { phase: "routing", icon: MapPin, label: "Carbon-Aware Routing", detail: "Finding cleanest server...", color: "text-moss", bg: "bg-moss/15" },
  { phase: "map", icon: Shield, label: "Route Locked", detail: "Transmitting to optimal server...", color: "text-moss", bg: "bg-moss/15" },
  { phase: "generating", icon: Sparkles, label: "Generating", detail: "Model is thinking...", color: "text-oak", bg: "bg-oak/10" },
];

// Region coordinates for inline route map
const REGION_COORDS: Record<string, [number, number]> = {
  "us-central1": [240, 140],
  "us-west1": [80, 120],
  "us-east4": [370, 150],
  "us-east1": [350, 180],
  "europe-west1": [240, 140],
  "auto": [240, 140],
};
const ATLANTA: [number, number] = [330, 170];

function OptimizationSequence({ phase, region }: { phase: OptPhase; region?: string }) {
  const activeIdx = OPT_STEPS.findIndex((s) => s.phase === phase);
  const dest = REGION_COORDS[region || "us-central1"] || REGION_COORDS["us-central1"];

  return (
    <motion.div
      className="space-y-2 px-1"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
    >
      {OPT_STEPS.map((step, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
        const isPending = i > activeIdx;
        return (
          <motion.div
            key={step.phase}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
              isActive ? `${step.bg} border border-current/10` : isDone ? "opacity-60" : "opacity-20"
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: isPending ? 0.2 : 1, x: 0 }}
            transition={{ delay: i * 0.15, duration: 0.3 }}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isActive ? step.bg : isDone ? "bg-moss/10" : "bg-oak/5"}`}>
              {isDone ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Check className="w-3.5 h-3.5 text-moss" />
                </motion.div>
              ) : isActive ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                  <step.icon className={`w-3.5 h-3.5 ${step.color}`} />
                </motion.div>
              ) : (
                <step.icon className="w-3.5 h-3.5 text-oak/30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] font-medium ${isActive ? step.color : isDone ? "text-moss" : "text-oak/30"}`}>
                {step.label}
                {isDone && step.phase === "cache_check" && " — Hit!"}
                {isDone && step.phase === "compressing" && " — 30% smaller"}
                {isDone && step.phase === "routing" && ` — ${region || "us-central1"}`}
              </div>
              {isActive && (
                <motion.div
                  className="text-[9px] text-oak/40"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {step.detail}
                </motion.div>
              )}
            </div>
            {isActive && (
              <motion.div
                className={`w-1.5 h-1.5 rounded-full ${step.color.replace("text-", "bg-")}`}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </motion.div>
        );
      })}

      {/* Inline route map — shows during map phase */}
      {(phase === "map" || phase === "generating") && (
        <motion.div
          className="rounded-xl overflow-hidden border border-moss/15 bg-parchment-dark/30"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 120 }}
          transition={{ duration: 0.5 }}
        >
          <svg viewBox="0 0 440 120" className="w-full h-full">
            {/* Simple US outline hint */}
            <rect x="20" y="10" width="400" height="100" rx="8" fill="rgba(107,55,16,0.02)" stroke="rgba(107,55,16,0.06)" strokeWidth="0.5" />
            {/* Route curve — red dotted like realm map */}
            <motion.path
              d={`M${ATLANTA[0]},${ATLANTA[1]} Q${(ATLANTA[0] + dest[0]) / 2},${Math.min(ATLANTA[1], dest[1]) - 50} ${dest[0]},${dest[1]}`}
              fill="none" stroke="#B52121" strokeWidth={1.5} strokeDasharray="6,4" opacity={0.6}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
            {/* Traveling dot */}
            <motion.circle r={3} fill="#B52121"
              initial={{ cx: ATLANTA[0], cy: ATLANTA[1] }}
              animate={{ cx: dest[0], cy: dest[1] }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
            />
            {/* Origin — Atlanta */}
            <circle cx={ATLANTA[0]} cy={ATLANTA[1]} r={5} fill="rgba(107,55,16,0.15)" />
            <circle cx={ATLANTA[0]} cy={ATLANTA[1]} r={2.5} fill="#6B3710" />
            <text x={ATLANTA[0]} y={ATLANTA[1] - 8} textAnchor="middle" fill="#6B3710" fontSize="7" fontWeight="bold" opacity={0.6}>Atlanta</text>
            {/* Destination */}
            <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.2 }}>
              <motion.circle cx={dest[0]} cy={dest[1]} r={8} fill="rgba(75,106,76,0.1)"
                animate={{ r: [8, 12, 8] }} transition={{ duration: 2, repeat: Infinity }} />
              <circle cx={dest[0]} cy={dest[1]} r={4} fill="rgba(75,106,76,0.2)" />
              <circle cx={dest[0]} cy={dest[1]} r={2} fill="#4B6A4C" />
              <text x={dest[0]} y={dest[1] - 10} textAnchor="middle" fill="#4B6A4C" fontSize="7" fontWeight="bold" opacity={0.7}>{region || "us-central1"}</text>
            </motion.g>
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Server comparison mini-dashboard ────────────────────────────────────────

const SERVER_DATA = [
  { region: "us-east4", label: "Virginia", kj: 1.8, co2: 380, cfe: 55 },
  { region: "us-central1", label: "Iowa", kj: 0.9, co2: 120, cfe: 89 },
  { region: "us-west1", label: "Oregon", kj: 0.7, co2: 80, cfe: 92 },
  { region: "europe-west1", label: "Belgium", kj: 1.2, co2: 150, cfe: 82 },
];

function ServerComparison({ chosenRegion }: { chosenRegion: string }) {
  const nearest = SERVER_DATA[0]; // Virginia (nearest to Atlanta)
  const chosen = SERVER_DATA.find((s) => s.region === chosenRegion) || SERVER_DATA[2];
  const ratio = nearest.co2 / Math.max(chosen.co2, 1);

  return (
    <motion.div
      className="mt-2 px-3 py-2.5 rounded-xl bg-parchment-dark/40 border border-oak/8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="text-[10px] font-medium text-oak/50 mb-2 flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-topaz" />
        Server Comparison
      </div>
      <div className="space-y-1.5">
        {SERVER_DATA.map((s, i) => {
          const isChosen = s.region === chosenRegion;
          const isNearest = i === 0;
          return (
            <motion.div
              key={s.region}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] ${
                isChosen ? "bg-moss/10 border border-moss/15" : isNearest ? "bg-witchberry/5 border border-witchberry/10" : ""
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isChosen ? "bg-moss" : isNearest ? "bg-witchberry" : "bg-oak/20"}`} />
              <span className={`flex-1 ${isChosen ? "text-moss font-medium" : isNearest ? "text-witchberry" : "text-oak/50"}`}>
                {s.label}
                {isChosen && " ✓"}
                {isNearest && " (nearest)"}
              </span>
              <span className="text-oak/30 tabular-nums">{s.co2}g/kWh</span>
              <div className="w-12 h-1 rounded-full bg-oak/8 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isChosen ? "bg-moss" : isNearest ? "bg-witchberry/50" : "bg-oak/20"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.co2 / 400) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
      {ratio > 1 && (
        <motion.div
          className="mt-2 text-[10px] text-moss font-medium text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Your nearest server is <span className="text-witchberry">{ratio.toFixed(1)}x worse</span> than the optimal route
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({ msg, index, isStreaming }: { msg: StoredMessage; index: number; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const modelInfo = MODEL_DISPLAY[msg.carbon.model] || { icon: Bot, color: "text-oak", label: msg.carbon.model.split("/").pop() };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [msg.content]);

  return (
    <motion.div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), type: "spring", stiffness: 150, damping: 22 }}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 ${isUser ? "bg-oak/8" : "bg-moss/10"}`}>
        {isUser ? <UserIcon className="w-4 h-4 text-oak/50" /> : <Bot className="w-4 h-4 text-moss" />}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 max-w-[85%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block text-left rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-oak/8 text-oak rounded-tr-md"
              : "bg-parchment-dark/60 border border-oak/8 text-oak/80 rounded-tl-md"
          }`}
        >
          {/* Render content with basic markdown-like formatting */}
          <div className="whitespace-pre-wrap break-words prose-sm">
            {msg.content}
            {isStreaming && (
              <motion.span
                className="inline-block w-0.5 h-4 bg-moss ml-0.5 align-middle"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>
        </div>

        {/* ═══ SAVINGS BREAKDOWN — impossible to miss ═══ */}
        {!isUser && (msg.carbon.cost_g > 0 || msg.carbon.cached || msg.carbon.compressed) && !isStreaming && (() => {
          const reductionPct = msg.carbon.baseline_g > 0 ? Math.round(((msg.carbon.baseline_g - msg.carbon.cost_g) / msg.carbon.baseline_g) * 100) : 0;
          return (
          <motion.div
            className="mt-3 rounded-xl border border-moss/15 bg-gradient-to-br from-moss/5 to-parchment-dark/30 overflow-hidden"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 120 }}
          >
            {/* Hero savings banner */}
            <div className="px-3 py-2.5 flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-xl bg-moss/15 flex items-center justify-center shrink-0 relative"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                <Leaf className="w-5 h-5 text-moss" />
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-moss/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <motion.span
                    className="text-xl font-header text-moss"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {reductionPct}%
                  </motion.span>
                  <span className="text-[10px] text-moss/60">less carbon than a regular prompt</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-oak/40">Saved {msg.carbon.saved_g.toFixed(2)}g CO₂</span>
                  <span className="text-[10px] text-oak/20">·</span>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] ${modelInfo.color}`}>
                    <modelInfo.icon className="w-2.5 h-2.5" />
                    {modelInfo.label}
                  </span>
                  <span className="text-[10px] text-oak/20">·</span>
                  <span className="text-[10px] text-oak/30">{msg.carbon.region}</span>
                </div>
              </div>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-oak/20 hover:text-oak/50 hover:bg-oak/5 transition-colors"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-moss" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Animated reduction bar */}
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] text-witchberry/60">Regular</span>
                <div className="flex-1 h-2 rounded-full bg-witchberry/10 overflow-hidden">
                  <div className="h-full rounded-full bg-witchberry/25 w-full" />
                </div>
                <span className="text-[9px] text-oak/30 tabular-nums w-12 text-right">{msg.carbon.baseline_g.toFixed(3)}g</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-moss font-medium">Sorcer</span>
                <div className="flex-1 h-2 rounded-full bg-oak/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-moss/50"
                    initial={{ width: "100%" }}
                    animate={{ width: `${msg.carbon.baseline_g > 0 ? (msg.carbon.cost_g / msg.carbon.baseline_g) * 100 : 100}%` }}
                    transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
                  />
                </div>
                <span className="text-[9px] text-moss font-medium tabular-nums w-12 text-right">{msg.carbon.cost_g.toFixed(3)}g</span>
              </div>
            </div>

            {/* Optimization badges */}
            <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
              {msg.carbon.cached && (
                <motion.span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium text-topaz bg-topaz/10 border border-topaz/15"
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 1, type: "spring" }}
                >
                  <Zap className="w-2.5 h-2.5" />
                  Cache Hit · {msg.carbon.cache_hit_tokens} tokens
                </motion.span>
              )}
              {msg.carbon.compressed && msg.carbon.original_tokens > 0 && (
                <motion.span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium text-miami bg-miami/10 border border-miami/15"
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 1.1, type: "spring" }}
                >
                  <Shrink className="w-2.5 h-2.5" />
                  Compressed {Math.round((1 - msg.carbon.compression_ratio) * 100)}%
                </motion.span>
              )}
              <motion.span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium text-moss bg-moss/10 border border-moss/15"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 1.2, type: "spring" }}
              >
                <MapPin className="w-2.5 h-2.5" />
                {msg.carbon.cfe_percent}% Clean Energy
              </motion.span>
            </div>
          </motion.div>
          );
        })()}
      </div>
    </motion.div>
  );
}

// ─── State Machine ───────────────────────────────────────────────────────────

type OptStep = "cache_check" | "compressing" | "routing" | "map" | "generating";

type ChatPhase =
  | { type: "idle" }
  | { type: "optimizing"; step: OptStep }
  | { type: "streaming"; content: string }
  | { type: "complete"; showBreakdown: boolean };

type ChatAction =
  | { type: "START_OPTIMIZING" }
  | { type: "NEXT_OPT_STEP" }
  | { type: "START_STREAMING" }
  | { type: "STREAM_CHAR"; content: string }
  | { type: "FINISH" }
  | { type: "SHOW_BREAKDOWN" }
  | { type: "HIDE_BREAKDOWN" }
  | { type: "RESET" };

const OPT_STEP_ORDER: OptStep[] = ["cache_check", "compressing", "routing", "map", "generating"];

function chatPhaseReducer(state: ChatPhase, action: ChatAction): ChatPhase {
  switch (action.type) {
    case "START_OPTIMIZING":
      return { type: "optimizing", step: "cache_check" };
    case "NEXT_OPT_STEP": {
      if (state.type !== "optimizing") return state;
      const idx = OPT_STEP_ORDER.indexOf(state.step);
      if (idx < OPT_STEP_ORDER.length - 1) {
        return { type: "optimizing", step: OPT_STEP_ORDER[idx + 1] };
      }
      return state; // stay on "generating" until backend resolves
    }
    case "START_STREAMING":
      return { type: "streaming", content: "" };
    case "STREAM_CHAR":
      return { type: "streaming", content: action.content };
    case "FINISH":
      return { type: "complete", showBreakdown: true };
    case "SHOW_BREAKDOWN":
      if (state.type === "complete") return { ...state, showBreakdown: true };
      return state;
    case "HIDE_BREAKDOWN":
      if (state.type === "complete") return { ...state, showBreakdown: false };
      return state;
    case "RESET":
      return { type: "idle" };
    default:
      return state;
  }
}

// ─── Inner Chat Component (uses useSearchParams) ─────────────────────────────

function ChatPageInner() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  const { selectedModelId } = useEnergy();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query");
  const autoSentRef = useRef(false);

  const [phase, dispatch] = useReducer(chatPhaseReducer, { type: "idle" });
  const [chat, setChat] = useState<ChatRecord | null>(null);
  const [messages, setMessagesState] = useState<StoredMessage[]>([]);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [optRegion, setOptRegion] = useState<string>("us-central1");
  const [lastPromptText, setLastPromptText] = useState<string>("");
  const [lastCarbonMeta, setLastCarbonMeta] = useState<CarbonMeta | null>(null);
  const [showBreakdownManual, setShowBreakdownManual] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  // undefined = not yet fetched, null = backend offline, object = result
  const [backendResult, setBackendResult] = useState<{ response: string; carbonMeta: CarbonMeta; deferred: boolean } | null | undefined>(undefined);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamCancelledRef = useRef(false);

  // Derive status for SpellBar
  const status: "ready" | "submitted" | "streaming" | "error" = useMemo(() => {
    if (phase.type === "optimizing") return "submitted";
    if (phase.type === "streaming") return "streaming";
    return "ready";
  }, [phase.type]);

  // Load chat + messages from localStorage
  useEffect(() => {
    let c = getChat(chatId);
    if (!c) {
      c = {
        id: chatId,
        title: "New Conversation",
        createdAt: new Date().toISOString(),
        carbonSaved: 0,
        promptCount: 0,
        model: selectedModelId || "auto",
        region: "auto",
      };
      createChat(c);
    }
    setChat(c);
    setMessagesState(getMessages(chatId));
    setLoaded(true);
  }, [chatId, selectedModelId]);

  // ─── A. Optimization phase timer (Strict-Mode safe) ──────────────────────
  useEffect(() => {
    if (phase.type !== "optimizing") return;
    // "generating" step waits for backend — no auto-advance
    if (phase.step === "generating") return;
    const durations: Record<string, number> = {
      cache_check: 600,
      compressing: 500,
      routing: 500,
      map: 800,
    };
    const timer = setTimeout(() => dispatch({ type: "NEXT_OPT_STEP" }), durations[phase.step] || 500);
    return () => clearTimeout(timer);
  }, [phase]);

  // ─── B. Fire backend call when optimization starts ───────────────────────
  useEffect(() => {
    if (phase.type !== "optimizing" || !currentPrompt || backendResult !== undefined) return;
    let cancelled = false;
    callBackend(currentPrompt, chatId).then((result) => {
      if (!cancelled) {
        if (result) {
          setBackendResult(result);
        } else {
          // Backend offline — use dummy immediately
          const dummyResponse = pickDummyResponse(currentPrompt);
          const dummyMeta = makeDummyCarbonMeta();
          setBackendResult({ response: dummyResponse, carbonMeta: dummyMeta, deferred: false });
        }
      }
    });
    return () => { cancelled = true; };
  }, [phase.type, currentPrompt, chatId, backendResult]);

  // ─── C. Transition from "generating" to "streaming" when backend resolves ─
  useEffect(() => {
    if (phase.type !== "optimizing" || phase.step !== "generating") return;
    // Wait until backendResult is available (not undefined)
    if (backendResult === undefined) return;

    const timer = setTimeout(() => {
      dispatch({ type: "START_STREAMING" });
    }, 300);
    return () => clearTimeout(timer);
  }, [phase, backendResult]);

  // ─── D. Character-by-character streaming ─────────────────────────────────
  useEffect(() => {
    if (phase.type !== "streaming") return;

    // Determine the full response
    let fullResponse: string;
    let carbonMeta: CarbonMeta;

    if (backendResult) {
      fullResponse = backendResult.response;
      carbonMeta = backendResult.carbonMeta;
    } else {
      fullResponse = currentPrompt ? pickDummyResponse(currentPrompt) : "Hello!";
      carbonMeta = makeDummyCarbonMeta();
    }

    setOptRegion(carbonMeta.region);
    streamCancelledRef.current = false;

    let i = 0;
    let accumulated = "";
    const chars = fullResponse.split("");

    function streamNext() {
      if (streamCancelledRef.current || i >= chars.length) {
        if (!streamCancelledRef.current) {
          // Streaming complete — save message
          const assistantMsg: StoredMessage = {
            id: crypto.randomUUID(),
            chatId,
            role: "assistant",
            content: fullResponse,
            createdAt: new Date().toISOString(),
            carbon: carbonMeta,
          };
          addMessage(assistantMsg);
          setMessagesState((prev) => [...prev, assistantMsg]);

          // Update chat carbon stats
          const newSaved = (getChat(chatId)?.carbonSaved || 0) + carbonMeta.saved_g;
          updateChat(chatId, { carbonSaved: newSaved, model: carbonMeta.model, region: carbonMeta.region });
          setChat((prev) => prev ? { ...prev, carbonSaved: newSaved, model: carbonMeta.model, region: carbonMeta.region } : prev);

          setLastCarbonMeta(carbonMeta);
          setLastPromptText(currentPrompt || "");

          // Reset for next prompt
          setCurrentPrompt(null);
          setBackendResult(undefined);

          dispatch({ type: "FINISH" });
        }
        return;
      }

      accumulated += chars[i];
      dispatch({ type: "STREAM_CHAR", content: accumulated });
      const char = chars[i];
      const delay = char === " " ? 6 : char === "\n" ? 20 : 8 + Math.random() * 6;
      i++;
      setTimeout(streamNext, delay);
    }

    // Small delay before starting stream for visual transition
    const startTimer = setTimeout(streamNext, 100);

    return () => {
      streamCancelledRef.current = true;
      clearTimeout(startTimer);
    };
    // Only run when phase becomes "streaming" — deps intentionally limited
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.type]);

  // ─── E. Auto-send from URL query param (Strict-Mode safe) ────────────────
  useEffect(() => {
    if (!loaded || autoSentRef.current || !initialQuery) return;

    const timer = setTimeout(() => {
      autoSentRef.current = true;
      window.history.replaceState({}, "", `/chat/${chatId}`);
      triggerSend(initialQuery, true);
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, chatId, initialQuery]);

  // ─── Send prompt (adds user msg, starts state machine) ───────────────────
  const triggerSend = useCallback((prompt: string, isFirstMessage: boolean) => {
    // Save user message
    const userMsg: StoredMessage = {
      id: crypto.randomUUID(),
      chatId,
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
      carbon: {
        cost_g: 0, baseline_g: 0, saved_g: 0,
        model: "", region: "", cfe_percent: 0,
        tokens_in: prompt.split(/\s+/).length, tokens_out: 0,
        latency_ms: 0, cached: false, cache_hit_tokens: 0,
        compressed: false, original_tokens: 0, compressed_tokens: 0, compression_ratio: 1,
      },
    };
    addMessage(userMsg);
    setMessagesState((prev) => [...prev, userMsg]);

    // Update chat title + prompt count
    const currentChat = getChat(chatId);
    if (currentChat && (isFirstMessage || currentChat.title === "New Conversation")) {
      const title = prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt;
      updateChat(chatId, { title, promptCount: (currentChat.promptCount || 0) + 1 });
      setChat((prev) => prev ? { ...prev, title, promptCount: (prev.promptCount || 0) + 1 } : prev);
    } else {
      updateChat(chatId, { promptCount: (currentChat?.promptCount || 0) + 1 });
      setChat((prev) => prev ? { ...prev, promptCount: (prev.promptCount || 0) + 1 } : prev);
    }

    // Set current prompt and clear previous backend result
    setCurrentPrompt(prompt);
    setBackendResult(undefined);

    // Start the state machine
    dispatch({ type: "START_OPTIMIZING" });
  }, [chatId]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, phase, scrollToBottom]);

  // Handle sending a message from SpellBar
  const handleSubmit = useCallback(() => {
    const prompt = input.trim();
    if (!prompt || (phase.type !== "idle" && phase.type !== "complete")) return;
    setInput("");

    // If we were in "complete" state, reset first
    if (phase.type === "complete") {
      dispatch({ type: "RESET" });
    }

    const isFirst = chat?.title === "New Conversation";
    // Use setTimeout(0) to let the RESET dispatch settle
    setTimeout(() => {
      triggerSend(prompt, isFirst ?? false);
    }, 0);
  }, [input, phase.type, chat, triggerSend]);

  // Compute total carbon saved
  const totalSaved = useMemo(() => {
    return messages
      .filter((m) => m.role === "assistant")
      .reduce((sum, m) => sum + m.carbon.saved_g, 0);
  }, [messages]);

  // Show breakdown: from phase or manual toggle
  const isBreakdownVisible = (phase.type === "complete" && phase.showBreakdown) || showBreakdownManual;
  const closeBreakdown = useCallback(() => {
    if (phase.type === "complete") dispatch({ type: "HIDE_BREAKDOWN" });
    setShowBreakdownManual(false);
  }, [phase.type]);
  const openBreakdown = useCallback(() => {
    setShowBreakdownManual(true);
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <motion.div
          className="w-10 h-10 rounded-full border-2 border-moss/30 border-t-moss"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] max-w-3xl mx-auto">
      {/* Chat title — small, unobtrusive */}
      <div className="flex items-center gap-3 px-2 py-3 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="p-1.5 rounded-lg text-oak/40 hover:text-oak hover:bg-oak/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-medium text-oak truncate">{chat?.title || "Chat"}</h1>
          <div className="flex items-center gap-2">
            {totalSaved > 0 && (
              <span className="text-[10px] text-moss font-medium flex items-center gap-1">
                <Leaf className="w-2.5 h-2.5" />
                {totalSaved.toFixed(2)}g saved
              </span>
            )}
            <span className="text-[10px] text-oak/25">{messages.filter((m) => m.role === "user").length} prompts</span>
          </div>
        </div>
        <button
          onClick={openBreakdown}
          className="p-2 rounded-lg text-oak/30 hover:text-moss hover:bg-moss/10 transition-colors"
          title="View Carbon Breakdown"
        >
          <FlaskConical className="w-4 h-4" />
        </button>
      </div>

      {/* Messages + animations — main content, grows naturally */}
      <div className="flex-1 space-y-4 py-6 px-2">
        {/* Empty state */}
        {messages.length === 0 && phase.type === "idle" && (
          <motion.div
            className="flex flex-col items-center justify-center py-20 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-moss/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-moss/50" />
            </div>
            <h2 className="text-lg font-header text-oak/60 mb-1">Begin your expedition</h2>
            <p className="text-xs text-oak/30 max-w-xs">
              Ask the Oracle anything. Your prompts will be routed to the cleanest available intelligence.
            </p>
          </motion.div>
        )}

        {/* Rendered messages */}
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id} msg={msg} index={i} />
        ))}

        {/* Optimization animation — shows during optimizing phase */}
        <AnimatePresence>
          {phase.type === "optimizing" && (
            <OptimizationSequence phase={phase.step} region={optRegion} />
          )}
        </AnimatePresence>

        {/* Streaming response */}
        <AnimatePresence>
          {phase.type === "streaming" && phase.content && (
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-8 h-8 rounded-xl bg-moss/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-moss" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-block text-left rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed bg-parchment-dark/60 border border-oak/8 text-oak/80">
                  <div className="whitespace-pre-wrap break-words">
                    {phase.content}
                    <motion.span
                      className="inline-block w-0.5 h-4 bg-moss ml-0.5 align-middle"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    />
                  </div>
                </div>
                {/* Server comparison appears as response streams */}
                {phase.content.length > 50 && (
                  <ServerComparison chosenRegion={optRegion} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Sticky input at bottom */}
      <div className="sticky bottom-0 z-20 pb-4 pt-2 bg-gradient-to-t from-parchment via-parchment to-transparent">
        <SpellBar
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          status={status}
        />
      </div>

      {/* ═══ BREAKDOWN POPUP MODAL ═══ */}
      <AnimatePresence>
        {isBreakdownVisible && (() => {
          const cm = lastCarbonMeta;
          const assistantMsgs = messages.filter((m) => m.role === "assistant" && m.carbon.cost_g > 0);
          const latestA = cm || (assistantMsgs.length > 0 ? assistantMsgs[assistantMsgs.length - 1].carbon : null);
          if (!latestA) return null;

          const reductPct = latestA.baseline_g > 0 ? Math.round(((latestA.baseline_g - latestA.cost_g) / latestA.baseline_g) * 100) : 0;
          const pModel = latestA.model.split("/").pop() || "auto";
          const pRegion = latestA.region || "us-central1";
          const pCfe = latestA.cfe_percent || 85;

          // Build before/after compression text
          const originalPrompt = lastPromptText || "";
          const compRatio = latestA.compression_ratio;
          const wasCompressed = latestA.compressed && compRatio < 1;
          // Simulate compressed version: trim filler words to show the transformation
          const compressedPrompt = wasCompressed ? originalPrompt
            .replace(/\b(please|could you|can you|I would like you to|I want you to|just|really|very|actually|basically|literally|honestly)\b/gi, "")
            .replace(/\s{2,}/g, " ")
            .trim() || originalPrompt : originalPrompt;

          return (
            <>
              {/* Blurred backdrop */}
              <motion.div
                className="fixed inset-0 z-50 bg-oak/20 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeBreakdown}
              />
              {/* Modal */}
              <motion.div
                className="fixed inset-4 sm:inset-x-auto sm:inset-y-6 sm:left-1/2 sm:w-[540px] sm:-translate-x-1/2 z-50 overflow-y-auto rounded-2xl bg-parchment border border-oak/15 shadow-2xl"
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-header text-oak">Carbon Breakdown</h2>
                      <p className="text-[11px] text-oak/40">{chat?.title}</p>
                    </div>
                    <button
                      onClick={closeBreakdown}
                      className="p-2 rounded-xl text-oak/30 hover:text-oak hover:bg-oak/5 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>

                  {/* ═══ ROUTING MAP — real US map zoomed on the two relevant locations ═══ */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <RouteMapViz
                      model={latestA.model}
                      region={pRegion}
                      cfePercent={pCfe}
                    />
                  </motion.div>

                  {/* ═══ SERVER COMPARISON ═══ */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <ServerComparison chosenRegion={pRegion} />
                  </motion.div>

                  {/* ═══ SEMANTIC CACHE STATUS ═══ */}
                  {latestA.cached && (
                    <motion.div
                      className="specimen-card p-3 bg-topaz/5 border-topaz/20"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-topaz" />
                        <div className="flex-1">
                          <h4 className="text-sm font-header text-oak">Semantic Cache Hit</h4>
                          <p className="text-[10px] text-oak/50 mt-0.5">
                            {latestA.cache_hit_tokens || 0} tokens retrieved from cache • Instant response
                          </p>
                        </div>
                        <span className="text-xs font-medium text-topaz bg-topaz/10 px-2 py-1 rounded-md">
                          ⚡ Cached
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ PROMPT COMPRESSION — before/after ═══ */}
                  {originalPrompt && (
                    <motion.div
                      className="specimen-card p-4 space-y-3"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h4 className="text-sm font-header text-oak flex items-center gap-2">
                        <Shrink className="w-4 h-4 text-miami" />
                        Prompt Compression
                        {wasCompressed && (
                          <span className="text-[10px] font-medium text-miami bg-miami/10 px-1.5 py-0.5 rounded-md">
                            {Math.round((1 - compRatio) * 100)}% smaller
                          </span>
                        )}
                      </h4>

                      {/* Before */}
                      <div>
                        <div className="text-[10px] text-witchberry/60 font-medium mb-1 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-witchberry/40" />
                          Original — {latestA.original_tokens || originalPrompt.split(/\s+/).length} tokens
                        </div>
                        <motion.div
                          className="px-3 py-2 rounded-lg bg-witchberry/5 border border-witchberry/10 text-xs text-oak/60 leading-relaxed font-mono"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          {originalPrompt}
                        </motion.div>
                      </div>

                      {/* Arrow */}
                      <motion.div
                        className="flex justify-center"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.55, type: "spring", stiffness: 200 }}
                      >
                        <div className="w-8 h-8 rounded-full bg-moss/10 flex items-center justify-center">
                          <span className="text-moss font-header text-sm">↓</span>
                        </div>
                      </motion.div>

                      {/* After */}
                      <div>
                        <div className="text-[10px] text-moss font-medium mb-1 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-moss" />
                          Compressed — {latestA.compressed_tokens || compressedPrompt.split(/\s+/).length} tokens
                        </div>
                        <motion.div
                          className="px-3 py-2 rounded-lg bg-moss/5 border border-moss/15 text-xs text-oak leading-relaxed font-mono"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.65 }}
                        >
                          {wasCompressed ? compressedPrompt : originalPrompt}
                          {!wasCompressed && (
                            <span className="text-oak/30 italic ml-1">(already optimal)</span>
                          )}
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ CARBON STATS — compact row ═══ */}
                  <motion.div
                    className="grid grid-cols-3 gap-2"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="rounded-xl bg-moss/8 border border-moss/15 p-3 text-center">
                      <Leaf className="w-4 h-4 text-moss mx-auto mb-1" />
                      <div className="text-lg font-header text-moss">{reductPct}%</div>
                      <div className="text-[9px] text-oak/40">Carbon Saved</div>
                      <div className="text-[8px] text-oak/30 mt-0.5">{latestA.saved_g.toFixed(2)}g CO₂</div>
                    </div>
                    <div className="rounded-xl bg-topaz/8 border border-topaz/15 p-3 text-center">
                      <MapPin className="w-4 h-4 text-topaz mx-auto mb-1" />
                      <div className="text-lg font-header text-topaz">{pCfe}%</div>
                      <div className="text-[9px] text-oak/40">Clean Energy</div>
                      <div className="text-[8px] text-oak/30 mt-0.5">{pRegion}</div>
                    </div>
                    <div className="rounded-xl bg-oak/5 border border-oak/10 p-3 text-center">
                      <Bot className="w-4 h-4 text-oak/50 mx-auto mb-1" />
                      <div className="text-sm font-header text-oak/70 truncate">{pModel}</div>
                      <div className="text-[9px] text-oak/40">Model</div>
                      <div className="text-[8px] text-oak/30 mt-0.5">{latestA.latency_ms}ms</div>
                    </div>
                  </motion.div>

                  {/* View full breakdown link */}
                  <motion.div
                    className="text-center pt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <button
                      onClick={() => { closeBreakdown(); router.push(`/breakdown/${chatId}`); }}
                      className="text-[11px] text-moss/60 hover:text-moss transition-colors underline underline-offset-2"
                    >
                      View full breakdown →
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Chat Page (wraps inner in Suspense for useSearchParams) ────────────

export default function LocalChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[80vh]">
          <motion.div
            className="w-10 h-10 rounded-full border-2 border-moss/30 border-t-moss"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
