"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sparkles, Users, Leaf, Zap, Shrink, Droplets, TreePine, Lightbulb, Car } from "lucide-react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/PageHeader";
import { RecklessToggle } from "@/components/RecklessToggle";

const ProfileStats = dynamic(() => import("@/components/ProfileStats").then(m => m.ProfileStats), { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-parchment-dark/30" /> });
const BadgeGrid = dynamic(() => import("@/components/AchievementBadge").then(m => m.BadgeGrid), { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-parchment-dark/30" /> });
const Leaderboard = dynamic(() => import("@/components/Leaderboard").then(m => m.Leaderboard), { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-parchment-dark/30" /> });
import {
  MOCK_USER_STATS,
  MOCK_LEADERBOARD,
  getBadgesForUser,
  formatCarbonAmount,
  calculateImpactStats,
} from "@/lib/gamification";
import type { ImpactStats } from "@/types/gamification";

const ImpactScene = dynamic(
  () => import("@/components/ImpactScene").then((m) => m.ImpactScene),
  { ssr: false, loading: () => (
    <div className="w-full rounded-2xl bg-parchment-dark/50 border border-oak/10 flex items-center justify-center" style={{ height: 380 }}>
      <motion.div className="w-10 h-10 rounded-full border-2 border-moss/30 border-t-moss" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
    </div>
  )}
);

type Tab = "stats" | "badges" | "leaderboard";

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedNumber({ value, decimals = 0, duration = 1.2 }: { value: number; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (value - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <>{display.toFixed(decimals)}</>;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  decimals = 0,
  color,
  isReckless,
  recklessLabel,
  delay = 0,
}: {
  icon: typeof Leaf;
  label: string;
  value: number;
  unit: string;
  decimals?: number;
  color: string;
  isReckless: boolean;
  recklessLabel: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`rounded-xl border p-3 text-center transition-colors duration-700 ${
        isReckless
          ? "bg-witchberry/5 border-witchberry/15"
          : `${color.includes("moss") ? "bg-moss/8 border-moss/15" : color.includes("topaz") ? "bg-topaz/8 border-topaz/15" : color.includes("miami") ? "bg-miami/8 border-miami/15" : "bg-oak/5 border-oak/10"}`
      }`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Icon className={`w-4 h-4 mx-auto mb-1 transition-colors duration-700 ${isReckless ? "text-witchberry" : color}`} />
      <div className={`text-lg font-header tabular-nums transition-colors duration-700 ${isReckless ? "text-witchberry" : color}`}>
        {isReckless ? (
          <span>0</span>
        ) : (
          <AnimatedNumber value={value} decimals={decimals} />
        )}
      </div>
      <div className="text-[9px] text-oak/40">{unit}</div>
      <AnimatePresence mode="wait">
        {isReckless && (
          <motion.div
            className="text-[8px] text-witchberry/70 mt-1 font-medium"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {recklessLabel}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [isReckless, setIsReckless] = useState(false);
  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);

  const stats = MOCK_USER_STATS;
  const badges = useMemo(() => getBadgesForUser(stats), [stats]);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  useEffect(() => {
    setImpactStats(calculateImpactStats());
  }, []);

  const impact = impactStats ?? {
    promptsCached: 12,
    totalRecycledPrompts: 12,
    promptsShortened: 8,
    totalTokensSaved: 2840,
    energySaved_kWh: 0.011,
    carbonSaved_g: 4200,
    waterSaved_mL: 20.4,
    treeHoursEquivalent: 190.9,
  };

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "stats", label: "Stats", icon: Shield },
    { id: "badges", label: `Badges (${unlockedCount}/${badges.length})`, icon: Sparkles },
    { id: "leaderboard", label: "Leaderboard", icon: Users },
  ];

  const equivalencies = [
    {
      icon: TreePine,
      sustainable: `${impact.treeHoursEquivalent.toFixed(1)} tree-hours of CO₂ absorption`,
      reckless: `Would need ${impact.treeHoursEquivalent.toFixed(1)} tree-hours to offset your damage`,
    },
    {
      icon: Droplets,
      sustainable: `${impact.waterSaved_mL.toFixed(0)} mL of cooling water preserved`,
      reckless: `${impact.waterSaved_mL.toFixed(0)} mL of water wasted on unnecessary compute`,
    },
    {
      icon: Lightbulb,
      sustainable: `Enough energy saved to power an LED for ${(impact.energySaved_kWh * 60).toFixed(1)} minutes`,
      reckless: `Wasted enough energy to power an LED for ${(impact.energySaved_kWh * 60).toFixed(1)} minutes`,
    },
    {
      icon: Car,
      sustainable: `Equivalent to ${(impact.carbonSaved_g / 404000).toFixed(4)} miles NOT driven`,
      reckless: `Like driving ${(impact.carbonSaved_g / 404000).toFixed(4)} extra miles for no reason`,
    },
  ];

  return (
    <div className="min-h-screen py-6 px-4 sm:px-8 max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-6">
        <PageHeader title="Your Grimoire" subtitle="Carbon wizard profile &amp; achievements" />
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-oak">Rank #{stats.rank}</p>
            <p className="text-[11px] text-moss">{formatCarbonAmount(stats.carbonSaved)} saved</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-moss/15 border border-moss/20 flex items-center justify-center text-2xl">
            🧙
          </div>
        </div>
      </div>

      {/* ── 3D Arcane Sanctum ── */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-3">
          <h2 className={`text-xl font-header transition-colors duration-700 ${isReckless ? "text-witchberry" : "text-oak"}`}>
            {isReckless ? "💀 Your Corrupted Sanctum" : "✨ Your Arcane Sanctum"}
          </h2>
          <p className={`text-[11px] transition-colors duration-700 ${isReckless ? "text-witchberry/50" : "text-oak/40"}`}>
            {isReckless ? "Your crystal darkens without Sorcer's protection" : "A living spell powered by your sustainable choices"}
          </p>
        </div>
        <Suspense fallback={
          <div className="w-full rounded-2xl bg-parchment-dark/50 border border-oak/10 flex items-center justify-center" style={{ height: 380 }}>
            <motion.div className="w-10 h-10 rounded-full border-2 border-moss/30 border-t-moss" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          </div>
        }>
          <ImpactScene isReckless={isReckless} stats={impact} />
        </Suspense>
      </motion.div>

      {/* ── Reckless Toggle ── */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <RecklessToggle isReckless={isReckless} onToggle={() => setIsReckless((p) => !p)} />
      </motion.div>

      {/* ── Impact Stats Grid ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        <StatCard icon={Zap} label="Tokens" value={impact.totalTokensSaved} unit="tokens saved" color="text-topaz" isReckless={isReckless} recklessLabel="0 saved" delay={0.1} />
        <StatCard icon={Leaf} label="Cached" value={impact.promptsCached} unit="cache hits" color="text-moss" isReckless={isReckless} recklessLabel="0 hits" delay={0.15} />
        <StatCard icon={Shrink} label="Compressed" value={impact.promptsShortened} unit="shortened" color="text-miami" isReckless={isReckless} recklessLabel="0 compressed" delay={0.2} />
        <StatCard icon={Leaf} label="Carbon" value={impact.carbonSaved_g} unit="g CO₂ saved" decimals={1} color="text-moss" isReckless={isReckless} recklessLabel={`+${impact.carbonSaved_g.toFixed(1)}g ADDED`} delay={0.25} />
        <StatCard icon={Lightbulb} label="Energy" value={impact.energySaved_kWh} unit="kWh saved" decimals={4} color="text-topaz" isReckless={isReckless} recklessLabel={`+${impact.energySaved_kWh.toFixed(4)} WASTED`} delay={0.3} />
        <StatCard icon={Droplets} label="Water" value={impact.waterSaved_mL} unit="mL saved" decimals={1} color="text-miami" isReckless={isReckless} recklessLabel={`+${impact.waterSaved_mL.toFixed(1)}mL WASTED`} delay={0.35} />
      </div>

      {/* ── Equivalencies ── */}
      <motion.div
        className={`specimen-card p-4 mb-6 space-y-3 transition-colors duration-700 ${isReckless ? "border-witchberry/15" : ""}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <h4 className={`text-sm font-header transition-colors duration-700 ${isReckless ? "text-witchberry" : "text-oak"}`}>
          {isReckless ? "The Cost of Recklessness" : "Real-World Equivalents"}
        </h4>
        {equivalencies.map((eq, i) => (
          <motion.div
            key={i}
            className={`flex items-start gap-3 px-3 py-2 rounded-xl transition-colors duration-500 ${
              isReckless ? "bg-witchberry/5" : "bg-moss/5"
            }`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
          >
            <eq.icon className={`w-4 h-4 mt-0.5 shrink-0 transition-colors duration-700 ${isReckless ? "text-witchberry" : "text-moss"}`} />
            <span className={`text-xs leading-relaxed transition-colors duration-700 ${isReckless ? "text-witchberry/70" : "text-oak/60"}`}>
              {isReckless ? eq.reckless : eq.sustainable}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200
              ${activeTab === tab.id
                ? "bg-parchment text-oak shadow-sm border border-oak/10"
                : "text-oak/40 hover:text-oak hover:bg-parchment/50"
              }
            `}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {activeTab === "stats" && <ProfileStats stats={stats} />}
        {activeTab === "badges" && <BadgeGrid badges={badges} />}
        {activeTab === "leaderboard" && <Leaderboard entries={MOCK_LEADERBOARD} />}
      </motion.div>
    </div>
  );
}
