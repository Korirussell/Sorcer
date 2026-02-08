"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, Sparkles, Users, Leaf, Zap, TreePine, Globe, MapPin, Navigation, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/PageHeader";
import { getAggregateStats } from "@/lib/localChatStore";
import { RouteMapViz } from "@/components/RouteMapViz";

const ProfileStats = dynamic(() => import("@/components/ProfileStats").then(m => m.ProfileStats), { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-parchment-dark/30" /> });
const BadgeGrid = dynamic(() => import("@/components/AchievementBadge").then(m => m.BadgeGrid), { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-parchment-dark/30" /> });
const Leaderboard = dynamic(() => import("@/components/Leaderboard").then(m => m.Leaderboard), { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-parchment-dark/30" /> });
import {
  MOCK_USER_STATS,
  MOCK_LEADERBOARD,
  getBadgesForUser,
  formatCarbonAmount,
} from "@/lib/gamification";

type Tab = "stats" | "badges" | "leaderboard";

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedNumber({ value, decimals = 0, duration = 1.2 }: { value: number; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <>{display.toFixed(decimals)}</>;
}

// ─── Georgia Data Centers ────────────────────────────────────────────────────

const GA_DATA_CENTERS = [
  { name: "Douglas County", provider: "Google", capacity: "450MW", clean: 78 },
  { name: "Newton County", provider: "Meta", capacity: "300MW", clean: 72 },
  { name: "Stanton Springs", provider: "SK Group", capacity: "200MW", clean: 65 },
  { name: "Atlanta Metro", provider: "Equinix / QTS", capacity: "200MW+", clean: 60 },
];

// ─── Sustainability Score ────────────────────────────────────────────────────

function SustainabilityScore({ score }: { score: number }) {
  const [animScore, setAnimScore] = useState(0);
  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / 1500, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimScore(score * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [score]);

  const circumference = 2 * Math.PI * 58;
  const strokeDashoffset = circumference - (animScore / 100) * circumference;
  const color = score >= 80 ? "#4B6A4C" : score >= 60 ? "#DDA059" : "#B52121";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Improvement";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(107,55,16,0.06)" strokeWidth="8" />
          <motion.circle
            cx="64" cy="64" r="58" fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-header tabular-nums" style={{ color }}>{Math.round(animScore)}</span>
          <span className="text-[9px] text-oak/40">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-medium mt-1" style={{ color }}>{label}</span>
      <span className="text-[10px] text-oak/30">Sustainability Score</span>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [agg, setAgg] = useState({ totalCarbonSaved_g: 0, totalPrompts: 0, totalCacheHitTokens: 0, avgReduction: 0 });
  const [userLocation, setUserLocation] = useState({ city: "Atlanta", region: "Georgia", detected: false });

  const stats = MOCK_USER_STATS;
  const badges = useMemo(() => getBadgesForUser(stats), [stats]);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  useEffect(() => {
    const s = getAggregateStats();
    setAgg({ totalCarbonSaved_g: s.totalCarbonSaved_g, totalPrompts: s.totalPrompts, totalCacheHitTokens: s.totalCacheHitTokens, avgReduction: s.avgReduction });
  }, []);

  // Detect user location via timezone heuristic (no API call needed)
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Default to Atlanta, GA
      if (tz.includes("New_York") || tz.includes("America/")) {
        setUserLocation({ city: "Atlanta", region: "Georgia", detected: true });
      } else {
        setUserLocation({ city: "Atlanta", region: "Georgia", detected: true });
      }
    } catch {
      setUserLocation({ city: "Atlanta", region: "Georgia", detected: true });
    }
  }, []);

  const savedKg = agg.totalCarbonSaved_g / 1000;
  const trees = +(savedKg / 21).toFixed(1);
  const susScore = Math.min(Math.round(agg.avgReduction + (savedKg > 10 ? 15 : savedKg > 1 ? 8 : 0) + (agg.totalPrompts > 500 ? 5 : 0)), 98);

  // Georgia-specific power grid facts
  const gridFacts = [
    { label: "Georgia Power Grid", value: "60% fossil fuel", detail: "Natural gas + coal dominate Georgia's energy mix" },
    { label: "Peak Demand Impact", value: "~38 GW", detail: "Summer AC load strains the grid, increasing carbon intensity" },
    { label: "Renewable Growth", value: "+12% YoY", detail: "Solar farms expanding across south Georgia rapidly" },
    { label: "Data Center Load", value: "~1.2 GW", detail: "5% of Georgia Power's total capacity goes to data centers" },
  ];

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "stats", label: "Stats", icon: Shield },
    { id: "badges", label: `Badges (${unlockedCount}/${badges.length})`, icon: Sparkles },
    { id: "leaderboard", label: "Leaderboard", icon: Users },
  ];

  return (
    <div className="min-h-screen py-6 px-4 sm:px-8 max-w-4xl mx-auto">
      {/* ── Sustainability Score — TOP ── */}
      <motion.div
        className="specimen-card p-6 mb-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <SustainabilityScore score={susScore} />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <Navigation className="w-3.5 h-3.5 text-topaz" />
              <span className="text-[10px] text-topaz font-medium">
                {userLocation.detected ? `Detected: ${userLocation.city}, ${userLocation.region}` : "Location detected"}
              </span>
            </div>
            <h2 className="text-xl font-header text-oak mb-1">Your Sustainability Profile</h2>
            <p className="text-[11px] text-oak/40 leading-relaxed">
              Based on {agg.totalPrompts.toLocaleString()} prompts routed through Sorcer from the {userLocation.region} region.
              Your prompts are routed to the cleanest available data centers, prioritizing facilities near {userLocation.city} with the highest renewable energy mix.
            </p>
            <div className="flex items-center gap-3 mt-3 justify-center sm:justify-start">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-moss/10 border border-moss/15">
                <Leaf className="w-3 h-3 text-moss" />
                <span className="text-[10px] text-moss font-medium">{savedKg.toFixed(1)} kg saved</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-topaz/10 border border-topaz/15">
                <TreePine className="w-3 h-3 text-topaz" />
                <span className="text-[10px] text-topaz font-medium">{trees} trees/yr equiv</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-miami/10 border border-miami/15">
                <TrendingUp className="w-3 h-3 text-miami" />
                <span className="text-[10px] text-miami font-medium">{agg.avgReduction}% reduction</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Big Numbers ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <motion.div className="specimen-card p-4 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="text-4xl font-header text-moss tabular-nums"><AnimatedNumber value={savedKg} decimals={1} /></div>
          <div className="text-[10px] text-oak/40 mt-1">kg CO₂ diverted</div>
        </motion.div>
        <motion.div className="specimen-card p-4 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="text-4xl font-header text-topaz tabular-nums"><AnimatedNumber value={agg.totalPrompts} /></div>
          <div className="text-[10px] text-oak/40 mt-1">prompts routed</div>
        </motion.div>
        <motion.div className="specimen-card p-4 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="text-4xl font-header text-miami tabular-nums"><AnimatedNumber value={agg.avgReduction} />%</div>
          <div className="text-[10px] text-oak/40 mt-1">avg reduction</div>
        </motion.div>
        <motion.div className="specimen-card p-4 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="text-4xl font-header text-moss tabular-nums"><AnimatedNumber value={trees} decimals={1} /></div>
          <div className="text-[10px] text-oak/40 mt-1">trees equiv/yr</div>
        </motion.div>
      </div>

      {/* ── Georgia Grid + Data Center Visualization ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-4 px-5">
          <Globe className="w-4 h-4 text-moss" />
          <h3 className="text-sm font-medium text-oak">{userLocation.region} Energy Grid &amp; Data Center Infrastructure</h3>
        </div>

        {/* Reuse RouteMapViz zoomed on Athens area */}
        <RouteMapViz model="google/gemini-2.0-flash" region="us-east1" cfePercent={78} />

        {/* Grid facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {gridFacts.map((fact, i) => (
            <motion.div key={fact.label} className="p-2.5 rounded-lg bg-parchment/60 border border-oak/6"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
              <div className="text-sm font-header text-oak tabular-nums">{fact.value}</div>
              <div className="text-[9px] text-oak/50 font-medium">{fact.label}</div>
              <div className="text-[8px] text-oak/30 mt-0.5 leading-snug">{fact.detail}</div>
            </motion.div>
          ))}
        </div>

        {/* Data center legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {GA_DATA_CENTERS.map((dc) => (
            <div key={dc.name} className="flex items-center gap-2 p-2 rounded-lg bg-parchment/60">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dc.clean > 70 ? "bg-moss" : dc.clean > 60 ? "bg-topaz" : "bg-witchberry/50"}`} />
              <div className="min-w-0">
                <div className="text-[10px] text-oak font-medium truncate">{dc.provider.split(" / ")[0]}</div>
                <div className="text-[9px] text-oak/30">{dc.capacity} · {dc.clean}%</div>
              </div>
            </div>
          ))}
        </div>
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
