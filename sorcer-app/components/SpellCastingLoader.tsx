"use client";

import { memo } from "react";
import { motion } from "framer-motion";

interface SpellCastingLoaderProps {
  status: "submitted" | "streaming";
  className?: string;
}

function SpellCastingLoaderInner({ status, className = "" }: SpellCastingLoaderProps) {
  const isStreaming = status === "streaming";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Animated orb */}
      <div className="relative w-8 h-8">
        {/* Outer ring pulse */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-moss/30"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Middle ring */}
        <motion.div
          className="absolute inset-1 rounded-full border border-moss/40"
          animate={{
            rotate: 360,
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ borderTopColor: "transparent" }}
        />
        {/* Core orb */}
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{
            background: isStreaming
              ? "radial-gradient(circle, #5E8260, #4B6A4C)"
              : "radial-gradient(circle, #DDA059, #A08060)",
          }}
          animate={{
            scale: [0.8, 1, 0.8],
            boxShadow: isStreaming
              ? ["0 0 8px rgba(75,106,76,0.3)", "0 0 16px rgba(75,106,76,0.5)", "0 0 8px rgba(75,106,76,0.3)"]
              : ["0 0 8px rgba(221,160,89,0.3)", "0 0 16px rgba(221,160,89,0.5)", "0 0 8px rgba(221,160,89,0.3)"],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Sparkle particles */}
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <motion.div
            key={angle}
            className="absolute w-1 h-1 rounded-full bg-moss/60"
            style={{
              left: "50%",
              top: "50%",
            }}
            animate={{
              x: [0, Math.cos((angle * Math.PI) / 180) * 14, 0],
              y: [0, Math.sin((angle * Math.PI) / 180) * 14, 0],
              opacity: [0, 0.8, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: angle / 360,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Text */}
      <div className="flex flex-col">
        <motion.span
          className="text-xs font-medium text-oak/70"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {isStreaming ? "Channeling response..." : "Consulting the Oracle..."}
        </motion.span>
        {/* Animated dots */}
        <div className="flex gap-0.5 mt-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-moss/50"
              animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>

      {/* Glowing border effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: isStreaming
            ? "inset 0 0 20px rgba(75,106,76,0.08)"
            : "inset 0 0 20px rgba(221,160,89,0.08)",
        }}
        animate={{
          boxShadow: isStreaming
            ? ["inset 0 0 20px rgba(75,106,76,0.05)", "inset 0 0 30px rgba(75,106,76,0.12)", "inset 0 0 20px rgba(75,106,76,0.05)"]
            : ["inset 0 0 20px rgba(221,160,89,0.05)", "inset 0 0 30px rgba(221,160,89,0.12)", "inset 0 0 20px rgba(221,160,89,0.05)"],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
}

export const SpellCastingLoader = memo(SpellCastingLoaderInner);
