"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Recycle, Shrink, Leaf, ChevronDown, ChevronUp, Users, Globe, TrendingUp, Infinity } from "lucide-react";

// ─── Community Cache Data (shared across ALL users) ─────────────────────────

const COMMUNITY_CACHE = {
  totalEntries: 14_892,
  activeUsers: 2_847,
  totalQueriesServed: 128_450,
  cacheHits: 96_338,
  totalTokensProcessed: 8_456_200,
  totalTokensSaved: 6_342_150,
  growthRate: 340, // new entries/day
  topClusters: [
    { label: "Code Generation", entries: 3_240, hits: 2_810, color: "bg-blue-500/15 text-blue-700 border-blue-500/20" },
    { label: "ML / AI Concepts", entries: 2_680, hits: 2_290, color: "bg-orange-500/15 text-orange-700 border-orange-500/20" },
    { label: "DevOps & Infra", entries: 1_950, hits: 1_640, color: "bg-yellow-600/15 text-yellow-700 border-yellow-600/20" },
    { label: "Carbon & Sustainability", entries: 1_820, hits: 1_680, color: "bg-moss/15 text-moss border-moss/20" },
    { label: "Web Development", entries: 1_640, hits: 1_380, color: "bg-cyan-500/15 text-cyan-700 border-cyan-500/20" },
    { label: "Data & Analytics", entries: 1_120, hits: 940, color: "bg-purple-500/15 text-purple-700 border-purple-500/20" },
    { label: "System Design", entries: 980, hits: 820, color: "bg-indigo-500/15 text-indigo-700 border-indigo-500/20" },
    { label: "Security & Auth", entries: 740, hits: 610, color: "bg-pink-500/15 text-pink-700 border-pink-500/20" },
    { label: "Databases", entries: 722, hits: 580, color: "bg-red-500/15 text-red-700 border-red-500/20" },
  ],
  recentSharedHits: [
    { prompt: "Explain transformer attention mechanism", user: "User #1,847", savedTokens: 420, timeAgo: "12s ago" },
    { prompt: "Python async/await best practices", user: "User #892", savedTokens: 380, timeAgo: "28s ago" },
    { prompt: "Carbon footprint of LLM inference", user: "User #2,103", savedTokens: 510, timeAgo: "45s ago" },
    { prompt: "React Server Components vs SSR", user: "User #441", savedTokens: 340, timeAgo: "1m ago" },
    { prompt: "Kubernetes horizontal pod autoscaling", user: "User #1,290", savedTokens: 460, timeAgo: "1m ago" },
    { prompt: "How does RAG reduce hallucination?", user: "User #2,651", savedTokens: 390, timeAgo: "2m ago" },
    { prompt: "PostgreSQL query optimization tips", user: "User #738", savedTokens: 350, timeAgo: "2m ago" },
    { prompt: "Docker multi-stage build patterns", user: "User #1,502", savedTokens: 280, timeAgo: "3m ago" },
    { prompt: "Carbon-aware scheduling strategies", user: "User #2,004", savedTokens: 440, timeAgo: "3m ago" },
    { prompt: "Fine-tuning vs RAG comparison", user: "User #315", savedTokens: 490, timeAgo: "4m ago" },
    { prompt: "gRPC streaming vs WebSocket", user: "User #1,178", savedTokens: 320, timeAgo: "5m ago" },
    { prompt: "Data center water consumption stats", user: "User #2,399", savedTokens: 410, timeAgo: "5m ago" },
  ],
};

function computeStats() {
  const c = COMMUNITY_CACHE;
  const hitRate = Math.round((c.cacheHits / c.totalQueriesServed) * 100);
  const co2PerCall_g = 0.18;
  const totalCO2Saved_g = c.cacheHits * co2PerCall_g;
  const totalCO2Saved_kg = totalCO2Saved_g / 1000;
  const energySaved_kWh = c.totalTokensSaved * 0.0000035;
  const waterSaved_L = energySaved_kWh * 1.8;
  const carsEquiv = totalCO2Saved_kg / (4600 / 365); // avg car emits 4600kg/year
  const treeDays = totalCO2Saved_kg / (21 / 365); // tree absorbs 21kg/year
  return { hitRate, totalCO2Saved_g, totalCO2Saved_kg, energySaved_kWh, waterSaved_L, carsEquiv, treeDays };
}

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimCounter({ value, decimals = 0, duration = 1.5, prefix = "", suffix = "" }: {
  value: number; decimals?: number; duration?: number; prefix?: string; suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <>{prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}{suffix}</>;
}

// ─── Live Feed Item ──────────────────────────────────────────────────────────

function LiveHitItem({ prompt, user, savedTokens, timeAgo, index }: {
  prompt: string; user: string; savedTokens: number; timeAgo: string; index: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-parchment/60 border border-oak/6 hover:border-moss/20 transition-colors"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
    >
      <div className="w-2 h-2 rounded-full bg-moss animate-pulse shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-oak truncate">{prompt}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-oak/30">{user}</span>
          <span className="text-[9px] text-oak/20">{timeAgo}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-[10px] text-moss font-medium tabular-nums">−{savedTokens}</span>
        <span className="text-[9px] text-oak/25 block">tokens</span>
      </div>
    </motion.div>
  );
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export interface CacheStats {
  totalTokens: number;
  hitTokens: number;
  cachedCount: number;
  total: number;
  hitRate: number;
  energySaved_kWh: number;
  carbonSaved_g: number;
  waterSaved_mL: number;
}

export function useSemanticCacheData() {
  return useMemo(() => {
    const s = computeStats();
    const stats: CacheStats = {
      totalTokens: COMMUNITY_CACHE.totalTokensProcessed,
      hitTokens: COMMUNITY_CACHE.totalTokensSaved,
      cachedCount: COMMUNITY_CACHE.cacheHits,
      total: COMMUNITY_CACHE.totalEntries,
      hitRate: s.hitRate,
      energySaved_kWh: s.energySaved_kWh,
      carbonSaved_g: s.totalCO2Saved_g,
      waterSaved_mL: s.waterSaved_L,
    };
    return { nodes: [], edges: [], stats };
  }, []);
}

export function SemanticCacheGraph3D() {
  const stats = useMemo(() => computeStats(), []);
  const c = COMMUNITY_CACHE;
  const [expanded, setExpanded] = useState(false);

  const visibleHits = expanded ? c.recentSharedHits : c.recentSharedHits.slice(0, 6);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-oak/10 bg-gradient-to-br from-parchment to-parchment-dark/50">
      <div className="p-6 pb-4">

        {/* ── Hero: The Shared Pool Concept ── */}
        <motion.div
          className="mb-6 rounded-2xl p-6 bg-gradient-to-br from-moss/10 via-moss/5 to-transparent border border-moss/20"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-moss/20 flex items-center justify-center">
              <Globe className="w-6 h-6 text-moss" />
            </div>
            <div>
              <h3 className="text-lg font-header text-oak">The Shared Semantic Cache</h3>
              <p className="text-[11px] text-oak/40">A community knowledge pool that grows with every user</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Infinity className="w-4 h-4 text-moss/50" />
              <span className="text-[10px] text-moss/50">∞ capacity</span>
            </div>
          </div>

          <p className="text-xs text-oak/60 leading-relaxed mb-4">
            Unlike traditional per-user caches, Sorcer maintains a <span className="text-moss font-medium">single shared pool</span> across
            all users. When <em>anyone</em> asks a similar question, the cached response is served instantly —
            <span className="text-moss font-medium"> zero LLM compute, zero carbon</span>. The more people use Sorcer,
            the smarter and more efficient it gets for <em>everyone</em>.
          </p>

        </motion.div>

        {/* ── Projected Community Impact Stats ── */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-oak/30 uppercase tracking-wider">Projected / Estimated at Scale</span>
          <div className="flex-1 h-px bg-oak/8" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <motion.div className="specimen-card p-4 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="text-3xl font-header text-moss tabular-nums mb-1">
              <AnimCounter value={stats.hitRate} suffix="%" />
            </div>
            <div className="text-[10px] text-oak/40">Projected Hit Rate</div>
            <div className="text-[9px] text-moss/60 mt-1">
              est. <AnimCounter value={c.cacheHits} /> queries served free
            </div>
          </motion.div>

          <motion.div className="specimen-card p-4 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="text-3xl font-header text-topaz tabular-nums mb-1">
              <AnimCounter value={stats.totalCO2Saved_kg} decimals={1} suffix="kg" />
            </div>
            <div className="text-[10px] text-oak/40">Estimated CO₂ Saved</div>
            <div className="text-[9px] text-topaz/60 mt-1">≈ {stats.treeDays.toFixed(0)} tree-days absorbed</div>
          </motion.div>

          <motion.div className="specimen-card p-4 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="text-3xl font-header text-miami tabular-nums mb-1">
              <AnimCounter value={c.totalTokensSaved} />
            </div>
            <div className="text-[10px] text-oak/40">Estimated Tokens Recycled</div>
            <div className="text-[9px] text-miami/60 mt-1">projected across all users</div>
          </motion.div>

          <motion.div className="specimen-card p-4 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="text-3xl font-header text-oak tabular-nums mb-1">
              <AnimCounter value={c.totalQueriesServed} />
            </div>
            <div className="text-[10px] text-oak/40">Projected Queries</div>
            <div className="text-[9px] text-oak/30 mt-1">est. {(c.totalQueriesServed - c.cacheHits).toLocaleString()} requiring LLM</div>
          </motion.div>
        </div>

        {/* ── Knowledge Clusters ── */}
        <motion.div
          className="mb-6 specimen-card p-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <h4 className="text-sm font-medium text-oak mb-3">Knowledge Clusters</h4>
          <p className="text-[11px] text-oak/40 mb-4">
            The cache organizes itself into semantic clusters. Similar prompts cluster together,
            so even <em>slightly different</em> phrasings get cache hits.
          </p>
          <div className="space-y-2.5">
            {c.topClusters.map((cluster, i) => {
              const hitPct = Math.round((cluster.hits / cluster.entries) * 100);
              return (
                <motion.div
                  key={cluster.label}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                >
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium border w-36 shrink-0 ${cluster.color}`}>
                    {cluster.label}
                  </span>
                  <div className="flex-1 h-4 rounded-full bg-oak/5 overflow-hidden relative">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: "linear-gradient(90deg, #4B6A4C, #6B9E6F)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${hitPct}%` }}
                      transition={{ delay: 0.5 + i * 0.05, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <span className="text-[10px] text-moss font-medium tabular-nums">{hitPct}%</span>
                    <span className="text-[9px] text-oak/25 ml-1">({cluster.entries.toLocaleString()})</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── How It Works ── */}
        <motion.div
          className="mb-6 rounded-xl bg-topaz/6 border border-topaz/15 p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h4 className="text-sm font-medium text-oak mb-3">How the Shared Cache Works</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="text-center p-3">
              <div className="text-2xl mb-2">🧠</div>
              <div className="text-[11px] text-oak font-medium mb-1">Semantic Matching</div>
              <div className="text-[10px] text-oak/40 leading-relaxed">
                Your prompt is embedded into a vector. We search for semantically similar prompts — not exact matches.
              </div>
            </div>
            <div className="text-center p-3">
              <div className="text-2xl mb-2">🌐</div>
              <div className="text-[11px] text-oak font-medium mb-1">Shared Across Everyone</div>
              <div className="text-[10px] text-oak/40 leading-relaxed">
                Every user&apos;s query enriches the pool. When User #2,000 asks what User #47 asked, the answer is instant.
              </div>
            </div>
            <div className="text-center p-3">
              <div className="text-2xl mb-2">♾️</div>
              <div className="text-[11px] text-oak font-medium mb-1">Infinitely Scalable</div>
              <div className="text-[10px] text-oak/40 leading-relaxed">
                No cap. The pool grows forever. More users = higher hit rate = more carbon saved for everyone.
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Global Savings Summary ── */}
        <motion.div
          className="rounded-xl bg-moss/8 border border-moss/15 p-4 mb-6"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-oak/50">Community token flow</span>
            <span className="text-xs text-oak/60 tabular-nums font-medium">{c.totalTokensProcessed.toLocaleString()} total</span>
          </div>
          <div className="h-5 rounded-full bg-oak/8 overflow-hidden relative">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: "linear-gradient(90deg, #4B6A4C, #6B9E6F)" }}
              initial={{ width: 0 }}
              animate={{ width: `${(c.totalTokensSaved / c.totalTokensProcessed) * 100}%` }}
              transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-moss" />
              <span className="text-[10px] text-moss font-medium">{c.totalTokensSaved.toLocaleString()} tokens served from cache ({Math.round((c.totalTokensSaved / c.totalTokensProcessed) * 100)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-oak/15" />
              <span className="text-[10px] text-oak/40">{(c.totalTokensProcessed - c.totalTokensSaved).toLocaleString()} computed</span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
