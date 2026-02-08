"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bot, UserIcon, Leaf, Zap, Flame, Copy, Check, FlaskConical } from "lucide-react";
import { SpellBar } from "@/components/SpellBar";
import { useEnergy } from "@/context/EnergyContext";
import { postOrchestrate, getHealth, getReceipt, type OrchestrateResponse } from "@/utils/api";
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

// ─── Spell-casting loader ───────────────────────────────────────────────────

function SpellLoader({ phase }: { phase: "thinking" | "streaming" }) {
  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
    >
      {/* Animated orb */}
      <div className="relative w-8 h-8 shrink-0">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: phase === "thinking"
              ? "radial-gradient(circle, rgba(221,160,89,0.3), rgba(221,160,89,0.05))"
              : "radial-gradient(circle, rgba(75,106,76,0.3), rgba(75,106,76,0.05))",
          }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-1.5 rounded-full border-2"
          style={{
            borderColor: phase === "thinking" ? "rgba(221,160,89,0.4)" : "rgba(75,106,76,0.4)",
            borderTopColor: "transparent",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2.5 rounded-full"
          style={{
            background: phase === "thinking"
              ? "radial-gradient(circle, #DDA059, #A08060)"
              : "radial-gradient(circle, #5E8260, #4B6A4C)",
          }}
          animate={{
            scale: [0.8, 1.1, 0.8],
            boxShadow: phase === "thinking"
              ? ["0 0 6px rgba(221,160,89,0.4)", "0 0 14px rgba(221,160,89,0.6)", "0 0 6px rgba(221,160,89,0.4)"]
              : ["0 0 6px rgba(75,106,76,0.4)", "0 0 14px rgba(75,106,76,0.6)", "0 0 6px rgba(75,106,76,0.4)"],
          }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </div>

      <div>
        <motion.span
          className="text-xs font-medium text-oak/60 block"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {phase === "thinking" ? "Consulting the Oracle..." : "Channeling response..."}
        </motion.span>
        <div className="flex gap-1 mt-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: phase === "thinking" ? "#DDA059" : "#4B6A4C" }}
              animate={{ scale: [0.5, 1.3, 0.5], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
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

        {/* Meta row for assistant messages */}
        {!isUser && msg.carbon.cost_g > 0 && !isStreaming && (
          <motion.div
            className="flex items-center gap-2 mt-1.5 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Model badge */}
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] ${modelInfo.color} bg-current/5`}>
              <modelInfo.icon className="w-2.5 h-2.5" />
              {modelInfo.label}
            </span>
            {/* Carbon saved */}
            <span className="text-[10px] text-moss font-medium">
              −{msg.carbon.saved_g.toFixed(2)}g CO₂
            </span>
            {/* Region */}
            <span className="text-[10px] text-oak/30">
              {msg.carbon.region} · {msg.carbon.cfe_percent}% CFE
            </span>
            {/* Cache badge */}
            {msg.carbon.cached && (
              <span className="text-[10px] text-topaz/70">⚡ cached</span>
            )}
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="ml-auto p-1 rounded text-oak/20 hover:text-oak/50 transition-colors"
              title="Copy response"
            >
              {copied ? <Check className="w-3 h-3 text-moss" /> : <Copy className="w-3 h-3" />}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Chat Page ─────────────────────────────────────────────────────────

export default function LocalChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = params.id as string;
  const { mode, selectedModelId } = useEnergy();
  const [hasAutoSent, setHasAutoSent] = useState(false);

  const [chat, setChat] = useState<ChatRecord | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming" | "error">("ready");
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load chat + messages from localStorage
  useEffect(() => {
    let c = getChat(chatId);
    if (!c) {
      // Auto-create if navigated here with a new ID (e.g. from homepage submit)
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
    setMessages(getMessages(chatId));
    setLoaded(true);
  }, [chatId, selectedModelId]);

  // ─── Shared send logic: tries backend, falls back to dummy ──────────────
  const sendPrompt = useCallback(async (prompt: string, isFirstMessage: boolean) => {
    setStatus("submitted");

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
    setMessages((prev) => [...prev, userMsg]);

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

    // Try real backend first
    const backendResult = await callBackend(prompt, chatId);

    let fullResponse: string;
    let carbonMeta: CarbonMeta;

    if (backendResult) {
      // Backend responded — use real data
      fullResponse = backendResult.response;
      carbonMeta = backendResult.carbonMeta;
    } else {
      // Backend offline — fall back to dummy with simulated delay
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
      fullResponse = pickDummyResponse(prompt);
      carbonMeta = makeDummyCarbonMeta();
    }

    // Stream the response character by character
    setStatus("streaming");
    const assistantMsgId = crypto.randomUUID();
    setStreamingMsgId(assistantMsgId);
    setStreamingContent("");

    let accumulated = "";
    const chars = fullResponse.split("");
    for (let i = 0; i < chars.length; i++) {
      accumulated += chars[i];
      setStreamingContent(accumulated);
      const char = chars[i];
      const delay = char === " " ? 8 : char === "\n" ? 25 : 12 + Math.random() * 8;
      await new Promise((r) => setTimeout(r, delay));
    }

    // Save assistant message
    const assistantMsg: StoredMessage = {
      id: assistantMsgId,
      chatId,
      role: "assistant",
      content: fullResponse,
      createdAt: new Date().toISOString(),
      carbon: carbonMeta,
    };
    addMessage(assistantMsg);
    setMessages((prev) => [...prev, assistantMsg]);

    // Update chat carbon stats
    const newSaved = (getChat(chatId)?.carbonSaved || 0) + carbonMeta.saved_g;
    updateChat(chatId, { carbonSaved: newSaved, model: carbonMeta.model, region: carbonMeta.region });
    setChat((prev) => prev ? { ...prev, carbonSaved: newSaved, model: carbonMeta.model, region: carbonMeta.region } : prev);

    // Reset
    setStreamingMsgId(null);
    setStreamingContent("");
    setStatus("ready");
  }, [chatId]);

  // Auto-send from ?query= param (homepage submit)
  useEffect(() => {
    if (!loaded || hasAutoSent) return;
    const query = searchParams.get("query");
    if (query) {
      setHasAutoSent(true);
      setInput("");
      window.history.replaceState({}, "", `/chat/${chatId}`);
      setTimeout(() => { sendPrompt(query, true); }, 100);
    }
  }, [loaded, hasAutoSent, searchParams, chatId, sendPrompt]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Handle sending a message
  const handleSubmit = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || status !== "ready") return;
    setInput("");
    const isFirst = chat?.title === "New Conversation";
    await sendPrompt(prompt, isFirst ?? false);
  }, [input, status, chat, sendPrompt]);

  // Compute total carbon saved
  const totalSaved = useMemo(() => {
    return messages
      .filter((m) => m.role === "assistant")
      .reduce((sum, m) => sum + m.carbon.saved_g, 0);
  }, [messages]);

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
    <div className="flex flex-col h-[calc(100vh-3rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-oak/8 shrink-0">
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
          onClick={() => router.push(`/breakdown/${chatId}`)}
          className="p-2 rounded-lg text-oak/30 hover:text-moss hover:bg-moss/10 transition-colors"
          title="View Carbon Breakdown"
        >
          <FlaskConical className="w-4 h-4" />
        </button>
      </div>

      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {/* Empty state */}
        {messages.length === 0 && status === "ready" && (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center"
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

        {/* Streaming message */}
        <AnimatePresence>
          {status === "submitted" && (
            <SpellLoader phase="thinking" />
          )}
          {status === "streaming" && streamingContent && (
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
                    {streamingContent}
                    <motion.span
                      className="inline-block w-0.5 h-4 bg-moss ml-0.5 align-middle"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <SpellBar
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          status={status}
        />
      </div>
    </div>
  );
}
