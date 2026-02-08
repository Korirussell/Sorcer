"use client";

import { useEffect, useState } from "react";
import { Leaf, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEnergy } from "@/context/EnergyContext";
import { getAggregateStats } from "@/lib/localChatStore";

interface GridRegion {
  region: string;
  status: "clean" | "medium" | "dirty";
  gCO2: number;
}

const FALLBACK_REGIONS: GridRegion[] = [
  { region: "Pacific NW", status: "clean", gCO2: 142 },
  { region: "Midwest", status: "medium", gCO2: 312 },
  { region: "Southeast", status: "clean", gCO2: 198 },
  { region: "Northeast", status: "medium", gCO2: 285 },
  { region: "Southwest", status: "dirty", gCO2: 478 },
];

function scoreToStatus(score: number): "clean" | "medium" | "dirty" {
  if (score >= 70) return "clean";
  if (score >= 40) return "medium";
  return "dirty";
}

function statusColor(status: "clean" | "medium" | "dirty") {
  return status === "clean" ? "#4B6A4C" : status === "dirty" ? "#B52121" : "#DDA059";
}

export function CarbonIndicator() {
  const { isAutoMode } = useEnergy();
  const [carbonSaved, setCarbonSaved] = useState(0);
  const [tick, setTick] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [gridRegions, setGridRegions] = useState<GridRegion[]>(FALLBACK_REGIONS);

  // Load real aggregate stats from localStorage
  useEffect(() => {
    const stats = getAggregateStats();
    setCarbonSaved(stats.totalCarbonSaved_g / 1000); // convert g to kg
  }, []);

  // Try to fetch live grid data from backend
  useEffect(() => {
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/grid/map`;
    fetch(url)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.regions) return;
        const ZONE_LABELS: Record<string, string> = {
          "US-CAL-CISO": "Pacific NW",
          "US-MIDW-MISO": "Midwest",
          "US-SE-SOCO": "Southeast",
          "US-NY-NYIS": "Northeast",
          "US-TEX-ERCO": "Southwest",
        };
        const live: GridRegion[] = data.regions
          .filter((r: any) => ZONE_LABELS[r.zone])
          .map((r: any) => ({
            region: ZONE_LABELS[r.zone],
            status: scoreToStatus(r.score),
            gCO2: Math.round(r.carbon_intensity_g_per_kwh ?? r.score * 5),
          }));
        if (live.length > 0) setGridRegions(live);
      })
      .catch(() => { /* keep fallback */ });
  }, []);

  // Periodically refresh stats from localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = getAggregateStats();
      const newVal = stats.totalCarbonSaved_g / 1000;
      setCarbonSaved((prev) => {
        if (Math.abs(newVal - prev) > 0.001) {
          setTick(true);
          setTimeout(() => setTick(false), 800);
          return newVal;
        }
        return prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div data-tour="carbon-indicator" className="fixed top-4 right-4 z-50">
      {/* Collapsed pill */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="glass-panel rounded-2xl px-4 py-2.5 shadow-specimen flex items-center gap-3 cursor-pointer hover:shadow-specimen-hover transition-all duration-200 active:scale-[0.98]"
      >
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

        {/* Chevron */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3 text-oak/30" />
        </motion.div>
      </button>

      {/* Expanded Live Grid Status panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden mt-1.5"
          >
            <div className="glass-panel rounded-2xl px-4 py-3 shadow-specimen">
              <p className="text-[10px] text-oak/40 uppercase tracking-wider mb-2.5">Live Grid Status</p>
              <div className="space-y-2">
                {gridRegions.map((grid) => (
                  <div key={grid.region} className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background: statusColor(grid.status),
                        boxShadow: `0 0 6px ${statusColor(grid.status)}55`,
                      }}
                    />
                    <span className="text-xs text-oak flex-1">{grid.region}</span>
                    <span className="text-[10px] text-oak/40 font-mono tabular-nums">{grid.gCO2}g</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
