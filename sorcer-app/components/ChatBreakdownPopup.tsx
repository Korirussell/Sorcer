"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X as XIcon,
  Leaf,
  Zap,
  Database,
  Shrink,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Server,
  Globe,
} from "lucide-react";
import { getMessages, type ChatRecord, type StoredMessage } from "@/lib/localChatStore";

// ─── Region coordinates for the mini route map ─────────────────────────────

const REGION_COORDS: Record<string, { x: number; y: number; label: string }> = {
  "us-central1": { x: 50, y: 45, label: "Iowa" },
  "us-west1": { x: 15, y: 40, label: "Oregon" },
  "europe-west1": { x: 75, y: 25, label: "Belgium" },
  "us-east4": { x: 80, y: 45, label: "Virginia" },
  auto: { x: 50, y: 45, label: "Auto" },
};

const USER_POS = { x: 65, y: 55 }; // Atlanta-ish

// ─── Route Map Mini ─────────────────────────────────────────────────────────

function RouteMapMini({ region }: { region: string }) {
  const dest = REGION_COORDS[region] || REGION_COORDS["us-central1"];

  // Curved path from user to server
  const midX = (USER_POS.x + dest.x) / 2;
  const midY = Math.min(USER_POS.y, dest.y) - 15;
  const pathD = `M${USER_POS.x},${USER_POS.y} Q${midX},${midY} ${dest.x},${dest.y}`;

  return (
    <div className="relative w-full h-32 rounded-xl bg-parchment border border-oak/10 overflow-hidden">
      <svg viewBox="0 0 100 70" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Subtle grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 10} y1={0} x2={i * 10} y2={70} stroke="#6B3710" strokeWidth={0.1} opacity={0.1} />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 10} x2={100} y2={i * 10} stroke="#6B3710" strokeWidth={0.1} opacity={0.1} />
        ))}

        {/* Animated route path */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="#B52121"
          strokeWidth={0.8}
          strokeDasharray="3,2"
          opacity={0.6}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Animated dot traveling along path */}
        <motion.circle
          r={1.5}
          fill="#B52121"
          initial={{ cx: USER_POS.x, cy: USER_POS.y }}
          animate={{ cx: dest.x, cy: dest.y }}
          transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
        />

        {/* User location */}
        <circle cx={USER_POS.x} cy={USER_POS.y} r={3} fill="#4B6A4C" stroke="#F7F3E8" strokeWidth={0.5} />
        <text x={USER_POS.x} y={USER_POS.y + 6} textAnchor="middle" fill="#4B6A4C" fontSize="3" fontWeight="bold">You</text>

        {/* Server location */}
        <motion.circle
          cx={dest.x} cy={dest.y} r={3.5}
          fill="#DDA059" stroke="#F7F3E8" strokeWidth={0.5}
          animate={{ r: [3.5, 4.5, 3.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <text x={dest.x} y={dest.y + 7} textAnchor="middle" fill="#DDA059" fontSize="3" fontWeight="bold">{dest.label}</text>

        {/* Arrow head at destination */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <circle cx={dest.x} cy={dest.y} r={6} fill="none" stroke="#DDA059" strokeWidth={0.3} opacity={0.3} />
        </motion.g>
      </svg>
    </div>
  );
}

// ─── Stat Row ───────────────────────────────────────────────────────────────

function StatRow({ icon: Icon, label, value, color = "text-oak", sub }: {
  icon: typeof Leaf;
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color === "text-moss" ? "bg-moss/10" : color === "text-topaz" ? "bg-topaz/10" : "bg-oak/5"}`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-oak/50">{label}</span>
        {sub && <span className="text-[10px] text-oak/30 ml-1.5">{sub}</span>}
      </div>
      <span className={`text-sm font-medium tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

// ─── Main Popup ─────────────────────────────────────────────────────────────

interface ChatBreakdownPopupProps {
  chat: ChatRecord;
  onClose: () => void;
  anchorRect?: DOMRect | null;
}

export function ChatBreakdownPopup({ chat, onClose }: ChatBreakdownPopupProps) {
  const [showMap, setShowMap] = useState(false);

  const messages = useMemo(() => getMessages(chat.id), [chat.id]);

  // Aggregate stats from assistant messages
  const stats = useMemo(() => {
    const assistantMsgs = messages.filter((m) => m.role === "assistant");
    let totalCost = 0, totalBaseline = 0, totalSaved = 0;
    let totalTokensIn = 0, totalTokensOut = 0;
    let cachedCount = 0, cacheHitTokens = 0;
    let compressedCount = 0, originalTokens = 0, compressedTokens = 0;
    let totalLatency = 0;
    let lastRegion = chat.region;
    let lastModel = chat.model;

    for (const m of assistantMsgs) {
      const c = m.carbon;
      totalCost += c.cost_g;
      totalBaseline += c.baseline_g;
      totalSaved += c.saved_g;
      totalTokensIn += c.tokens_in;
      totalTokensOut += c.tokens_out;
      totalLatency += c.latency_ms;
      if (c.cached) { cachedCount++; cacheHitTokens += c.cache_hit_tokens; }
      if (c.compressed) { compressedCount++; originalTokens += c.original_tokens; compressedTokens += c.compressed_tokens; }
      if (c.region) lastRegion = c.region;
      if (c.model) lastModel = c.model;
    }

    const reductionPct = totalBaseline > 0 ? ((totalSaved / totalBaseline) * 100) : 0;

    return {
      totalCost, totalBaseline, totalSaved, reductionPct,
      totalTokensIn, totalTokensOut,
      cachedCount, cacheHitTokens, totalAssistant: assistantMsgs.length,
      compressedCount, originalTokens, compressedTokens,
      avgLatency: assistantMsgs.length > 0 ? totalLatency / assistantMsgs.length : 0,
      lastRegion, lastModel,
    };
  }, [messages, chat]);

  const modelLabel = stats.lastModel.split("/").pop() || stats.lastModel;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-oak/10 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <motion.div
        className="relative z-10 w-full max-w-sm bg-parchment-dark border border-oak/15 rounded-2xl shadow-specimen-hover overflow-hidden"
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <div className="w-9 h-9 rounded-xl bg-moss/10 flex items-center justify-center">
            <Leaf className="w-4.5 h-4.5 text-moss" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-oak truncate">{chat.title}</h3>
            <p className="text-[10px] text-oak/35">{chat.promptCount} prompts · {modelLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-oak/30 hover:text-oak hover:bg-oak/5 transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Hero stat */}
        <div className="mx-5 mb-4 p-4 rounded-xl bg-moss/8 border border-moss/15">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-header text-moss tabular-nums">
              {stats.totalSaved < 1 ? `${(stats.totalSaved * 1000).toFixed(0)}mg` : `${stats.totalSaved.toFixed(2)}g`}
            </span>
            <span className="text-xs text-moss/60">CO₂ saved</span>
          </div>
          {stats.reductionPct > 0 && (
            <div className="mt-2 h-1.5 rounded-full bg-oak/8 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-moss/50"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(stats.reductionPct, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          )}
          <p className="text-[10px] text-moss/50 mt-1">
            {stats.reductionPct.toFixed(0)}% reduction vs baseline ({stats.totalBaseline.toFixed(2)}g)
          </p>
        </div>

        {/* Stats */}
        <div className="px-5 divide-y divide-oak/6">
          {/* Semantic Cache */}
          <StatRow
            icon={Database}
            label="Semantic Cache"
            value={stats.cachedCount > 0 ? `${stats.cachedCount}/${stats.totalAssistant} hit` : "No hits"}
            color={stats.cachedCount > 0 ? "text-topaz" : "text-oak/40"}
            sub={stats.cacheHitTokens > 0 ? `${stats.cacheHitTokens.toLocaleString()} tokens saved` : undefined}
          />

          {/* Compression */}
          <StatRow
            icon={Shrink}
            label="Prompt Compression"
            value={stats.compressedCount > 0 ? `${stats.originalTokens} → ${stats.compressedTokens}` : "None"}
            color={stats.compressedCount > 0 ? "text-moss" : "text-oak/40"}
            sub={stats.compressedCount > 0 ? `${((1 - stats.compressedTokens / Math.max(stats.originalTokens, 1)) * 100).toFixed(0)}% smaller` : undefined}
          />

          {/* Token Usage */}
          <StatRow
            icon={Zap}
            label="Total Tokens"
            value={`${(stats.totalTokensIn + stats.totalTokensOut).toLocaleString()}`}
            color="text-oak"
            sub={`${stats.totalTokensIn.toLocaleString()} in · ${stats.totalTokensOut.toLocaleString()} out`}
          />

          {/* Sustainability */}
          <StatRow
            icon={Leaf}
            label="Carbon Cost"
            value={`${stats.totalCost.toFixed(3)}g`}
            color="text-moss"
            sub={`avg ${stats.avgLatency.toFixed(0)}ms latency`}
          />

          {/* Region */}
          <div className="flex items-center gap-3 py-2">
            <div className="w-7 h-7 rounded-lg bg-oak/5 flex items-center justify-center">
              <Server className="w-3.5 h-3.5 text-oak/50" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-oak/50">Routed to</span>
            </div>
            <span className="text-sm font-medium text-oak">{stats.lastRegion}</span>
          </div>
        </div>

        {/* Route Map Toggle */}
        <div className="px-5 pt-3 pb-5">
          <button
            onClick={() => setShowMap(!showMap)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-oak/10 text-xs font-medium text-oak/50 hover:text-oak hover:border-oak/20 hover:bg-parchment/50 transition-all"
          >
            <Globe className="w-3.5 h-3.5" />
            {showMap ? "Hide Route Map" : "Show Route Map"}
            <ArrowRight className={`w-3 h-3 transition-transform ${showMap ? "rotate-90" : ""}`} />
          </button>

          <AnimatePresence>
            {showMap && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-3">
                  <RouteMapMini region={stats.lastRegion} />
                  <p className="text-[10px] text-oak/30 text-center mt-2">
                    Your prompt traveled from <span className="text-oak/50">Atlanta</span>
                    <ArrowRight className="w-2.5 h-2.5 inline mx-1 text-oak/30" />
                    <span className="text-topaz">{REGION_COORDS[stats.lastRegion]?.label || stats.lastRegion}</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
