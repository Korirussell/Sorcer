"use client";

import { motion } from "framer-motion";

interface RecklessToggleProps {
  isReckless: boolean;
  onToggle: () => void;
}

export function RecklessToggle({ isReckless, onToggle }: RecklessToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="relative flex items-center gap-0 w-full max-w-sm mx-auto rounded-2xl overflow-hidden border transition-colors duration-500"
      style={{
        borderColor: isReckless ? "rgba(181,33,33,0.3)" : "rgba(75,106,76,0.3)",
        background: isReckless
          ? "linear-gradient(90deg, rgba(181,33,33,0.05), rgba(181,33,33,0.15))"
          : "linear-gradient(90deg, rgba(75,106,76,0.15), rgba(75,106,76,0.05))",
      }}
    >
      {/* Left label */}
      <div className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 transition-opacity duration-300 ${!isReckless ? "opacity-100" : "opacity-40"}`}>
        <span className="text-sm">🌿</span>
        <span className={`text-xs font-medium transition-colors duration-300 ${!isReckless ? "text-moss" : "text-oak/40"}`}>
          Sustainable
        </span>
      </div>

      {/* Toggle knob */}
      <div className="relative w-12 h-8 flex items-center">
        <motion.div
          className="absolute w-7 h-7 rounded-full shadow-md"
          style={{
            background: isReckless
              ? "linear-gradient(135deg, #B52121, #d44)"
              : "linear-gradient(135deg, #4B6A4C, #6a9a6c)",
          }}
          animate={{
            x: isReckless ? 16 : -4,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      </div>

      {/* Right label */}
      <div className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 transition-opacity duration-300 ${isReckless ? "opacity-100" : "opacity-40"}`}>
        <span className={`text-xs font-medium transition-colors duration-300 ${isReckless ? "text-witchberry" : "text-oak/40"}`}>
          Reckless
        </span>
        <span className="text-sm">💀</span>
      </div>
    </button>
  );
}
