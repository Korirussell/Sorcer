"use client";

import { useEffect, useState, memo } from "react";
import { Leaf, Zap, TreePine, Sparkles } from "lucide-react";
import { getAggregateStats, type AggregateStats } from "@/lib/localChatStore";

function StatItem({ icon: Icon, text, color }: { icon: typeof Leaf; text: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-4">
      <Icon className={`w-3 h-3 ${color}`} />
      <span className="text-xs text-oak/50">{text}</span>
    </span>
  );
}

function StatsTickerInner() {
  const [stats, setStats] = useState<AggregateStats | null>(null);

  useEffect(() => {
    setStats(getAggregateStats());
  }, []);

  if (!stats || stats.totalChats === 0) return null;

  const items = [
    { icon: Leaf, text: `${stats.totalCarbonSaved_g < 1000 ? `${stats.totalCarbonSaved_g.toFixed(1)}g` : `${(stats.totalCarbonSaved_g / 1000).toFixed(2)}kg`} CO₂ saved`, color: "text-moss" },
    { icon: Zap, text: `${stats.totalPrompts} prompts routed sustainably`, color: "text-topaz" },
    { icon: TreePine, text: `${stats.avgReduction.toFixed(0)}% avg carbon reduction`, color: "text-moss" },
    { icon: Sparkles, text: `${stats.totalCacheHitTokens.toLocaleString()} tokens served from cache`, color: "text-miami" },
  ];

  // Double the items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="w-full overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-parchment to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-parchment to-transparent z-10 pointer-events-none" />
      <div
        className="flex animate-ticker"
        style={{
          width: "max-content",
        }}
      >
        {doubled.map((item, i) => (
          <StatItem key={`${item.text}-${i}`} icon={item.icon} text={item.text} color={item.color} />
        ))}
      </div>
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
      `}</style>
    </div>
  );
}

export const StatsTicker = memo(StatsTickerInner);
