"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronDown } from "lucide-react";
import type { StoredMessage } from "@/lib/localChatStore";

interface CacheTimelineProps {
  messages: StoredMessage[];
}

export function CacheTimeline({ messages }: CacheTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  const userMessages = messages.filter(m => m.role === "user");
  const assistantMessages = messages.filter(m => m.role === "assistant");

  // Build timeline entries: for each user message, check if the next assistant was cached
  const entries = userMessages.map((um, i) => {
    const nextAssistant = assistantMessages[i];
    return {
      index: i + 1,
      cached: nextAssistant?.carbon.cached ?? false,
      tokens: nextAssistant?.carbon.cache_hit_tokens ?? 0,
    };
  });

  if (entries.length === 0) return null;

  const hitCount = entries.filter(e => e.cached).length;
  const hitRate = entries.length > 0 ? Math.round((hitCount / entries.length) * 100) : 0;

  return (
    <div className="px-2">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl bg-parchment-dark/30 border border-oak/8 hover:border-oak/12 transition-all text-left"
      >
        <Zap className="w-3 h-3 text-topaz" />
        <span className="text-[10px] font-medium text-oak/50">
          Cache: {hitRate}% hit rate
        </span>
        {hitCount > 0 && (
          <span className="text-[10px] text-topaz font-medium">
            ⚡ {hitCount} hit{hitCount > 1 ? "s" : ""}
          </span>
        )}
        <div className="flex-1" />
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3 h-3 text-oak/25" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-3 py-3">
              {/* Timeline line */}
              <div className="flex items-center gap-0">
                {entries.map((entry, i) => (
                  <div key={i} className="flex items-center">
                    {/* Node */}
                    <motion.div
                      className="relative flex flex-col items-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                    >
                      <div
                        className={`rounded-full border-2 flex items-center justify-center ${
                          entry.cached
                            ? "w-5 h-5 bg-topaz/20 border-topaz shadow-[0_0_6px_rgba(221,160,89,0.3)]"
                            : "w-3.5 h-3.5 bg-transparent border-oak/20"
                        }`}
                      >
                        {entry.cached && <Zap className="w-2.5 h-2.5 text-topaz" />}
                      </div>
                      {/* Label below */}
                      <span className={`text-[8px] mt-1 ${entry.cached ? "text-topaz font-medium" : "text-oak/25"}`}>
                        {entry.cached ? "HIT" : "miss"}
                      </span>
                    </motion.div>

                    {/* Connecting line */}
                    {i < entries.length - 1 && (
                      <motion.div
                        className="h-px flex-1 min-w-[12px] max-w-[32px] bg-oak/10 mx-0.5"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: i * 0.08 + 0.04 }}
                      />
                    )}
                  </div>
                ))}

                {/* Arrow */}
                <motion.div
                  className="ml-1 text-oak/15"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: entries.length * 0.08 }}
                >
                  ▶
                </motion.div>

                {/* Hit rate */}
                <motion.div
                  className="ml-3 flex items-center gap-1"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: entries.length * 0.08 + 0.1 }}
                >
                  <span className={`text-xs font-header tabular-nums ${hitRate > 40 ? "text-moss" : hitRate > 20 ? "text-topaz" : "text-oak/40"}`}>
                    {hitRate}%
                  </span>
                  {hitRate > 30 && (
                    <span className="text-[10px] text-moss">↑</span>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
