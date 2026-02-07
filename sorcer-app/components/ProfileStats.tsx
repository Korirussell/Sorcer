"use client";

import { useEffect, useState } from "react";
import {
  Leaf,
  Zap,
  Trophy,
  Flame,
  TrendingUp,
  Calendar,
  Cpu,
  MapPin,
  Target,
} from "lucide-react";
import type { UserStats } from "@/types/gamification";
import { formatCarbonAmount, formatNumber } from "@/lib/gamification";

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value, decimals = 1, duration = 1200 }: { value: number; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
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

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────
function WeeklyChart({ data }: { data: { day: string; carbon: number }[] }) {
  const max = Math.max(...data.map((d) => d.carbon), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-moss/60 transition-all duration-700"
            style={{ height: `${(d.carbon / max) * 100}%`, minHeight: 2 }}
          />
          <span className="text-[9px] text-oak/40">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Model Usage Donut ───────────────────────────────────────────────────────
function ModelDonut({ data }: { data: { model: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  let cumulative = 0;
  const r = 32;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {data.map((d) => {
          const pct = d.count / total;
          const offset = cumulative * circumference;
          cumulative += pct;
          return (
            <circle
              key={d.model}
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="8"
              strokeDasharray={`${pct * circumference} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              opacity={0.7}
              transform="rotate(-90 40 40)"
            />
          );
        })}
        <text x="40" y="38" textAnchor="middle" fill="#6B3710" fontSize="14" fontFamily="var(--font-header)">
          {total}
        </text>
        <text x="40" y="50" textAnchor="middle" fill="#6B3710" fontSize="7" opacity={0.5}>
          prompts
        </text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.model} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-[11px] text-oak/70">{d.model}</span>
            <span className="text-[10px] text-oak/40 ml-auto">{Math.round((d.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Stats Component ────────────────────────────────────────────────────
export function ProfileStats({ stats }: { stats: UserStats }) {
  const statCards = [
    { label: "Carbon Saved", value: stats.carbonSaved, unit: "kg CO₂", icon: Leaf, color: "text-moss", bg: "bg-moss/10", decimals: 1 },
    { label: "Prompts Routed", value: stats.promptsCount, unit: "total", icon: Zap, color: "text-topaz", bg: "bg-topaz/10", decimals: 0 },
    { label: "Sustainability", value: stats.sustainabilityScore, unit: "/ 100", icon: Target, color: "text-moss", bg: "bg-moss/10", decimals: 0 },
    { label: "Global Rank", value: stats.rank, unit: `of ${formatNumber(2847)}`, icon: Trophy, color: "text-topaz", bg: "bg-topaz/10", decimals: 0 },
    { label: "Day Streak", value: stats.streak, unit: "days", icon: Flame, color: "text-witchberry", bg: "bg-witchberry/10", decimals: 0 },
    { label: "Avg / Prompt", value: stats.avgCarbonPerPrompt, unit: "kg saved", icon: TrendingUp, color: "text-moss", bg: "bg-moss/10", decimals: 2 },
  ];

  return (
    <div className="space-y-5">
      {/* ── Primary Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="specimen-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <span className="text-[10px] text-oak/40 uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-header ${s.color} leading-none tabular-nums`}>
                <AnimatedNumber value={s.value} decimals={s.decimals} />
              </span>
              <span className="text-[10px] text-oak/40">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Secondary Info ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Best Day */}
        <div className="specimen-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5 text-topaz" />
            <span className="text-[10px] text-oak/40 uppercase tracking-wider">Best Day</span>
          </div>
          <span className="text-lg font-header text-oak">{stats.bestDay.carbonSaved}kg</span>
          <p className="text-[10px] text-oak/40 mt-0.5">{stats.bestDay.date}</p>
        </div>

        {/* Favorite Model */}
        <div className="specimen-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-3.5 h-3.5 text-moss" />
            <span className="text-[10px] text-oak/40 uppercase tracking-wider">Favorite Model</span>
          </div>
          <span className="text-sm font-medium text-oak">{stats.favoriteModel}</span>
        </div>

        {/* Top Region */}
        <div className="specimen-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3.5 h-3.5 text-moss" />
            <span className="text-[10px] text-oak/40 uppercase tracking-wider">Top Region</span>
          </div>
          <span className="text-sm font-medium text-oak">{stats.topRegion}</span>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Weekly Carbon Chart */}
        <div className="specimen-card p-4">
          <h4 className="text-[10px] text-oak/40 uppercase tracking-wider mb-3">Weekly Carbon Saved</h4>
          <WeeklyChart data={stats.weeklyData} />
        </div>

        {/* Model Usage Donut */}
        <div className="specimen-card p-4">
          <h4 className="text-[10px] text-oak/40 uppercase tracking-wider mb-3">Model Usage</h4>
          <ModelDonut data={stats.modelUsage} />
        </div>
      </div>
    </div>
  );
}
