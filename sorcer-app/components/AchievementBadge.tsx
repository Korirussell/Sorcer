"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import type { Badge, BadgeRarity } from "@/types/gamification";

const RARITY_STYLES: Record<BadgeRarity, { border: string; glow: string; label: string }> = {
  common: { border: "border-oak/20", glow: "", label: "text-oak/50" },
  rare: { border: "border-blue-400/40", glow: "shadow-[0_0_12px_rgba(96,165,250,0.2)]", label: "text-blue-500" },
  epic: { border: "border-purple-400/40", glow: "shadow-[0_0_12px_rgba(168,85,247,0.25)]", label: "text-purple-500" },
  legendary: { border: "border-topaz/50", glow: "shadow-[0_0_16px_rgba(221,160,89,0.35)]", label: "text-topaz" },
};

export function AchievementBadge({ badge }: { badge: Badge }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const style = RARITY_STYLES[badge.rarity];
  const progress = badge.progress;
  const pct = progress ? Math.round((progress.current / progress.target) * 100) : 0;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <motion.div
        className={`
          relative w-20 h-24 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all duration-300
          ${badge.unlocked
            ? `bg-parchment ${style.border} ${style.glow} cursor-default`
            : "bg-oak/5 border-oak/10 cursor-default"
          }
        `}
        whileHover={{ scale: badge.unlocked ? 1.05 : 1.02 }}
      >
        {/* Icon */}
        <span className={`text-2xl ${badge.unlocked ? "" : "grayscale opacity-30"}`}>
          {badge.icon}
        </span>

        {/* Lock overlay */}
        {!badge.unlocked && (
          <div className="absolute top-1.5 right-1.5">
            <Lock className="w-3 h-3 text-oak/30" />
          </div>
        )}

        {/* Name */}
        <span className={`text-[9px] font-medium text-center leading-tight px-1 ${badge.unlocked ? "text-oak" : "text-oak/30"}`}>
          {badge.name}
        </span>

        {/* Progress bar (for locked badges) */}
        {!badge.unlocked && progress && (
          <div className="absolute bottom-1.5 left-2 right-2 h-1 rounded-full bg-oak/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-moss/50 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Rarity dot */}
        {badge.unlocked && (
          <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
            badge.rarity === "legendary" ? "bg-topaz" :
            badge.rarity === "epic" ? "bg-purple-400" :
            badge.rarity === "rare" ? "bg-blue-400" : "bg-oak/30"
          }`} />
        )}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          >
            <div className="bg-[#F7F3E8] border border-[#6B3710]/20 rounded-lg px-3 py-2 shadow-lg w-44">
              <p className="text-xs font-semibold text-oak">{badge.name}</p>
              <p className="text-[10px] text-oak/50 mt-0.5">{badge.description}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className={`text-[9px] font-medium uppercase tracking-wider ${style.label}`}>
                  {badge.rarity}
                </span>
                {badge.unlocked && badge.unlockedAt && (
                  <span className="text-[9px] text-oak/30">
                    {badge.unlockedAt.toLocaleDateString()}
                  </span>
                )}
                {!badge.unlocked && progress && (
                  <span className="text-[9px] text-oak/40">
                    {progress.current}/{progress.target}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Badge Grid ──────────────────────────────────────────────────────────────
export function BadgeGrid({ badges }: { badges: Badge[] }) {
  const unlocked = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);

  return (
    <div className="space-y-4">
      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div>
          <h4 className="text-[10px] text-oak/40 uppercase tracking-wider mb-2">
            Unlocked ({unlocked.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {unlocked.map((b) => (
              <AchievementBadge key={b.id} badge={b} />
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div>
          <h4 className="text-[10px] text-oak/40 uppercase tracking-wider mb-2">
            Locked ({locked.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {locked.map((b) => (
              <AchievementBadge key={b.id} badge={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
