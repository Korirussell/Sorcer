"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export function CarbonPulse() {
  const [intensity, setIntensity] = useState(0.35); // 0 = clean, 1 = dirty
  const [label, setLabel] = useState("Clean");

  useEffect(() => {
    const interval = setInterval(() => {
      setIntensity((prev) => {
        const delta = (Math.random() - 0.5) * 0.08;
        const next = Math.max(0, Math.min(1, prev + delta));
        setLabel(next < 0.35 ? "Clean" : next < 0.65 ? "Mixed" : "Dirty");
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const color = intensity < 0.35
    ? "var(--moss)"
    : intensity < 0.65
      ? "var(--topaz)"
      : "var(--witchberry)";

  const gCO2 = Math.round(120 + intensity * 380);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Breathing orb */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Outer glow rings */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${color}`, opacity: 0.15 }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.05, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{ border: `1.5px solid ${color}`, opacity: 0.2 }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.08, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        {/* Core orb */}
        <motion.div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 40% 40%, ${color}33, ${color}11)`,
            border: `1.5px solid ${color}44`,
            boxShadow: `0 0 20px ${color}22`,
          }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-xs font-mono font-bold tabular-nums" style={{ color }}>
            {gCO2}
          </span>
        </motion.div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-[10px] text-oak/40 uppercase tracking-wider">Current Grid</p>
        <p className="text-sm font-sub font-medium" style={{ color }}>{label}</p>
        <p className="text-[10px] text-oak/30 mt-0.5">{gCO2} gCO₂/kWh</p>
      </div>
    </div>
  );
}
