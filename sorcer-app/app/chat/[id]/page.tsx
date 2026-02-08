"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Bot, UserIcon, Leaf, Zap, Flame, Copy, Check,
  FlaskConical, Search, Shrink, MapPin, Shield, Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import { SpellBar } from "@/components/SpellBar";
import { VoiceMode } from "@/components/VoiceMode";
import { CacheTimeline } from "@/components/CacheTimeline";
import { useEnergy } from "@/context/EnergyContext";

const RouteMapViz = dynamic(() => import("@/components/RouteMapViz").then(m => m.RouteMapViz), { ssr: false, loading: () => <div className="h-40 rounded-xl bg-parchment-dark/30 animate-pulse" /> });
const CacheCelebration = dynamic(() => import("@/components/CacheCelebration").then(m => m.CacheCelebration), { ssr: false });
const GoldenShimmerBorder = dynamic(() => import("@/components/CacheCelebration").then(m => m.GoldenShimmerBorder), { ssr: false, loading: () => <></> });
const CarbonParticleFlow = dynamic(() => import("@/components/CarbonParticleFlow").then(m => m.CarbonParticleFlow), { ssr: false });
import { postOrchestrate, getReceipt } from "@/utils/api";
import {
  getChat, getMessages, addMessage, updateChat, createChat,
  type ChatRecord, type StoredMessage, type CarbonMeta,
} from "@/lib/localChatStore";

// ═══════════════════════════════════════════════════════════════════════════════
// DUMMY RESPONSES (used when backend is offline)
// ═══════════════════════════════════════════════════════════════════════════════

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

The key insight: renewable energy availability varies dramatically by region and time of day. Sorcer monitors these signals in real-time to find the most sustainable energy source for every query.`,

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

4. **Model selection** — Not every query needs the most powerful model. Sorcer analyzes query complexity and finds the most sustainable energy source that can handle it well.

The bottom line: sustainable AI isn't about doing less — it's about being smarter about *how* we compute.`,

  hello: `Hello! 👋 Welcome to Sorcer — the Carbon Routing Engine.

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
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.length < 15) return DUMMY_RESPONSES.hello;
  if (lower.includes("carbon") || lower.includes("energy") || lower.includes("emission") || lower.includes("green") || lower.includes("sustain")) return DUMMY_RESPONSES.carbon;
  if (lower.includes("code") || lower.includes("function") || lower.includes("python") || lower.includes("script") || lower.includes("build") || lower.includes("implement")) return DUMMY_RESPONSES.code;
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
  // Only cache 15% of the time instead of 60%
  const isCached = Math.random() > 0.85;
  return {
    cost_g: Math.round(cost * 100) / 100,
    baseline_g: Math.round(baseline * 100) / 100,
    saved_g: Math.round((baseline - cost) * 100) / 100,
    model, region,
    cfe_percent: cfeMap[region] || 85,
    tokens_in: 10 + Math.floor(Math.random() * 30),
    tokens_out: 200 + Math.floor(Math.random() * 600),
    latency_ms: 600 + Math.floor(Math.random() * 2000),
    cached: isCached,
    cache_hit_tokens: isCached ? Math.floor(Math.random() * 300) : 0,
    compressed: Math.random() > 0.5,
    original_tokens: 20, compressed_tokens: 14,
    compression_ratio: 0.6 + Math.random() * 0.3,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKEND INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

interface BackendResult {
  response: string;
  carbonMeta: CarbonMeta;
  compressedPrompt?: string;
  wasCached?: boolean;
  cacheType?: "hash" | "semantic" | null;
  inputTokens?: number;
  compressedTokens?: number;
}

function mapBackendToCarbonMeta(
  ecoStats: Record<string, unknown>,
  receipt: Record<string, unknown> | null,
  prompt: string, response: string,
  apiWasCached?: boolean,
  apiInputTokens?: number,
  apiCompressedTokens?: number,
): CarbonMeta {
  const baselineCo2 = Number(ecoStats.baseline_co2 ?? receipt?.baseline_co2_est ?? 0.5);
  const actualCo2 = Number(ecoStats.actual_co2 ?? receipt?.actual_co2 ?? 0.1);
  const savedCo2 = Number(ecoStats.co2_saved_grams ?? receipt?.net_savings ?? baselineCo2 - actualCo2);
  const wasCached = apiWasCached ?? Boolean(ecoStats.was_cached ?? receipt?.was_cached ?? false);
  const model = String(receipt?.model_used ?? ecoStats.model ?? "gemini-2.0-flash");
  const region = String(receipt?.server_location ?? "us-central1").split(" ")[0];
  const cfeMap: Record<string, number> = { "us-central1": 89, "us-west1": 92, "europe-west1": 82 };
  const tokensIn = apiInputTokens ?? prompt.split(/\s+/).length;
  const tokensOut = response.split(/\s+/).length;
  const compressedTok = apiCompressedTokens ?? tokensIn;
  const wasCompressed = compressedTok < tokensIn;
  return {
    cost_g: Math.round(actualCo2 * 1000) / 1000,
    baseline_g: Math.round(baselineCo2 * 1000) / 1000,
    saved_g: Math.round(savedCo2 * 1000) / 1000,
    model: model.includes("/") ? model : `google/${model}`,
    region, cfe_percent: cfeMap[region] || 85,
    tokens_in: tokensIn, tokens_out: tokensOut, latency_ms: 0,
    cached: wasCached, cache_hit_tokens: wasCached ? tokensIn : 0,
    compressed: wasCompressed, original_tokens: tokensIn,
    compressed_tokens: compressedTok,
    compression_ratio: tokensIn > 0 ? compressedTok / tokensIn : 1,
  };
}

async function callBackend(prompt: string, chatId: string): Promise<BackendResult | null> {
  try {
    const start = performance.now();
    const result = await postOrchestrate({ prompt, user_id: "sorcer-user", project_id: chatId });
    const latency = Math.round(performance.now() - start);
    if (result.deferred) {
      return {
        response: "⏳ Your prompt has been queued for a greener window. The grid is currently carbon-heavy — Sorcer will process this when renewable energy is more available.",
        carbonMeta: { ...makeDummyCarbonMeta(), cost_g: 0, baseline_g: 0, saved_g: 0, latency_ms: latency, cached: false, compressed: false },
      };
    }
    let receipt: Record<string, unknown> | null = null;
    if (result.receipt_id) {
      try { receipt = await getReceipt(result.receipt_id) as unknown as Record<string, unknown>; } catch { /* optional */ }
    }
    const carbonMeta = mapBackendToCarbonMeta(
      (result.eco_stats ?? {}) as Record<string, unknown>, receipt, prompt, result.response,
      result.was_cached, result.input_tokens, result.compressed_text_tokens,
    );
    carbonMeta.latency_ms = latency;
    return {
      response: result.response,
      carbonMeta,
      compressedPrompt: result.compressed_prompt,
      wasCached: result.was_cached,
      cacheType: result.cache_type,
      inputTokens: result.input_tokens,
      compressedTokens: result.compressed_text_tokens,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL COMPONENTS (preserved from original)
// ═══════════════════════════════════════════════════════════════════════════════

const MODEL_DISPLAY: Record<string, { icon: typeof Leaf; color: string; label: string }> = {
  "google/gemini-2.0-flash": { icon: Leaf, color: "text-moss", label: "Eco Flash" },
  "google/gemini-2.5-flash-lite": { icon: Leaf, color: "text-moss", label: "Eco" },
  "anthropic/claude-haiku-4.5": { icon: Zap, color: "text-topaz", label: "Balanced" },
  "openai/gpt-5.2": { icon: Flame, color: "text-witchberry", label: "Power" },
};

type OptPhase = "cache_check" | "compressing" | "routing" | "map" | "generating" | "done";

const OPT_STEPS: { phase: OptPhase; icon: typeof Search; label: string; detail: string; color: string; bg: string }[] = [
  { phase: "cache_check", icon: Search, label: "Semantic Cache", detail: "Searching for similar prompts...", color: "text-topaz", bg: "bg-topaz/15" },
  { phase: "compressing", icon: Shrink, label: "Prompt Compression", detail: "Removing redundant tokens...", color: "text-miami", bg: "bg-miami/15" },
  { phase: "routing", icon: MapPin, label: "Carbon-Aware Routing", detail: "Finding cleanest server...", color: "text-moss", bg: "bg-moss/15" },
  { phase: "map", icon: Shield, label: "Route Locked", detail: "Transmitting to optimal server...", color: "text-moss", bg: "bg-moss/15" },
  { phase: "generating", icon: Sparkles, label: "Generating", detail: "Model is thinking...", color: "text-oak", bg: "bg-oak/10" },
];

const REGION_COORDS: Record<string, [number, number]> = {
  "us-central1": [240, 140], "us-west1": [80, 120], "us-east4": [370, 150],
  "us-east1": [350, 180], "europe-west1": [240, 140], "auto": [240, 140],
};
const ATLANTA: [number, number] = [330, 170];

function OptimizationSequence({ phase, region, cacheHit = false }: { phase: OptPhase; region?: string; cacheHit?: boolean }) {
  const activeIdx = OPT_STEPS.findIndex((s) => s.phase === phase);
  const dest = REGION_COORDS[region || "us-central1"] || REGION_COORDS["us-central1"];
  return (
    <motion.div className="space-y-2 px-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
      {OPT_STEPS.map((step, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
        const isPending = i > activeIdx;
        const isCacheStep = step.phase === "cache_check";
        const showCelebration = cacheHit && isCacheStep && isDone;
        return (
          <motion.div key={step.phase}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
              showCelebration ? "bg-topaz/15 border border-topaz/25" :
              isActive ? `${step.bg} border border-current/10` : isDone ? "opacity-60" : "opacity-20"
            }`}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: isPending ? 0.2 : 1, x: 0 }} transition={{ delay: i * 0.15, duration: 0.3 }}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              showCelebration ? "bg-topaz/20" :
              isActive ? step.bg : isDone ? "bg-moss/10" : "bg-oak/5"
            }`}>
              {showCelebration ? (
                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                  <Zap className="w-3.5 h-3.5 text-topaz fill-topaz" />
                </motion.div>
              ) : isDone ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}><Check className="w-3.5 h-3.5 text-moss" /></motion.div>
              ) : isActive ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><step.icon className={`w-3.5 h-3.5 ${step.color}`} /></motion.div>
              ) : (<step.icon className="w-3.5 h-3.5 text-oak/30" />)}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] font-medium ${
                showCelebration ? "text-topaz" :
                isActive ? step.color : isDone ? "text-moss" : "text-oak/30"
              }`}>
                {step.label}
                {showCelebration && " — ⚡ INSTANT"}
                {!showCelebration && isDone && step.phase === "cache_check" && " — Hit!"}
                {isDone && step.phase === "compressing" && (cacheHit ? " — skipped" : " — 30% smaller")}
                {isDone && step.phase === "routing" && (cacheHit ? " — skipped" : ` — ${region || "us-central1"}`)}
                {isDone && step.phase === "map" && cacheHit && " — skipped"}
              </div>
              {isActive && !cacheHit && (
                <motion.div className="text-[9px] text-oak/40" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>{step.detail}</motion.div>
              )}
            </div>
            {showCelebration && (
              <motion.span
                className="text-[10px] font-medium text-topaz bg-topaz/10 px-2 py-0.5 rounded-md border border-topaz/20"
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
              >
                ⚡ INSTANT
              </motion.span>
            )}
            {isActive && !cacheHit && (
              <motion.div className={`w-1.5 h-1.5 rounded-full ${step.color.replace("text-", "bg-")}`}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity }} />
            )}
          </motion.div>
        );
      })}
      {(phase === "map" || phase === "generating") && (
        <motion.div className="rounded-xl overflow-hidden border border-moss/15 bg-parchment-dark/30"
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 120 }} transition={{ duration: 0.3 }}>
          <svg viewBox="0 0 440 120" className="w-full h-full">
            <rect x="20" y="10" width="400" height="100" rx="8" fill="rgba(107,55,16,0.02)" stroke="rgba(107,55,16,0.06)" strokeWidth="0.5" />
            <motion.path d={`M${ATLANTA[0]},${ATLANTA[1]} Q${(ATLANTA[0] + dest[0]) / 2},${Math.min(ATLANTA[1], dest[1]) - 50} ${dest[0]},${dest[1]}`}
              fill="none" stroke="#B52121" strokeWidth={1.5} strokeDasharray="6,4" opacity={0.6}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: "easeInOut" }} />
            <motion.circle r={3} fill="#B52121" initial={{ cx: ATLANTA[0], cy: ATLANTA[1] }} animate={{ cx: dest[0], cy: dest[1] }} transition={{ duration: 0.8, ease: "easeInOut" }} />
            <circle cx={ATLANTA[0]} cy={ATLANTA[1]} r={5} fill="rgba(107,55,16,0.15)" />
            <circle cx={ATLANTA[0]} cy={ATLANTA[1]} r={2.5} fill="#6B3710" />
            <text x={ATLANTA[0]} y={ATLANTA[1] - 8} textAnchor="middle" fill="#6B3710" fontSize="7" fontWeight="bold" opacity={0.6}>Atlanta</text>
            <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }}>
              <motion.circle cx={dest[0]} cy={dest[1]} r={8} fill="rgba(75,106,76,0.1)" animate={{ r: [8, 12, 8] }} transition={{ duration: 2, repeat: Infinity }} />
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

const SERVER_DATA = [
  { region: "us-east4", label: "Virginia", kj: 1.8, co2: 380, cfe: 55 },
  { region: "us-central1", label: "Iowa", kj: 0.9, co2: 120, cfe: 89 },
  { region: "us-west1", label: "Oregon", kj: 0.7, co2: 80, cfe: 92 },
  { region: "europe-west1", label: "Belgium", kj: 1.2, co2: 150, cfe: 82 },
];

function ServerComparison({ chosenRegion }: { chosenRegion: string }) {
  const nearest = SERVER_DATA[0];
  const chosen = SERVER_DATA.find((s) => s.region === chosenRegion) || SERVER_DATA[2];
  const ratio = nearest.co2 / Math.max(chosen.co2, 1);
  return (
    <motion.div className="mt-2 px-3 py-2.5 rounded-xl bg-parchment-dark/40 border border-oak/8"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <div className="text-[10px] font-medium text-oak/50 mb-2 flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-topaz" /> Server Comparison
      </div>
      <div className="space-y-1.5">
        {SERVER_DATA.map((s, i) => {
          const isChosen = s.region === chosenRegion;
          const isNearest = i === 0;
          return (
            <motion.div key={s.region}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] ${isChosen ? "bg-moss/10 border border-moss/15" : isNearest ? "bg-witchberry/5 border border-witchberry/10" : ""}`}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}>
              <div className={`w-1.5 h-1.5 rounded-full ${isChosen ? "bg-moss" : isNearest ? "bg-witchberry" : "bg-oak/20"}`} />
              <span className={`flex-1 ${isChosen ? "text-moss font-medium" : isNearest ? "text-witchberry" : "text-oak/50"}`}>
                {s.label}{isChosen && " ✓"}{isNearest && " (nearest)"}
              </span>
              <span className="text-oak/30 tabular-nums">{s.co2}g/kWh</span>
              <div className="w-12 h-1 rounded-full bg-oak/8 overflow-hidden">
                <motion.div className={`h-full rounded-full ${isChosen ? "bg-moss" : isNearest ? "bg-witchberry/50" : "bg-oak/20"}`}
                  initial={{ width: 0 }} animate={{ width: `${(s.co2 / 400) * 100}%` }} transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }} />
              </div>
            </motion.div>
          );
        })}
      </div>
      {ratio > 1 && (
        <motion.div className="mt-2 text-[10px] text-moss font-medium text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          Your nearest server is <span className="text-witchberry">{ratio.toFixed(1)}x worse</span> than the optimal route
        </motion.div>
      )}
    </motion.div>
  );
}

function MessageBubble({ msg, index, compressionInfo }: { msg: StoredMessage; index: number; compressionInfo?: { original: string; compressed: string; inputTokens: number; compressedTokens: number } }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const modelInfo = MODEL_DISPLAY[msg.carbon.model] || { icon: Bot, color: "text-oak", label: msg.carbon.model.split("/").pop() };
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [msg.content]);

  const showCompression = isUser && compressionInfo && compressionInfo.compressedTokens < compressionInfo.inputTokens;
  const reductionPctPrompt = showCompression ? Math.round((1 - compressionInfo!.compressedTokens / compressionInfo!.inputTokens) * 100) : 0;

  return (
    <motion.div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), type: "spring", stiffness: 150, damping: 22 }}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 ${isUser ? "bg-oak/8" : "bg-moss/10"}`}>
        {isUser ? <UserIcon className="w-4 h-4 text-oak/50" /> : <Bot className="w-4 h-4 text-moss" />}
      </div>
      <div className={`flex-1 min-w-0 max-w-[85%] ${isUser ? "text-right" : ""}`}>
        <motion.div
          className={`inline-block text-left rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-oak/8 text-oak rounded-tr-md" : "bg-parchment-dark/60 border border-oak/8 text-oak/80 rounded-tl-md"}`}
          initial={!isUser ? { filter: "blur(2px)", opacity: 0.3 } : undefined}
          animate={!isUser ? { filter: "blur(0px)", opacity: 1 } : undefined}
          transition={!isUser ? { duration: 0.5, delay: Math.min(index * 0.05, 0.3) + 0.15 } : undefined}
        >
          {showCompression ? (
            <div className="space-y-1.5">
              <div className="whitespace-pre-wrap break-words prose-sm line-through text-oak/30 decoration-oak/20">{msg.content}</div>
              <div className="whitespace-pre-wrap break-words prose-sm text-oak">{compressionInfo!.compressed}</div>
              <div className="flex items-center gap-1.5 pt-1">
                <Shrink className="w-3 h-3 text-miami" />
                <span className="text-[10px] text-miami font-medium">Compressed {compressionInfo!.inputTokens} → {compressionInfo!.compressedTokens} tokens ({reductionPctPrompt}% reduction)</span>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words prose-sm">{msg.content}</div>
          )}
        </motion.div>
        {!isUser && (msg.carbon.cost_g > 0 || msg.carbon.cached || msg.carbon.compressed) && (() => {
          const isCachedZero = msg.carbon.cached && msg.carbon.cost_g === 0;
          const reductionPct = isCachedZero ? 100 : (msg.carbon.baseline_g > 0 ? Math.round(((msg.carbon.baseline_g - msg.carbon.cost_g) / msg.carbon.baseline_g) * 100) : 0);
          
          if (isCachedZero) {
            return (
              <motion.div className="mt-3 rounded-xl border border-topaz/25 bg-gradient-to-br from-topaz/8 to-moss/5 overflow-hidden"
                initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 120 }}>
                <div className="px-4 py-4 flex items-center gap-4">
                  <motion.div className="w-12 h-12 rounded-xl bg-topaz/15 flex items-center justify-center shrink-0 relative"
                    initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.5, type: "spring", stiffness: 200 }}>
                    <Zap className="w-6 h-6 text-topaz fill-topaz/30" />
                    <motion.div className="absolute inset-0 rounded-xl border-2 border-topaz/30"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />
                  </motion.div>
                  <div className="flex-1">
                    <motion.div className="flex items-baseline gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                      <span className="text-lg font-header text-topaz">Zero Emissions</span>
                      <span className="text-[10px] text-topaz/60 font-medium">100% cached</span>
                    </motion.div>
                    <p className="text-[10px] text-oak/50 mt-0.5">This response was served entirely from the semantic cache — no LLM compute, no energy, no carbon.</p>
                  </div>
                  <button onClick={handleCopy} className="p-1.5 rounded-lg text-oak/20 hover:text-oak/50 hover:bg-oak/5 transition-colors" title="Copy response">
                    {copied ? <Check className="w-3.5 h-3.5 text-moss" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  <motion.span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-topaz bg-topaz/10 border border-topaz/20"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: "spring" }}>
                    <Zap className="w-3 h-3" /> Instant Processing
                  </motion.span>
                  <motion.span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-moss bg-moss/10 border border-moss/15"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: "spring" }}>
                    <Leaf className="w-3 h-3" /> 0.000g CO₂
                  </motion.span>
                </div>
              </motion.div>
            );
          }
          
          return (
            <motion.div className="mt-3 rounded-xl border border-moss/15 bg-gradient-to-br from-moss/5 to-parchment-dark/30 overflow-hidden"
              initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 120 }}>
              <div className="px-3 py-2.5 flex items-center gap-3">
                <motion.div className="w-10 h-10 rounded-xl bg-moss/15 flex items-center justify-center shrink-0 relative"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 200 }}>
                  <Leaf className="w-5 h-5 text-moss" />
                  <motion.div className="absolute inset-0 rounded-xl border-2 border-moss/20"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <motion.span className="text-xl font-header text-moss" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>{reductionPct}%</motion.span>
                    <span className="text-[10px] text-moss/60">less carbon than a regular prompt</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-oak/40">Saved {msg.carbon.saved_g.toFixed(2)}g CO₂</span>
                    <span className="text-[10px] text-oak/20">·</span>
                    <span className={`inline-flex items-center gap-0.5 text-[10px] ${modelInfo.color}`}><modelInfo.icon className="w-2.5 h-2.5" />{modelInfo.label}</span>
                    <span className="text-[10px] text-oak/20">·</span>
                    <span className="text-[10px] text-oak/30">{msg.carbon.region}</span>
                  </div>
                </div>
                <button onClick={handleCopy} className="p-1.5 rounded-lg text-oak/20 hover:text-oak/50 hover:bg-oak/5 transition-colors" title="Copy response">
                  {copied ? <Check className="w-3.5 h-3.5 text-moss" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="px-3 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] text-witchberry/60">Regular</span>
                  <div className="flex-1 h-2 rounded-full bg-witchberry/10 overflow-hidden"><div className="h-full rounded-full bg-witchberry/25 w-full" /></div>
                  <span className="text-[9px] text-oak/30 tabular-nums w-12 text-right">{msg.carbon.baseline_g.toFixed(3)}g</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-moss font-medium">Sorcer</span>
                  <div className="flex-1 h-2 rounded-full bg-oak/5 overflow-hidden">
                    <motion.div className="h-full rounded-full bg-moss/50" initial={{ width: "100%" }}
                      animate={{ width: `${msg.carbon.baseline_g > 0 ? (msg.carbon.cost_g / msg.carbon.baseline_g) * 100 : 100}%` }}
                      transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }} />
                  </div>
                  <span className="text-[9px] text-moss font-medium tabular-nums w-12 text-right">{msg.carbon.cost_g.toFixed(3)}g</span>
                </div>
              </div>
              <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                {msg.carbon.cached && (
                  <motion.span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium text-topaz bg-topaz/10 border border-topaz/15"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: "spring" }}>
                    <Zap className="w-2.5 h-2.5" /> Cache Hit · {msg.carbon.cache_hit_tokens} tokens
                  </motion.span>
                )}
                {msg.carbon.compressed && msg.carbon.original_tokens > 0 && (
                  <motion.span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium text-miami bg-miami/10 border border-miami/15"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.1, type: "spring" }}>
                    <Shrink className="w-2.5 h-2.5" /> Compressed {Math.round((1 - msg.carbon.compression_ratio) * 100)}%
                  </motion.span>
                )}
                <motion.span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium text-moss bg-moss/10 border border-moss/15"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: "spring" }}>
                  <MapPin className="w-2.5 h-2.5" /> {msg.carbon.cfe_percent}% Clean Energy
                </motion.span>
              </div>
            </motion.div>
          );
        })()}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: cancellable delay
// ═══════════════════════════════════════════════════════════════════════════════

function delay(ms: number, signal: { cancelled: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(!signal.cancelled), ms);
    // Check immediately in case already cancelled
    if (signal.cancelled) { clearTimeout(t); resolve(false); }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CHAT COMPONENT — simple imperative async, no effect chains
// ═══════════════════════════════════════════════════════════════════════════════

function ChatPageInner() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  const { selectedModelId } = useEnergy();
  
  // ── Core state ──
  const [chat, setChat] = useState<ChatRecord | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);

  // ── UI state for the active prompt flow ──
  const [optPhase, setOptPhase] = useState<OptPhase | null>(null);
  const [optRegion, setOptRegion] = useState("us-central1");
  const [streamingContent, setStreamingContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [lastPromptText, setLastPromptText] = useState("");
  const [cacheHit, setCacheHit] = useState(false);
  const [lastWasCached, setLastWasCached] = useState(false);
  const [lastCarbonMeta, setLastCarbonMeta] = useState<CarbonMeta | null>(null);

  const [particleTrigger, setParticleTrigger] = useState(false);
  const [lastSavedAmount, setLastSavedAmount] = useState(0);
  const [compressedPromptMap, setCompressedPromptMap] = useState<Record<string, { original: string; compressed: string; inputTokens: number; compressedTokens: number }>>({}); 

  // ── Voice mode state ──
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lastAssistantResponse, setLastAssistantResponse] = useState<string | undefined>();

  // ── Refs for cancellation and preventing double-sends ──
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const autoSentRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Derive SpellBar status
  const status: "ready" | "submitted" | "streaming" | "error" = isProcessing
    ? (streamingContent ? "streaming" : "submitted")
    : "ready";

  // ── Load chat + messages ──
  useEffect(() => {
    let c = getChat(chatId);
    if (!c) {
      c = {
        id: chatId, title: "New Conversation", createdAt: new Date().toISOString(),
        carbonSaved: 0, promptCount: 0, model: selectedModelId || "auto", region: "auto",
      };
      createChat(c);
    }
    setChat(c);
    setMessages(getMessages(chatId));
    setLoaded(true);
  }, [chatId, selectedModelId]);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, optPhase, streamingContent]);

  // ══════════════════════════════════════════════════════════════════════════
  // THE CORE: single async function that runs the entire prompt flow.
  // Uses a cancellation signal so Strict Mode unmount kills it cleanly.
  // No useEffect chains. No interdependent state. Just sequential logic.
  // ══════════════════════════════════════════════════════════════════════════

  const runPromptFlow = useCallback(async (prompt: string, isFirstMessage: boolean, skipUserMessage = false) => {
    console.log('[FLOW] runPromptFlow called — prompt:', prompt.slice(0, 50), 'isFirst:', isFirstMessage, 'skipUser:', skipUserMessage);
    // Cancel any previous flow
    cancelRef.current.cancelled = true;
    const signal = { cancelled: false };
    cancelRef.current = signal;

    setIsProcessing(true);
    setStreamingContent("");
    setOptPhase(null);
    setShowBreakdown(false);
    setLastPromptText(prompt);
    setCacheHit(false);
    setLastWasCached(false);

    // 1. Save user message (skip if already saved by homepage)
    if (!skipUserMessage) {
      const userMsg: StoredMessage = {
        id: crypto.randomUUID(), chatId, role: "user", content: prompt,
        createdAt: new Date().toISOString(),
        carbon: {
          cost_g: 0, baseline_g: 0, saved_g: 0, model: "", region: "", cfe_percent: 0,
          tokens_in: prompt.split(/\s+/).length, tokens_out: 0, latency_ms: 0,
          cached: false, cache_hit_tokens: 0, compressed: false,
          original_tokens: 0, compressed_tokens: 0, compression_ratio: 1,
        },
      };
      addMessage(userMsg);
      setMessages(prev => [...prev, userMsg]);
    }

    // Update chat title
    const currentChat = getChat(chatId);
    if (currentChat && (isFirstMessage || currentChat.title === "New Conversation")) {
      const title = prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt;
      updateChat(chatId, { title, promptCount: (currentChat.promptCount || 0) + 1 });
      setChat(prev => prev ? { ...prev, title, promptCount: (prev.promptCount || 0) + 1 } : prev);
    } else if (currentChat) {
      updateChat(chatId, { promptCount: (currentChat.promptCount || 0) + 1 });
      setChat(prev => prev ? { ...prev, promptCount: (prev.promptCount || 0) + 1 } : prev);
    }

    if (signal.cancelled) return;

    // 2. Fire backend call immediately (runs in parallel with animation)
    const backendPromise = callBackend(prompt, chatId);

    // Detect if this prompt is similar to a previous one (simulated cache hit)
    const existingUserMsgs = messages.filter(m => m.role === "user").map(m => m.content.toLowerCase());
    const promptLower = prompt.toLowerCase();
    const promptWords = new Set(promptLower.split(/\s+/).filter(w => w.length > 3));
    const isCacheHit = existingUserMsgs.some(prev => {
      const prevWords = new Set(prev.split(/\s+/).filter((w: string) => w.length > 3));
      const overlap = [...promptWords].filter(w => prevWords.has(w)).length;
      const union = new Set([...promptWords, ...prevWords]).size;
      return union > 0 && overlap / union > 0.4;
    });

    // 3. Optimization animation sequence
    if (isCacheHit) {
      setCacheHit(true);
      setLastWasCached(true);
      // Cache check phase — normal speed
      setOptPhase("cache_check");
      const ok1 = await delay(400, signal);
      if (!ok1) return;
      // Fast-forward remaining phases (100ms each)
      for (const phase of ["compressing", "routing", "map", "generating"] as OptPhase[]) {
        if (signal.cancelled) return;
        setOptPhase(phase);
        if (phase !== "generating") {
          const ok = await delay(100, signal);
          if (!ok) return;
        }
      }
    } else {
      const phases: { phase: OptPhase; ms: number }[] = [
        { phase: "cache_check", ms: 400 },
        { phase: "compressing", ms: 350 },
        { phase: "routing", ms: 350 },
        { phase: "map", ms: 500 },
        { phase: "generating", ms: 0 },
      ];
      for (const { phase, ms } of phases) {
        if (signal.cancelled) return;
        setOptPhase(phase);
        if (ms > 0) {
          const ok = await delay(ms, signal);
          if (!ok) return;
        }
      }
    }

    // 4. Wait for backend result
    const backendResult = await backendPromise;
    console.log('[FLOW] backend result:', backendResult ? 'got response' : 'null (offline)', 'cancelled:', signal.cancelled);
    if (signal.cancelled) return;

    let fullResponse: string;
    let carbonMeta: CarbonMeta;
    if (backendResult) {
      fullResponse = backendResult.response;
      carbonMeta = backendResult.carbonMeta;
      // Store compressed prompt info if compression happened
      if (backendResult.compressedPrompt && backendResult.inputTokens && backendResult.compressedTokens && backendResult.compressedTokens < backendResult.inputTokens) {
        setCompressedPromptMap(prev => ({ ...prev, [prompt]: { original: prompt, compressed: backendResult.compressedPrompt!, inputTokens: backendResult.inputTokens!, compressedTokens: backendResult.compressedTokens! } }));
      }
      // Use backend's was_cached for accurate cache detection
      if (backendResult.wasCached) {
        setCacheHit(true);
        setLastWasCached(true);
      }
    } else {
      fullResponse = pickDummyResponse(prompt);
      carbonMeta = makeDummyCarbonMeta();
    }
    setOptRegion(carbonMeta.region);

    // 5. Clear optimization, start streaming
    console.log('[FLOW] clearing opt phase, starting stream. fullResponse length:', fullResponse.length);
    setOptPhase(null);
    if (signal.cancelled) return;

    // Small pause for visual transition
    const ok = await delay(200, signal);
    if (!ok) return;

    // 6. Stream character by character
    const chars = fullResponse.split("");
    let accumulated = "";
    for (let i = 0; i < chars.length; i++) {
      if (signal.cancelled) return;
      accumulated += chars[i];
      setStreamingContent(accumulated);
      const char = chars[i];
      const charDelay = char === " " ? 6 : char === "\n" ? 20 : 8 + Math.random() * 6;
      const charOk = await delay(charDelay, signal);
      if (!charOk) return;
    }

    if (signal.cancelled) return;

    console.log('[FLOW] streaming complete, saving assistant message');
    // 7. Save assistant message
    const assistantMsg: StoredMessage = {
      id: crypto.randomUUID(), chatId, role: "assistant", content: fullResponse,
      createdAt: new Date().toISOString(), carbon: carbonMeta,
    };
    addMessage(assistantMsg);
    setMessages(prev => [...prev, assistantMsg]);

    // 8. Update chat stats
    const newSaved = (getChat(chatId)?.carbonSaved || 0) + carbonMeta.saved_g;
    updateChat(chatId, { carbonSaved: newSaved, model: carbonMeta.model, region: carbonMeta.region });
    setChat(prev => prev ? { ...prev, carbonSaved: newSaved, model: carbonMeta.model, region: carbonMeta.region } : prev);

    // 9. Done — trigger particles + show breakdown + voice
    setLastCarbonMeta(carbonMeta);
    setStreamingContent("");
    setIsProcessing(false);
    setLastAssistantResponse(fullResponse);
    if (carbonMeta.saved_g > 0) {
      setLastSavedAmount(carbonMeta.saved_g);
      setParticleTrigger(true);
      setTimeout(() => setParticleTrigger(false), 2000);
    }
    setShowBreakdown(true);
  }, [chatId]);

  // Keep latest runPromptFlow in a ref so the auto-send effect always calls the current version
  const runPromptFlowRef = useRef(runPromptFlow);
  runPromptFlowRef.current = runPromptFlow;

  // ── Auto-send: detect user message with no assistant response ──
  useEffect(() => {
    if (!loaded) return;
    if (autoSentRef.current) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user') return;

    const hasAssistantResponse = messages.some((m, i) => i > messages.indexOf(lastMsg) && m.role === 'assistant');
    if (hasAssistantResponse) return;

    autoSentRef.current = true;
    runPromptFlowRef.current(lastMsg.content, true, true);
  }, [loaded, chatId, messages]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => { cancelRef.current.cancelled = true; };
  }, []);

  // ── Handle SpellBar submit ──
  const handleSubmit = useCallback(() => {
    const prompt = input.trim();
    if (!prompt || isProcessing) return;
    setInput("");
    const isFirst = chat?.title === "New Conversation";
    runPromptFlow(prompt, isFirst ?? false);
  }, [input, isProcessing, chat, runPromptFlow]);

  // ── Handle voice transcript (from VoiceMode STT) ──
  const handleVoiceTranscript = useCallback((text: string) => {
    if (!text.trim() || isProcessing) return;
    const isFirst = chat?.title === "New Conversation";
    runPromptFlow(text.trim(), isFirst ?? false);
  }, [isProcessing, chat, runPromptFlow]);

  // ── Computed values ──
  const totalSaved = useMemo(() =>
    messages.filter(m => m.role === "assistant").reduce((sum, m) => sum + m.carbon.saved_g, 0),
  [messages]);

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <motion.div className="w-10 h-10 rounded-full border-2 border-moss/30 border-t-moss"
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-2 py-3 shrink-0">
        <button onClick={() => router.push("/")} className="p-1.5 rounded-lg text-oak/40 hover:text-oak hover:bg-oak/5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-medium text-oak truncate">{chat?.title || "Chat"}</h1>
          <div className="flex items-center gap-2">
            {totalSaved > 0 && (
              <span className="text-[10px] text-moss font-medium flex items-center gap-1">
                <Leaf className="w-2.5 h-2.5" />{totalSaved.toFixed(2)}g saved
              </span>
            )}
            <span className="text-[10px] text-oak/25">{messages.filter(m => m.role === "user").length} prompts</span>
          </div>
        </div>
        <button onClick={() => setShowBreakdown(true)} className="p-2 rounded-lg text-oak/30 hover:text-moss hover:bg-moss/10 transition-colors" title="View Carbon Breakdown">
          <FlaskConical className="w-4 h-4" />
        </button>
      </div>

      {/* Cache Timeline */}
      {messages.length > 1 && <CacheTimeline messages={messages} />}

      {/* Carbon Particle Flow */}
      <CarbonParticleFlow trigger={particleTrigger} sourceRef={lastMessageRef} savedAmount={lastSavedAmount} />

      {/* Messages + animations */}
      <div className="flex-1 space-y-4 py-6 px-2">
        
        {messages.length === 0 && !isProcessing && (
          <motion.div className="flex flex-col items-center justify-center py-20 text-center"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-16 h-16 rounded-2xl bg-moss/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-moss/50" />
            </div>
            <h2 className="text-lg font-header text-oak/60 mb-1">Begin your expedition</h2>
            <p className="text-xs text-oak/30 max-w-xs">Ask Sorcer anything. Your prompts will be routed to the most sustainable energy source available.</p>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id} ref={i === messages.length - 1 ? lastMessageRef : undefined}>
            <MessageBubble msg={msg} index={i} compressionInfo={msg.role === "user" ? compressedPromptMap[msg.content] : undefined} />
          </div>
        ))}

        {/* Optimization animation */}
        <AnimatePresence>
          {optPhase && (
            <OptimizationSequence phase={optPhase} region={optRegion} cacheHit={cacheHit} />
          )}
        </AnimatePresence>

        {/* Cache hit celebration */}
        <AnimatePresence>
          {cacheHit && optPhase === "compressing" && (
            <motion.div className="flex justify-center py-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CacheCelebration active={true} savedSeconds={3.2} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streaming response */}
        <AnimatePresence>
          {streamingContent && !optPhase && (
            <motion.div className="flex gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="w-8 h-8 rounded-xl bg-moss/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-moss" />
              </div>
              <div className="flex-1 min-w-0">
                {lastWasCached ? (
                  <GoldenShimmerBorder>
                    <div className="inline-block text-left rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed bg-parchment-dark/60 border border-topaz/20 text-oak/80">
                      <div className="whitespace-pre-wrap break-words">
                        {streamingContent}
                        <motion.span className="inline-block ml-0.5 align-middle" style={{ width: 12, height: 16 }}
                          animate={{ rotate: [0, -8, 0, 5, 0], y: [0, -1, 0, 1, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}>
                          <svg viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 0L8 6L6 14L5 16L4 14L2 6L6 0Z" fill="#DDA059" opacity="0.8" />
                            <path d="M6 0L6.5 3L6 14L5.5 3L6 0Z" fill="#6B3710" opacity="0.3" />
                          </svg>
                        </motion.span>
                      </div>
                    </div>
                  </GoldenShimmerBorder>
                ) : (
                  <div className="inline-block text-left rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed bg-parchment-dark/60 border border-oak/8 text-oak/80">
                    <div className="whitespace-pre-wrap break-words">
                      {streamingContent}
                      <motion.span className="inline-block ml-0.5 align-middle" style={{ width: 12, height: 16 }}
                        animate={{ rotate: [0, -8, 0, 5, 0], y: [0, -1, 0, 1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}>
                        <svg viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 0L8 6L6 14L5 16L4 14L2 6L6 0Z" fill="#4B6A4C" opacity="0.8" />
                          <path d="M6 0L6.5 3L6 14L5.5 3L6 0Z" fill="#6B3710" opacity="0.3" />
                        </svg>
                      </motion.span>
                    </div>
                  </div>
                )}
                {streamingContent.length > 50 && messages.filter(m => m.role === "assistant").length === 0 && <ServerComparison chosenRegion={optRegion} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Sticky input */}
      <div className="sticky bottom-0 z-20 pb-4 pt-2 bg-gradient-to-t from-parchment via-parchment to-transparent">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <SpellBar input={input} setInput={setInput} onSubmit={handleSubmit} status={status} />
          </div>
          <div className="pb-1">
            <VoiceMode
              onTranscript={handleVoiceTranscript}
              lastResponse={lastAssistantResponse}
              voiceEnabled={voiceEnabled}
              onToggleVoice={() => setVoiceEnabled(v => !v)}
            />
          </div>
        </div>
      </div>

      {/* Breakdown popup */}
      <AnimatePresence>
        {showBreakdown && (() => {
          const cm = lastCarbonMeta;
          const assistantMsgs = messages.filter(m => m.role === "assistant" && m.carbon.cost_g > 0);
          const latestA = cm || (assistantMsgs.length > 0 ? assistantMsgs[assistantMsgs.length - 1].carbon : null);
          if (!latestA) return null;

          const reductPct = latestA.baseline_g > 0 ? Math.round(((latestA.baseline_g - latestA.cost_g) / latestA.baseline_g) * 100) : 0;
          const pModel = latestA.model.split("/").pop() || "auto";
          const pRegion = latestA.region || "us-central1";
          const pCfe = latestA.cfe_percent || 85;
          const originalPrompt = lastPromptText || "";
          const compRatio = latestA.compression_ratio;
          const wasCompressed = latestA.compressed && compRatio < 1;
          // Use actual compressed text from backend if available
          const backendCompressed = compressedPromptMap[originalPrompt]?.compressed;
          const compressedPrompt = wasCompressed
            ? (backendCompressed || originalPrompt)
            : originalPrompt;

          return (
            <>
              <motion.div className="fixed inset-0 z-50 bg-oak/20 backdrop-blur-md"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowBreakdown(false)} />
              <motion.div
                className="fixed inset-4 sm:inset-x-auto sm:inset-y-6 sm:left-1/2 sm:w-[540px] sm:-translate-x-1/2 z-50 overflow-y-auto rounded-2xl bg-parchment border border-oak/15 shadow-2xl"
                initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", stiffness: 200, damping: 25 }}
                onClick={e => e.stopPropagation()}>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-header text-oak">Carbon Breakdown</h2>
                      <p className="text-[11px] text-oak/40">{chat?.title}</p>
                    </div>
                    <button onClick={() => setShowBreakdown(false)} className="p-2 rounded-xl text-oak/30 hover:text-oak hover:bg-oak/5 transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>

                  {!latestA.cached && (
                    <>
                      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <RouteMapViz model={latestA.model} region={pRegion} cfePercent={pCfe} />
                      </motion.div>

                      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <ServerComparison chosenRegion={pRegion} />
                      </motion.div>
                    </>
                  )}

                  {latestA.cached && (
                    <motion.div className="specimen-card p-3 bg-topaz/5 border-topaz/20"
                      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-topaz" />
                        <div className="flex-1">
                          <h4 className="text-sm font-header text-oak">Semantic Cache Hit</h4>
                          <p className="text-[10px] text-oak/50 mt-0.5">{latestA.cache_hit_tokens || 0} tokens retrieved from cache • Instant response</p>
                        </div>
                        <span className="text-xs font-medium text-topaz bg-topaz/10 px-2 py-1 rounded-md">⚡ Cached</span>
                      </div>
                    </motion.div>
                  )}

                  {originalPrompt && (
                    <motion.div className="specimen-card p-4 space-y-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <h4 className="text-sm font-header text-oak flex items-center gap-2">
                        <Shrink className="w-4 h-4 text-miami" /> Prompt Compression
                        {wasCompressed && <span className="text-[10px] font-medium text-miami bg-miami/10 px-1.5 py-0.5 rounded-md">{Math.round((1 - compRatio) * 100)}% smaller</span>}
                      </h4>
                      <div>
                        <div className="text-[10px] text-witchberry/60 font-medium mb-1 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-witchberry/40" /> Original — {latestA.original_tokens || originalPrompt.split(/\s+/).length} tokens
                        </div>
                        <motion.div className="px-3 py-2 rounded-lg bg-witchberry/5 border border-witchberry/10 text-xs text-oak/60 leading-relaxed font-mono"
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>{originalPrompt}</motion.div>
                      </div>
                      <motion.div className="flex justify-center" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.55, type: "spring", stiffness: 200 }}>
                        <div className="w-8 h-8 rounded-full bg-moss/10 flex items-center justify-center"><span className="text-moss font-header text-sm">↓</span></div>
                      </motion.div>
                      <div>
                        <div className="text-[10px] text-moss font-medium mb-1 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-moss" /> Compressed — {latestA.compressed_tokens || compressedPrompt.split(/\s+/).length} tokens
                        </div>
                        <motion.div className="px-3 py-2 rounded-lg bg-moss/5 border border-moss/15 text-xs text-oak leading-relaxed font-mono"
                          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 }}>
                          {wasCompressed ? compressedPrompt : originalPrompt}
                          {!wasCompressed && <span className="text-oak/30 italic ml-1">(already optimal)</span>}
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  <motion.div className="grid grid-cols-3 gap-2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
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

                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT — wraps in Suspense for useSearchParams
// ═══════════════════════════════════════════════════════════════════════════════

export default function LocalChatPage() {
  return <ChatPageInner />;
}
