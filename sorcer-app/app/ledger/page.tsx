"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  Zap,
  TreePine,
  TrendingUp,
  Receipt,
  ShieldCheck,
  AlertTriangle,
  X as XIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value, decimals = 1, duration = 1200 }: { value: number; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <>{display.toFixed(decimals)}</>;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────
const CARBON_STATS = {
  totalSaved: 127.5,
  promptsRouted: 342,
  ecoPercent: 78,
  treesEquiv: 5.2,
  avgPerPrompt: 0.37,
  bestDay: { date: "2026-01-23", saved: 8.4 },
};

const WEEKLY_DATA = [
  { day: "Mon", saved: 2.1, cost: 0.8 },
  { day: "Tue", saved: 3.4, cost: 1.2 },
  { day: "Wed", saved: 1.8, cost: 0.6 },
  { day: "Thu", saved: 4.2, cost: 1.5 },
  { day: "Fri", saved: 2.9, cost: 1.1 },
  { day: "Sat", saved: 1.2, cost: 0.4 },
  { day: "Sun", saved: 0.8, cost: 0.3 },
];

const MONTHLY_DATA = [
  { month: "Oct", saved: 18.2 },
  { month: "Nov", saved: 24.7 },
  { month: "Dec", saved: 38.1 },
  { month: "Jan", saved: 46.5 },
];

interface ReceiptData {
  id: string;
  prompt: string;
  model: string;
  region: string;
  carbonCost: number;
  carbonSaved: number;
  timestamp: string;
  eco: boolean;
  energyBreakdown: { source: string; pct: number; color: string }[];
  baselineCost: number;
  tokens: number;
  latency: string;
}

const RECEIPT_HISTORY: ReceiptData[] = [
  { id: "r001", prompt: "Analyze the environmental impact of cloud computing", model: "Gemini Flash Lite", region: "us-central1", carbonCost: 0.12, carbonSaved: 0.45, timestamp: "2h ago", eco: true, energyBreakdown: [{ source: "Wind", pct: 65, color: "#6B9E6F" }, { source: "Solar", pct: 25, color: "#DDA059" }, { source: "Gas", pct: 10, color: "#A08060" }], baselineCost: 0.57, tokens: 1240, latency: "1.2s" },
  { id: "r002", prompt: "Generate a comprehensive report on renewable energy", model: "Claude Haiku", region: "us-west1", carbonCost: 0.18, carbonSaved: 0.32, timestamp: "5h ago", eco: true, energyBreakdown: [{ source: "Hydro", pct: 55, color: "#4a8ab5" }, { source: "Wind", pct: 30, color: "#6B9E6F" }, { source: "Gas", pct: 15, color: "#A08060" }], baselineCost: 0.50, tokens: 2100, latency: "2.1s" },
  { id: "r003", prompt: "Summarize latest carbon capture research papers", model: "GPT-5.2", region: "us-east4", carbonCost: 0.42, carbonSaved: 0.0, timestamp: "8h ago", eco: false, energyBreakdown: [{ source: "Gas", pct: 45, color: "#A08060" }, { source: "Coal", pct: 35, color: "#555" }, { source: "Nuclear", pct: 20, color: "#9B7EC8" }], baselineCost: 0.42, tokens: 3400, latency: "3.8s" },
  { id: "r004", prompt: "Compare sustainable packaging materials for e-commerce", model: "Gemini Flash Lite", region: "us-central1", carbonCost: 0.09, carbonSaved: 0.51, timestamp: "1d ago", eco: true, energyBreakdown: [{ source: "Wind", pct: 70, color: "#6B9E6F" }, { source: "Solar", pct: 20, color: "#DDA059" }, { source: "Gas", pct: 10, color: "#A08060" }], baselineCost: 0.60, tokens: 890, latency: "0.9s" },
  { id: "r005", prompt: "Draft a proposal for carbon offset program", model: "Claude Haiku", region: "us-west1", carbonCost: 0.15, carbonSaved: 0.38, timestamp: "1d ago", eco: true, energyBreakdown: [{ source: "Hydro", pct: 60, color: "#4a8ab5" }, { source: "Wind", pct: 25, color: "#6B9E6F" }, { source: "Gas", pct: 15, color: "#A08060" }], baselineCost: 0.53, tokens: 1800, latency: "1.8s" },
  { id: "r006", prompt: "Explain quantum computing energy requirements", model: "GPT-5.2", region: "us-east4", carbonCost: 0.38, carbonSaved: 0.0, timestamp: "2d ago", eco: false, energyBreakdown: [{ source: "Gas", pct: 50, color: "#A08060" }, { source: "Coal", pct: 30, color: "#555" }, { source: "Nuclear", pct: 20, color: "#9B7EC8" }], baselineCost: 0.38, tokens: 2800, latency: "3.2s" },
];

const BUDGET_STATUS = {
  limit_g: 500,
  used_g: 187.3,
  remaining_percent: 62.5,
  policy_active: true,
};

// ─── Weekly Bar Chart ────────────────────────────────────────────────────────
function WeeklyChart({ data }: { data: typeof WEEKLY_DATA }) {
  const max = Math.max(...data.map((d) => d.saved + d.cost), 1);
  return (
    <div className="flex items-end gap-2 h-32" style={{ perspective: "300px", transform: "rotateX(5deg)", transformOrigin: "bottom center" }}>
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col items-stretch gap-0.5" style={{ height: `${((d.saved + d.cost) / max) * 100}%` }}>
            <div
              className="w-full rounded-t bg-moss/60"
              style={{ flex: d.saved }}
            />
            <div
              className="w-full rounded-b bg-witchberry/30"
              style={{ flex: d.cost }}
            />
          </div>
          <span className="text-[9px] text-oak/40">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Monthly Trend ───────────────────────────────────────────────────────────
function MonthlyTrend({ data }: { data: typeof MONTHLY_DATA }) {
  const max = Math.max(...data.map((d) => d.saved), 1);
  return (
    <div className="flex items-end gap-3 h-32" style={{ perspective: "300px", transform: "rotateX(5deg)", transformOrigin: "bottom center" }}>
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-moss font-medium tabular-nums">{d.saved}kg</span>
          <div
            className="w-full rounded-t bg-moss/40 transition-all duration-700"
            style={{ height: `${(d.saved / max) * 100}%`, minHeight: 4 }}
          />
          <span className="text-[9px] text-oak/40">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Budget Gauge ────────────────────────────────────────────────────────────
function BudgetGauge({ budget }: { budget: typeof BUDGET_STATUS }) {
  const usedPct = ((budget.used_g / budget.limit_g) * 100);
  const isLow = budget.remaining_percent < 25;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-oak/50">Used: {budget.used_g.toFixed(1)}g</span>
        <span className="text-xs text-oak/50">Limit: {budget.limit_g}g</span>
      </div>
      <div className="h-3 rounded-full bg-oak/8 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isLow ? "bg-witchberry/70" : "bg-moss/60"}`}
          initial={{ width: 0 }}
          animate={{ width: `${usedPct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className={`text-[10px] font-medium ${isLow ? "text-witchberry" : "text-moss"}`}>
          {budget.remaining_percent}% remaining
        </span>
        {budget.policy_active && (
          <span className="text-[10px] text-moss flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Policy active
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Receipt Detail Modal ────────────────────────────────────────────────────
function ReceiptDetailModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  const savingsPct = receipt.baselineCost > 0 ? ((receipt.carbonSaved / receipt.baselineCost) * 100).toFixed(0) : "0";
  const total = receipt.energyBreakdown.reduce((s, e) => s + e.pct, 0);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-oak/10 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative specimen-card p-6 max-w-md w-full z-10"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-oak/5 text-oak/40 hover:text-oak transition-colors">
          <XIcon className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-2 mb-4">
          <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${receipt.eco ? "bg-moss" : "bg-witchberry/50"}`} />
          <div>
            <p className="text-sm font-medium text-oak leading-snug">{receipt.prompt}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-oak/40">{receipt.model}</span>
              <span className="text-[10px] text-oak/30">{receipt.region}</span>
              <span className="text-[10px] text-oak/30">{receipt.timestamp}</span>
            </div>
          </div>
        </div>

        {/* Nutrition Label */}
        <div className="border border-oak/10 rounded-xl p-4 mb-4">
          <h4 className="text-xs font-medium text-oak/60 uppercase tracking-wider mb-3">Carbon Nutrition Label</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-oak/60">Carbon Cost</span>
              <span className="font-medium text-oak tabular-nums">{receipt.carbonCost.toFixed(3)} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-oak/60">Baseline Cost</span>
              <span className="font-medium text-oak/40 tabular-nums line-through">{receipt.baselineCost.toFixed(3)} kg</span>
            </div>
            <div className="h-px bg-oak/10" />
            <div className="flex justify-between text-sm">
              <span className={receipt.eco ? "text-moss font-medium" : "text-witchberry/60"}>Carbon Saved</span>
              <span className={`font-medium tabular-nums ${receipt.eco ? "text-moss" : "text-witchberry/60"}`}>
                {receipt.eco ? `-${receipt.carbonSaved.toFixed(3)} kg` : "0.000 kg"}
              </span>
            </div>
            {receipt.eco && (
              <div className="flex justify-between text-xs">
                <span className="text-oak/40">Reduction</span>
                <span className="text-moss font-medium">{savingsPct}%</span>
              </div>
            )}
            <div className="h-px bg-oak/10" />
            <div className="flex justify-between text-xs">
              <span className="text-oak/40">Tokens</span>
              <span className="text-oak/60 tabular-nums">{receipt.tokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-oak/40">Latency</span>
              <span className="text-oak/60">{receipt.latency}</span>
            </div>
          </div>
        </div>

        {/* Energy Breakdown */}
        <div className="mb-4">
          <h4 className="text-xs font-medium text-oak/60 uppercase tracking-wider mb-2">Grid Energy Sources</h4>
          <div className="flex items-center gap-3">
            <svg width="64" height="64" viewBox="0 0 64 64">
              {(() => {
                let cum = 0;
                const r = 24;
                const circ = 2 * Math.PI * r;
                return receipt.energyBreakdown.map((e) => {
                  const frac = e.pct / total;
                  const offset = cum * circ;
                  cum += frac;
                  return (
                    <circle key={e.source} cx="32" cy="32" r={r} fill="none"
                      stroke={e.color} strokeWidth="8"
                      strokeDasharray={`${frac * circ} ${circ}`} strokeDashoffset={-offset}
                      transform="rotate(-90 32 32)" opacity={0.8} />
                  );
                });
              })()}
            </svg>
            <div className="flex flex-col gap-1">
              {receipt.energyBreakdown.map((e) => (
                <div key={e.source} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
                  <span className="text-xs text-oak">{e.source}</span>
                  <span className="text-[10px] text-oak/40 ml-auto">{e.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison bar */}
        {receipt.eco && (
          <div>
            <h4 className="text-xs font-medium text-oak/60 uppercase tracking-wider mb-2">vs. Baseline</h4>
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-oak/40">This prompt</span>
                  <span className="text-moss">{receipt.carbonCost.toFixed(3)} kg</span>
                </div>
                <div className="h-2 rounded-full bg-oak/8 overflow-hidden">
                  <motion.div className="h-full rounded-full bg-moss/60"
                    initial={{ width: 0 }} animate={{ width: `${(receipt.carbonCost / receipt.baselineCost) * 100}%` }}
                    transition={{ duration: 0.6 }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-oak/40">Baseline (dirty grid)</span>
                  <span className="text-witchberry/50">{receipt.baselineCost.toFixed(3)} kg</span>
                </div>
                <div className="h-2 rounded-full bg-oak/8 overflow-hidden">
                  <div className="h-full rounded-full bg-witchberry/30" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function LedgerPage() {
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  return (
    <div className="min-h-screen py-6 px-4 sm:px-8 max-w-4xl mx-auto">
      <PageHeader title="Carbon Ledger" subtitle="Your environmental impact at a glance" />

      {/* ── Hero Stat ── */}
      <motion.div
        className="specimen-card p-6 mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div>
            <p className="text-[10px] text-oak/40 uppercase tracking-wider mb-1">Total Carbon Diverted</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-header text-moss leading-none tabular-nums">
                <AnimatedNumber value={CARBON_STATS.totalSaved} />
              </span>
              <span className="text-lg text-oak-light/50">kg CO₂</span>
            </div>
            <p className="text-xs text-oak-light/50 mt-2">
              Equivalent to <span className="text-moss font-medium">{CARBON_STATS.treesEquiv} trees</span> absorbing carbon for a year
            </p>
          </div>

          <div className="sm:ml-auto grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-moss/10 flex items-center justify-center mx-auto mb-1">
                <Zap className="w-4 h-4 text-moss" />
              </div>
              <span className="text-lg font-header text-oak">{CARBON_STATS.promptsRouted}</span>
              <p className="text-[9px] text-oak/40">Prompts</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-topaz/10 flex items-center justify-center mx-auto mb-1">
                <TrendingUp className="w-4 h-4 text-topaz" />
              </div>
              <span className="text-lg font-header text-oak">{CARBON_STATS.ecoPercent}%</span>
              <p className="text-[9px] text-oak/40">Eco Mode</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-moss/10 flex items-center justify-center mx-auto mb-1">
                <TreePine className="w-4 h-4 text-moss" />
              </div>
              <span className="text-lg font-header text-moss">{CARBON_STATS.treesEquiv}</span>
              <p className="text-[9px] text-oak/40">Trees</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <motion.div
          className="specimen-card p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h3 className="text-[10px] text-oak/40 uppercase tracking-wider mb-3">This Week</h3>
          <WeeklyChart data={WEEKLY_DATA} />
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-moss/60" />
              <span className="text-[9px] text-oak/40">Saved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-witchberry/30" />
              <span className="text-[9px] text-oak/40">Cost</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="specimen-card p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <h3 className="text-[10px] text-oak/40 uppercase tracking-wider mb-3">Monthly Trend</h3>
          <MonthlyTrend data={MONTHLY_DATA} />
        </motion.div>
      </div>

      {/* ── Carbon Budget ── */}
      <motion.div
        className="specimen-card p-5 mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-moss" />
          <h3 className="text-sm font-medium text-oak">Carbon Budget</h3>
          <span className="text-[10px] text-oak/30 ml-auto">project: sorcer-main</span>
        </div>
        <BudgetGauge budget={BUDGET_STATUS} />
      </motion.div>

      {/* ── Receipt History ── */}
      <motion.div
        className="specimen-card overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-oak/8">
          <Receipt className="w-4 h-4 text-oak/40" />
          <h3 className="text-sm font-medium text-oak">Carbon Receipts</h3>
          <span className="text-[10px] text-oak/30 ml-auto">{RECEIPT_HISTORY.length} recent</span>
        </div>

        {RECEIPT_HISTORY.map((receipt) => (
          <button
            key={receipt.id}
            onClick={() => setSelectedReceipt(receipt)}
            className={`w-full text-left px-5 py-4 border-b border-oak/5 last:border-b-0 hover:bg-oak/3 transition-colors cursor-pointer ${
              receipt.eco ? "border-l-2 border-l-moss" : "border-l-2 border-l-witchberry/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${receipt.eco ? "bg-moss" : "bg-witchberry/50"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-oak truncate">{receipt.prompt}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-oak/40">{receipt.model}</span>
                  <span className="text-[10px] text-oak/30">{receipt.region}</span>
                  <span className="text-[10px] text-oak/30">{receipt.timestamp}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1.5">
                  {receipt.eco ? (
                    <Leaf className="w-3 h-3 text-moss" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-witchberry/50" />
                  )}
                  <span className={`text-xs font-medium tabular-nums ${receipt.eco ? "text-moss" : "text-witchberry/60"}`}>
                    {receipt.eco ? `-${receipt.carbonSaved.toFixed(2)}kg` : `+${receipt.carbonCost.toFixed(2)}kg`}
                  </span>
                </div>
                <span className="text-[9px] text-oak/30">cost: {receipt.carbonCost.toFixed(2)}kg</span>
              </div>
            </div>
          </button>
        ))}
      </motion.div>

      {/* ── Receipt Detail Modal ── */}
      <AnimatePresence>
        {selectedReceipt && <ReceiptDetailModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
      </AnimatePresence>
    </div>
  );
}
