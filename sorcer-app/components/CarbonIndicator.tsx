"use client";

import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";
import { useEnergy } from "@/context/EnergyContext";

export function CarbonIndicator() {
  const { isAutoMode } = useEnergy();
  const [carbonSaved, setCarbonSaved] = useState(127.5);
  const [tick, setTick] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setCarbonSaved((prev) => prev + Math.random() * 0.1);
        setTick(true);
        setTimeout(() => setTick(false), 800);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 glass-panel rounded-2xl px-4 py-2.5 shadow-specimen flex items-center gap-3">
      {/* Eco dot */}
      <div className={`w-2 h-2 rounded-full ${isAutoMode ? "bg-moss" : "bg-topaz"} ${tick ? "animate-ping" : ""}`} />

      {/* Counter */}
      <div className="flex items-center gap-1.5">
        <Leaf className="w-3.5 h-3.5 text-moss" />
        <span className={`text-sm font-medium tabular-nums transition-colors duration-300 ${tick ? "text-moss" : "text-oak"}`}>
          {carbonSaved.toFixed(1)}
        </span>
        <span className="text-[10px] text-oak-light/50">kg CO₂</span>
      </div>
    </div>
  );
}
