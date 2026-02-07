"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ProfileStats } from "@/components/ProfileStats";
import { BadgeGrid } from "@/components/AchievementBadge";
import { Leaderboard } from "@/components/Leaderboard";
import {
  MOCK_USER_STATS,
  MOCK_LEADERBOARD,
  getBadgesForUser,
  formatCarbonAmount,
} from "@/lib/gamification";

type Tab = "stats" | "badges" | "leaderboard";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const stats = MOCK_USER_STATS;
  const badges = useMemo(() => getBadgesForUser(stats), [stats]);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "stats", label: "Stats", icon: Shield },
    { id: "badges", label: `Badges (${unlockedCount}/${badges.length})`, icon: Sparkles },
    { id: "leaderboard", label: "Leaderboard", icon: Users },
  ];

  return (
    <div className="min-h-screen py-6 px-4 sm:px-8 max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-6">
        <PageHeader title="Your Grimoire" subtitle="Carbon wizard profile &amp; achievements" />
        <div className="flex-1" />

        {/* Avatar + quick stats */}
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

      {/* ── Sustainability Score Ring ── */}
      <motion.div
        className="specimen-card p-6 mb-6 flex items-center gap-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{
          rotateX: 2,
          rotateY: -3,
          transition: { duration: 0.3 },
        }}
        style={{ perspective: "800px", transformStyle: "preserve-3d" }}
      >
        {/* Score ring */}
        <motion.div
          className="relative shrink-0"
          whileHover={{
            scale: 1.05,
            filter: "drop-shadow(0 6px 12px rgba(75,106,76,0.2))",
            transition: { duration: 0.3 },
          }}
        >
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#6B3710" strokeWidth="3" strokeOpacity={0.08} />
            <motion.circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#4B6A4C"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={2 * Math.PI * 40 * (1 - stats.sustainabilityScore / 100)}
              transform="rotate(-90 48 48)"
              initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - stats.sustainabilityScore / 100) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <text x="48" y="44" textAnchor="middle" fill="#4B6A4C" fontSize="24" fontFamily="var(--font-header)">
              {stats.sustainabilityScore}
            </text>
            <text x="48" y="58" textAnchor="middle" fill="#6B3710" fontSize="8" opacity={0.4}>
              / 100
            </text>
          </svg>
        </motion.div>

        <div className="flex-1">
          <h3 className="text-lg font-header text-oak">Sustainability Score</h3>
          <p className="text-xs text-oak-light/50 mt-1 leading-relaxed max-w-md">
            Based on your carbon savings, eco mode usage, and prompt volume.
            {stats.sustainabilityScore >= 90
              ? " You are an Eco Archmage — among the top wizards!"
              : stats.sustainabilityScore >= 70
                ? " Strong performance — keep pushing toward Archmage status."
                : " Room to grow — try using Auto Sustainable mode more often."}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-moss" />
              <span className="text-[10px] text-oak/40">Eco mode {stats.ecoModePercent}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-topaz" />
              <span className="text-[10px] text-oak/40">{stats.streak}-day streak</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-witchberry" />
              <span className="text-[10px] text-oak/40">Rank #{stats.rank}</span>
            </div>
          </div>
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
