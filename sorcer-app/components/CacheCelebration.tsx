"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface CacheCelebrationProps {
  active: boolean;
  savedSeconds?: number;
}

export function CacheCelebration({ active, savedSeconds = 3.2 }: CacheCelebrationProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Radiating rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-topaz/40"
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 2.5 + i * 0.5, opacity: 0 }}
              transition={{
                duration: 0.8,
                delay: i * 0.15,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Central burst */}
          <motion.div
            className="relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-topaz/15 border border-topaz/30"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, 15, -15, 0],
              }}
              transition={{ duration: 0.6, repeat: 2 }}
            >
              <Zap className="w-4 h-4 text-topaz fill-topaz" />
            </motion.div>
            <span className="text-[11px] font-medium text-topaz whitespace-nowrap">
              Cache Hit! Saved ~{savedSeconds.toFixed(1)}s · 0g carbon
            </span>
          </motion.div>

          {/* Sparkle particles */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 40 + Math.random() * 20;
            return (
              <motion.div
                key={`spark-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-topaz"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  opacity: 0,
                  scale: 0,
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.1 + i * 0.03,
                  ease: "easeOut",
                }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function GoldenShimmerBorder({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="absolute -inset-px rounded-2xl"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(221,160,89,0.4), transparent)",
          backgroundSize: "200% 100%",
        }}
        animate={{
          backgroundPosition: ["200% 0%", "-200% 0%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div className="relative rounded-2xl">{children}</div>
    </motion.div>
  );
}
