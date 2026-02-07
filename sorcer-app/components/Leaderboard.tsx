"use client";

import { useState, useMemo } from "react";
import { Trophy, ChevronUp, ChevronDown, Search, Crown, Medal } from "lucide-react";
import type { LeaderboardEntry, LeaderboardFilter, LeaderboardSort } from "@/types/gamification";
import { formatCarbonAmount } from "@/lib/gamification";

const CURRENT_USER_ID = "user_001";

const FILTER_LABELS: Record<LeaderboardFilter, string> = {
  "all-time": "All Time",
  month: "This Month",
  week: "This Week",
};

const SORT_LABELS: Record<LeaderboardSort, string> = {
  carbonSaved: "Carbon Saved",
  sustainabilityScore: "Score",
  promptsCount: "Prompts",
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-4 h-4 text-topaz" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-[#A0A088]" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-[#B87333]" />;
  return <span className="text-xs text-oak/40 w-4 text-center tabular-nums">{rank}</span>;
}

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const [filter, setFilter] = useState<LeaderboardFilter>("all-time");
  const [sortBy, setSortBy] = useState<LeaderboardSort>("carbonSaved");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNearMe, setShowNearMe] = useState(false);

  const sorted = useMemo(() => {
    let list = [...entries].sort((a, b) => {
      if (sortBy === "carbonSaved") return b.carbonSaved - a.carbonSaved;
      if (sortBy === "sustainabilityScore") return b.sustainabilityScore - a.sustainabilityScore;
      return b.promptsCount - a.promptsCount;
    });

    // Re-rank after sort
    list = list.map((e, i) => ({ ...e, rank: i + 1 }));

    if (searchQuery.trim()) {
      list = list.filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (showNearMe) {
      const myIdx = list.findIndex((e) => e.userId === CURRENT_USER_ID);
      if (myIdx >= 0) {
        const start = Math.max(0, myIdx - 5);
        const end = Math.min(list.length, myIdx + 6);
        list = list.slice(start, end);
      }
    }

    return list;
  }, [entries, sortBy, searchQuery, showNearMe]);

  return (
    <div className="space-y-3">
      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Time filters */}
        <div className="flex gap-1">
          {(Object.keys(FILTER_LABELS) as LeaderboardFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                filter === f
                  ? "bg-moss/15 text-moss border border-moss/20"
                  : "text-oak/40 hover:text-oak/60 hover:bg-oak/5"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-1 ml-auto">
          {(Object.keys(SORT_LABELS) as LeaderboardSort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 ${
                sortBy === s
                  ? "bg-topaz/15 text-topaz border border-topaz/20"
                  : "text-oak/30 hover:text-oak/50"
              }`}
            >
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Near Me */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-oak/30" />
          <input
            type="text"
            placeholder="Search wizards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-parchment border border-oak/10 text-xs text-oak placeholder:text-oak/30 focus:outline-none focus:border-oak/20"
          />
        </div>
        <button
          onClick={() => setShowNearMe(!showNearMe)}
          className={`px-3 py-2 rounded-xl text-[11px] font-medium transition-all duration-200 ${
            showNearMe
              ? "bg-moss/15 text-moss border border-moss/20"
              : "text-oak/40 border border-oak/10 hover:border-oak/20"
          }`}
        >
          Near Me
        </button>
      </div>

      {/* ── Table ── */}
      <div className="specimen-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_1fr_80px_80px_60px] gap-2 px-4 py-2.5 border-b border-oak/8 text-[9px] text-oak/40 uppercase tracking-wider">
          <span>#</span>
          <span>Wizard</span>
          <span className="text-right">Carbon</span>
          <span className="text-right">Score</span>
          <span className="text-right">Badges</span>
        </div>

        {/* Rows */}
        {sorted.map((entry) => {
          const isMe = entry.userId === CURRENT_USER_ID;
          return (
            <div
              key={entry.userId}
              className={`grid grid-cols-[40px_1fr_80px_80px_60px] gap-2 px-4 py-3 items-center transition-colors duration-200 ${
                isMe
                  ? "bg-moss/8 border-l-2 border-l-moss"
                  : "hover:bg-oak/3 border-l-2 border-l-transparent"
              }`}
            >
              {/* Rank */}
              <div className="flex items-center">
                <RankBadge rank={entry.rank} />
              </div>

              {/* Name + Avatar */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg">{entry.avatar}</span>
                <div className="min-w-0">
                  <span className={`text-sm font-medium truncate block ${isMe ? "text-moss" : "text-oak"}`}>
                    {entry.name}
                    {isMe && <span className="text-[9px] text-moss/60 ml-1">(you)</span>}
                  </span>
                  <span className="text-[10px] text-oak/30">{entry.promptsCount} prompts</span>
                </div>
              </div>

              {/* Carbon */}
              <span className="text-right text-xs font-medium text-moss tabular-nums">
                {formatCarbonAmount(entry.carbonSaved)}
              </span>

              {/* Score */}
              <div className="text-right">
                <span className={`text-xs font-medium tabular-nums ${
                  entry.sustainabilityScore >= 90 ? "text-moss" :
                  entry.sustainabilityScore >= 70 ? "text-topaz" : "text-oak/60"
                }`}>
                  {entry.sustainabilityScore}
                </span>
              </div>

              {/* Badges */}
              <span className="text-right text-xs text-oak/50 tabular-nums">
                {entry.badgeCount}
              </span>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-oak/30">
            No wizards found
          </div>
        )}
      </div>
    </div>
  );
}
