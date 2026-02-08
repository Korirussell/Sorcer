"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface PromptCacheVizProps {
  totalTokens: number;
  cachedTokens: number;
  cacheHitRate: number;
}

function PromptCacheVizInner({ totalTokens, cachedTokens, cacheHitRate }: PromptCacheVizProps) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = cacheHitRate * circumference;

  return (
    <div className="specimen-card p-5">
      <h4 className="text-sm font-header text-oak mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-topaz" />
        Prompt Caching
      </h4>

      <div className="flex items-center gap-6">
        {/* Cache hit ring */}
        <div className="relative w-20 h-20 shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            {/* Background ring */}
            <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(107,55,16,0.08)" strokeWidth="6" />
            {/* Animated fill ring */}
            <motion.circle
              cx="40" cy="40" r={radius}
              fill="none"
              stroke="#4B6A4C"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              animate={{ strokeDashoffset: circumference - strokeDash }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-lg font-header text-moss"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {Math.round(cacheHitRate * 100)}%
            </motion.span>
            <span className="text-[9px] text-oak/40">cached</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <motion.div
                className="w-2 h-2 rounded-full bg-moss"
                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs text-oak/60">Cached tokens</span>
            </div>
            <motion.div
              className="text-2xl font-header text-moss"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
            >
              {cachedTokens.toLocaleString()}
            </motion.div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-topaz/50" />
              <span className="text-xs text-oak/60">Total tokens</span>
            </div>
            <span className="text-sm font-medium text-oak/70">{totalTokens.toLocaleString()}</span>
          </div>

          {/* Token bar */}
          <div className="h-2 rounded-full bg-oak/8 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-moss to-moss-light"
              initial={{ width: 0 }}
              animate={{ width: `${cacheHitRate * 100}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const PromptCacheViz = memo(PromptCacheVizInner);
