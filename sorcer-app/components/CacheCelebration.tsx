"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, Leaf } from "lucide-react";

interface CacheCelebrationProps {
  active: boolean;
  savedSeconds?: number;
}

export function CacheCelebration({ active, savedSeconds = 3.2 }: CacheCelebrationProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="relative flex items-center justify-center py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Radiating rings */}
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-topaz/30"
              style={{ width: 80, height: 80 }}
              initial={{ scale: 0.3, opacity: 0.9 }}
              animate={{ scale: 3 + i * 0.6, opacity: 0 }}
              transition={{
                duration: 1.2,
                delay: i * 0.15,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Central celebration card */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-linear-to-br from-topaz/20 to-topaz/10 border border-topaz/40 shadow-lg shadow-topaz/10"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <motion.div
              className="w-12 h-12 rounded-full bg-topaz/20 flex items-center justify-center"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 15, -15, 0],
              }}
              transition={{ duration: 0.8, repeat: 2 }}
            >
              <Zap className="w-6 h-6 text-topaz fill-topaz" />
            </motion.div>
            <div className="text-center">
              <motion.p
                className="text-lg font-header text-topaz"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Instant Processing
              </motion.p>
              <motion.p
                className="text-[11px] text-oak/50 mt-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                Semantic cache hit — 0g carbon · saved ~{savedSeconds.toFixed(1)}s
              </motion.p>
            </div>
            <motion.div
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-moss/10 border border-moss/20"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Leaf className="w-3 h-3 text-moss" />
              <span className="text-[10px] text-moss font-medium">Zero compute required</span>
            </motion.div>
          </motion.div>

          {/* Sparkle particles */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 60 + Math.random() * 30;
            return (
              <motion.div
                key={`spark-${i}`}
                className="absolute w-2 h-2 rounded-full bg-topaz"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  opacity: 0,
                  scale: 0,
                }}
                transition={{
                  duration: 0.8,
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
