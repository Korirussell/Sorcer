"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Lightbulb, Leaf, Droplets, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSemanticCacheData, type CacheStats } from "@/components/SemanticCacheGraph";

const SemanticCacheGraph3D = dynamic(
  () => import("@/components/SemanticCacheGraph").then((m) => m.SemanticCacheGraph3D),
  { ssr: false, loading: () => (
    <div className="w-full rounded-2xl flex items-center justify-center" style={{ height: 480, background: "#080c18" }}>
      <motion.div className="w-10 h-10 rounded-full border-2 border-blue-400/30 border-t-blue-400" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
    </div>
  )}
);

function StatCard({ label, value, icon: Icon, color, delay }: { label: string; value: string | number; icon: typeof Zap; color: string; delay: number }) {
  return (
    <motion.div
      className="specimen-card p-3 text-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
      <div className={`text-lg font-header tabular-nums ${color}`}>{value}</div>
      <div className="text-[9px] text-oak/40">{label}</div>
    </motion.div>
  );
}

function EnergySavingsPanel({ stats }: { stats: CacheStats }) {
  const items = [
    { icon: Zap, label: "Tokens Recycled", value: stats.hitTokens.toLocaleString(), color: "text-blue-400" },
    { icon: Lightbulb, label: "Energy Saved", value: `${(stats.energySaved_kWh * 1000).toFixed(1)} Wh`, color: "text-yellow-400" },
    { icon: Leaf, label: "CO₂ Avoided", value: `${stats.carbonSaved_g.toFixed(2)}g`, color: "text-green-400" },
    { icon: Droplets, label: "Water Preserved", value: `${stats.waterSaved_mL.toFixed(1)} mL`, color: "text-cyan-400" },
  ];

  return (
    <motion.div
      className="specimen-card p-4 space-y-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h3 className="text-sm font-header text-oak">Estimated Energy Savings from Cache</h3>
      <p className="text-[10px] text-oak/40">
        By reusing {stats.hitTokens.toLocaleString()} cached tokens across {stats.cachedCount} hits,
        the semantic cache avoids redundant GPU inference cycles.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            className="rounded-xl bg-[#0d1525] border border-blue-500/10 p-3 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
          >
            <item.icon className={`w-4 h-4 mx-auto mb-1 ${item.color}`} />
            <div className={`text-sm font-header tabular-nums ${item.color}`}>{item.value}</div>
            <div className="text-[8px] text-oak/30 mt-0.5">{item.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="text-[9px] text-oak/30 pt-1">
        Estimates based on ~0.0035 Wh per 1000 tokens of GPU inference at 400g CO₂/kWh grid intensity.
      </div>
    </motion.div>
  );
}

export default function DeveloperPage() {
  const router = useRouter();
  const { nodes, edges, stats } = useSemanticCacheData();

  return (
    <div className="min-h-screen py-6 px-4 sm:px-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/")} className="p-1.5 rounded-lg text-oak/40 hover:text-oak hover:bg-oak/5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-header text-oak">Developer Details</h1>
          <p className="text-[11px] text-oak/40">Semantic cache constellation &amp; energy impact</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Prompts" value={stats.total} icon={BarChart3} color="text-oak" delay={0.05} />
        <StatCard label="Cache Hits" value={stats.cachedCount} icon={Zap} color="text-green-400" delay={0.1} />
        <StatCard label="Hit Rate" value={`${stats.hitRate}%`} icon={Zap} color="text-blue-400" delay={0.15} />
        <StatCard label="Tokens Saved" value={stats.hitTokens.toLocaleString()} icon={Zap} color="text-yellow-400" delay={0.2} />
        <StatCard label="CO₂ Saved" value={`${stats.carbonSaved_g.toFixed(2)}g`} icon={Leaf} color="text-moss" delay={0.25} />
      </div>

      {/* 3D Cache Constellation */}
      <motion.div className="mb-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-sm font-header text-oak">Cache Constellation</h3>
          <div className="flex items-center gap-4 text-[9px] text-oak/30">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Hit</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Cached</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Miss</span>
          </div>
        </div>
        <Suspense fallback={
          <div className="w-full rounded-2xl flex items-center justify-center" style={{ height: 480, background: "#080c18" }}>
            <motion.div className="w-10 h-10 rounded-full border-2 border-blue-400/30 border-t-blue-400" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          </div>
        }>
          <SemanticCacheGraph3D nodes={nodes} edges={edges} />
        </Suspense>
      </motion.div>

      {/* Energy Savings */}
      <EnergySavingsPanel stats={stats} />
    </div>
  );
}
