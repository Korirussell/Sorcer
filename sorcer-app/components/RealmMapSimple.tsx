"use client";

import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { geoPath as d3GeoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { X as XIcon } from "lucide-react";
import { createMapProjection, MAP_W, MAP_H } from "@/lib/mapProjection";

const US_TOPO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// ─── Data Center Definitions ─────────────────────────────────────────────────
interface DataCenter {
  name: string;
  provider: string;
  lat: number;
  lng: number;
  score: number;
  breakdown: Record<string, number>;
  lore: string;
}

const DATA_CENTERS: DataCenter[] = [
  { name: "The Dalles", provider: "Google", lat: 45.5946, lng: -121.1787, score: 92, breakdown: { hydro: 70, wind: 22, solar: 8 }, lore: "The Shire of Clean Compute — fed by the mighty Columbia River" },
  { name: "Council Bluffs", provider: "Google", lat: 41.2619, lng: -95.8608, score: 88, breakdown: { wind: 75, solar: 13, gas: 12 }, lore: "The Windfields of the West — turbines spin endlessly across the plains" },
  { name: "Ashburn", provider: "AWS us-east-1", lat: 39.0438, lng: -77.4874, score: 55, breakdown: { gas: 40, nuclear: 35, coal: 15, solar: 10 }, lore: "The Crossroads of Mixed Currents — where all data roads converge" },
  { name: "San Jose", provider: "Equinix", lat: 37.3382, lng: -121.8863, score: 62, breakdown: { solar: 45, gas: 35, wind: 20 }, lore: "The Sun-Touched Bazaar — bathed in California gold" },
  { name: "Phoenix", provider: "AWS / Azure", lat: 33.4484, lng: -112.074, score: 28, breakdown: { coal: 40, gas: 45, solar: 15 }, lore: "The Ashlands of Coal Power — scorched earth and burning servers" },
  { name: "Dallas", provider: "AWS / Azure", lat: 32.7767, lng: -96.797, score: 35, breakdown: { gas: 55, coal: 30, wind: 15 }, lore: "The Smog Furnaces of the South — oil country's digital outpost" },
  { name: "Chicago", provider: "Equinix", lat: 41.8781, lng: -87.6298, score: 58, breakdown: { nuclear: 40, gas: 30, wind: 20, coal: 10 }, lore: "The Windy Citadel — nuclear and wind in uneasy alliance" },
  { name: "Hillsboro", provider: "Intel / Cloud", lat: 45.5231, lng: -122.9898, score: 90, breakdown: { hydro: 80, wind: 10, solar: 10 }, lore: "The Verdant Spires — silicon forests fed by mountain streams" },
  { name: "Quincy", provider: "Microsoft", lat: 47.2343, lng: -119.8526, score: 95, breakdown: { hydro: 90, wind: 5, solar: 5 }, lore: "The Crystal Falls Sanctuary — purest waters, cleanest compute" },
  { name: "Mayes County", provider: "Google", lat: 36.302, lng: -95.1534, score: 32, breakdown: { coal: 55, gas: 30, wind: 15 }, lore: "The Darkened Hollows — coal dust settles on every rack" },
];

// ─── Classification ──────────────────────────────────────────────────────────
type Tier = "clean" | "medium" | "dirty";
function getTier(score: number): Tier {
  if (score > 70) return "clean";
  if (score >= 40) return "medium";
  return "dirty";
}

const TIER_COLORS: Record<Tier, string> = {
  clean: "#4B6A4C",
  medium: "#DDA059",
  dirty: "#B52121",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Cities
// ═══════════════════════════════════════════════════════════════════════════════

interface CityDef { name: string; lat: number; lng: number; size: "large" | "medium" | "small"; }
const CITIES: CityDef[] = [
  { name: "Atlanta", lat: 33.749, lng: -84.388, size: "large" },
  { name: "New York", lat: 40.7128, lng: -74.006, size: "large" },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437, size: "large" },
  { name: "Seattle", lat: 47.6062, lng: -122.3321, size: "medium" },
  { name: "Denver", lat: 39.7392, lng: -104.9903, size: "medium" },
  { name: "Miami", lat: 25.7617, lng: -80.1918, size: "medium" },
  { name: "Boston", lat: 42.3601, lng: -71.0589, size: "medium" },
  { name: "Savannah", lat: 32.0809, lng: -81.0912, size: "small" },
  { name: "Augusta", lat: 33.4735, lng: -82.0105, size: "small" },
  { name: "Macon", lat: 32.8407, lng: -83.6324, size: "small" },
  { name: "Athens", lat: 33.9519, lng: -83.3576, size: "small" },
];

// Last expedition: user in Atlanta → most recent call at The Dalles
const LAST_EXPEDITION = {
  from: { lat: 33.749, lng: -84.388 },
  to: DATA_CENTERS[0], // The Dalles
};

// ═══════════════════════════════════════════════════════════════════════════════
// US States (real boundaries via d3-geo + topojson)
// ═══════════════════════════════════════════════════════════════════════════════

interface GeoFeature {
  type: string;
  geometry: GeoPermissibleObjects;
  properties: Record<string, string>;
}

// Georgia FIPS code
const GEORGIA_FIPS = "13";

const USStates = memo(function USStates({ width, height }: { width: number; height: number }) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);

  useEffect(() => {
    fetch(US_TOPO_URL)
      .then((r) => r.json())
      .then((topo: Topology<{ states: GeometryCollection }>) => {
        const fc = feature(topo, topo.objects.states);
        setFeatures(fc.features as unknown as GeoFeature[]);
      })
      .catch((e) => console.error("Failed to load US states:", e));
  }, []);

  const projection = useMemo(
    () => createMapProjection(),
    []
  );

  const pathGen = useMemo(
    () => d3GeoPath().projection(projection),
    [projection]
  );

  if (features.length === 0) {
    return (
      <text x={width / 2} y={height / 2} textAnchor="middle" fill="#6B3710" fontSize="12" opacity={0.4}>
        Loading map…
      </text>
    );
  }

  return (
    <g>
      {features.map((f, i) => {
        const d = pathGen(f.geometry);
        if (!d) return null;
        const isGeorgia = f.properties?.["STATEFP"] === GEORGIA_FIPS || f.properties?.["name"] === "Georgia";
        return (
          <path key={i} d={d}
            fill={isGeorgia ? "#D4E8D5" : "#EDE8D6"}
            stroke="#6B3710"
            strokeWidth={isGeorgia ? 1.2 : 0.5}
            strokeOpacity={isGeorgia ? 0.6 : 0.35}
          />
        );
      })}
    </g>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// DC Detail Panel (click-to-expand)
// ═══════════════════════════════════════════════════════════════════════════════

function DCDetailPanel({ dc, onClose }: { dc: DataCenter; onClose: () => void }) {
  const tier = getTier(dc.score);
  const tierLabel = tier === "clean" ? "🌲 Clean" : tier === "dirty" ? "⛈️ Corrupted" : "🌫️ Mixed";
  const tierColor = tier === "clean" ? "text-moss" : tier === "dirty" ? "text-witchberry" : "text-topaz";
  const barColor = TIER_COLORS[tier];
  const entries = Object.entries(dc.breakdown);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const sourceColors: Record<string, string> = {
    hydro: "#4a8ab5", wind: "#6B9E6F", solar: "#DDA059", nuclear: "#9B7EC8",
    gas: "#A08060", coal: "#555555",
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-oak/10 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative specimen-card p-6 max-w-md w-full z-10"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-oak/5 text-oak/40 hover:text-oak transition-colors">
          <XIcon className="w-4 h-4" />
        </button>

        <h3 className="text-2xl font-header text-oak">{dc.name}</h3>
        <p className="text-sm font-sub text-oak-light/60">{dc.provider}</p>

        {/* Score bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-medium ${tierColor}`}>{tierLabel}</span>
            <span className={`text-lg font-header ${tierColor}`}>{dc.score}<span className="text-xs text-oak/40"> / 100</span></span>
          </div>
          <div className="h-2.5 rounded-full bg-oak/8 overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: barColor }}
              initial={{ width: 0 }} animate={{ width: `${dc.score}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
          </div>
        </div>

        {/* Energy breakdown donut */}
        <div className="mt-5 flex items-center gap-5">
          <svg width="80" height="80" viewBox="0 0 80 80">
            {(() => {
              let cum = 0;
              const r = 30;
              const circ = 2 * Math.PI * r;
              return entries.map(([source, pct]) => {
                const frac = pct / total;
                const offset = cum * circ;
                cum += frac;
                return (
                  <circle key={source} cx="40" cy="40" r={r} fill="none"
                    stroke={sourceColors[source] || "#999"} strokeWidth="10"
                    strokeDasharray={`${frac * circ} ${circ}`} strokeDashoffset={-offset}
                    transform="rotate(-90 40 40)" opacity={0.7} />
                );
              });
            })()}
          </svg>
          <div className="flex flex-col gap-1">
            {entries.map(([source, pct]) => (
              <div key={source} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: sourceColors[source] || "#999" }} />
                <span className="text-xs text-oak capitalize">{source}</span>
                <span className="text-[10px] text-oak/40 ml-auto">{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lore */}
        <p className="mt-4 text-xs font-sub italic text-oak/50 leading-relaxed">
          &ldquo;{dc.lore}&rdquo;
        </p>

      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tooltip (hover)
// ═══════════════════════════════════════════════════════════════════════════════

interface TooltipData { dc: DataCenter; x: number; y: number; }

function MapTooltip({ data }: { data: TooltipData }) {
  const tier = getTier(data.dc.score);
  const tierColor = tier === "clean" ? "text-moss" : tier === "dirty" ? "text-witchberry" : "text-topaz";

  return (
    <div className="fixed z-50 pointer-events-none" style={{ left: data.x, top: data.y - 12, transform: "translate(-50%, -100%)" }}>
      <div className="bg-parchment border border-oak/20 rounded-lg px-4 py-3 shadow-lg max-w-[220px]">
        <h4 className="font-header text-base text-oak leading-tight">{data.dc.name}</h4>
        <p className="text-[11px] font-sub text-oak-light/60 mt-0.5">{data.dc.provider}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`text-sm font-semibold ${tierColor}`}>{data.dc.score}</span>
          <span className="text-[10px] text-oak/40">/ 100 eco score</span>
        </div>
        <p className="mt-1.5 text-[10px] font-sub italic text-oak/40">&ldquo;{data.dc.lore}&rdquo;</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Compass Rose
// ═══════════════════════════════════════════════════════════════════════════════

function CompassRose({ x, y }: { x: number; y: number }) {
  const r = 18;
  const inner = 5;
  return (
    <g transform={`translate(${x},${y})`} opacity={0.35}>
      <circle cx="0" cy="0" r={r} fill="none" stroke="#6B3710" strokeWidth={0.6} />
      {[0, 90, 180, 270].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const ox = Math.sin(rad) * r;
        const oy = -Math.cos(rad) * r;
        const ix = Math.sin(rad) * inner;
        const iy = -Math.cos(rad) * inner;
        const px = Math.cos(rad) * 3;
        const py = Math.sin(rad) * 3;
        return (
          <polygon key={angle} points={`${ix + px},${iy + py} ${ox},${oy} ${ix - px},${iy - py}`}
            fill={angle === 0 ? "#B52121" : "#6B3710"} opacity={angle === 0 ? 0.7 : 0.4} />
        );
      })}
      <text x="0" y={-r - 3} textAnchor="middle" fill="#6B3710" fontSize="5" fontFamily="var(--font-sub)" opacity={0.6}>N</text>
      <text x={r + 4} y="2" textAnchor="middle" fill="#6B3710" fontSize="4" fontFamily="var(--font-sub)" opacity={0.5}>E</text>
      <text x="0" y={r + 6} textAnchor="middle" fill="#6B3710" fontSize="4" fontFamily="var(--font-sub)" opacity={0.5}>S</text>
      <text x={-r - 4} y="2" textAnchor="middle" fill="#6B3710" fontSize="4" fontFamily="var(--font-sub)" opacity={0.5}>W</text>
      <circle cx="0" cy="0" r="1.5" fill="#6B3710" opacity={0.4} />
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Title Cartouche
// ═══════════════════════════════════════════════════════════════════════════════

function TitleCartouche({ x, y, w }: { x: number; y: number; w: number }) {
  const bw = Math.min(w * 0.5, 280);
  const bh = 40;
  return (
    <g transform={`translate(${x - bw / 2},${y})`}>
      <path d={`M4,0 L${bw - 4},0 Q${bw},0 ${bw},4 L${bw},${bh - 4} Q${bw},${bh} ${bw - 4},${bh} L4,${bh} Q0,${bh} 0,${bh - 4} L0,4 Q0,0 4,0 Z`}
        fill="#F7F3E8" stroke="#6B3710" strokeWidth={0.8} opacity={0.9} />
      <rect x={3} y={3} width={bw - 6} height={bh - 6} rx={2} fill="none" stroke="#6B3710" strokeWidth={0.3} opacity={0.3} />
      <text x={bw / 2} y={18} textAnchor="middle" fill="#6B3710" fontSize="11" fontFamily="var(--font-header)" opacity={0.8}>
        The Realms of Digital Power
      </text>
      <text x={bw / 2} y={30} textAnchor="middle" fill="#6B3710" fontSize="5.5" fontFamily="var(--font-sub)" fontStyle="italic" opacity={0.4}>
        A cartograph of the great data sanctuaries
      </text>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Ornate Border
// ═══════════════════════════════════════════════════════════════════════════════

function OrnateBorder({ w, h }: { w: number; h: number }) {
  const m = 6;
  const c = 12;
  return (
    <g opacity={0.3}>
      <rect x={m} y={m} width={w - m * 2} height={h - m * 2} fill="none" stroke="#6B3710" strokeWidth={1} rx={2} />
      <rect x={m + 3} y={m + 3} width={w - m * 2 - 6} height={h - m * 2 - 6} fill="none" stroke="#6B3710" strokeWidth={0.4} rx={1} />
      {[[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]].map(([cx, cy, sx, sy], i) => (
        <g key={i} transform={`translate(${cx},${cy}) scale(${sx},${sy})`}>
          <path d={`M0,0 Q${c},0 ${c},${c}`} fill="none" stroke="#6B3710" strokeWidth={0.6} />
          <path d={`M2,2 Q${c - 2},2 ${c - 2},${c - 2}`} fill="none" stroke="#6B3710" strokeWidth={0.3} />
          <circle cx={c * 0.3} cy={c * 0.3} r={1} fill="#6B3710" opacity={0.4} />
        </g>
      ))}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Map Component (complete rewrite — single memoized projection, no scroll zoom)
// ═══════════════════════════════════════════════════════════════════════════════

// Particle trail colors
const PARTICLE_COLORS = ["#4B6A4C", "#DDA059", "#6B3710", "#5E8260", "#8B5E3C"];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  born: number;
}

function RealmMapInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedDC, setSelectedDC] = useState<DataCenter | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);
  const lastParticleTime = useRef(0);
  const [liveDCs, setLiveDCs] = useState<DataCenter[]>(DATA_CENTERS);

  // Try to fetch live grid scores from backend, merge with static DC data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/grid/map`
        );
        if (!resp.ok) return;
        const data = await resp.json();
        if (cancelled || !data?.regions) return;
        // Build a zone→score lookup from backend
        const scoreMap = new Map<string, number>();
        for (const r of data.regions) {
          if (r.zone && typeof r.score === "number") scoreMap.set(r.zone, r.score);
          if (r.name && typeof r.score === "number") scoreMap.set(r.name, r.score);
        }
        // Merge: update static DCs with live scores where zone matches
        const ZONE_MAP: Record<string, string> = {
          "The Dalles": "US-NW-PACW",      // Pacific NW (hydro-heavy)
          "Hillsboro": "US-NW-PACW",       // Pacific NW (hydro-heavy)
          "Quincy": "US-NW-PACW",           // Pacific NW (hydro-heavy)
          "Council Bluffs": "US-MIDW-MISO",
          "Chicago": "US-MIDW-MISO",
          "Ashburn": "US-NY-NYIS",
          "Dallas": "US-TEX-ERCO",
          "Phoenix": "US-SW-AZPS",          // Arizona grid
          "San Jose": "US-CAL-CISO",
          "Mayes County": "US-SE-SOCO",
        };
        setLiveDCs(DATA_CENTERS.map((dc) => {
          const zone = ZONE_MAP[dc.name];
          if (zone && scoreMap.has(zone)) {
            return { ...dc, score: scoreMap.get(zone)! };
          }
          return dc;
        }));
      } catch {
        // Backend offline — keep static data
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 1)), []);
  const handleZoomReset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  // Mouse wheel zoom (no modifier key needed)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.12 : 0.12;
      setZoom((z) => Math.min(Math.max(z + delta, 1), 3));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Pan handlers (click-and-drag)
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [isPanning]);

  const handlePanEnd = useCallback(() => setIsPanning(false), []);

  // Reset pan when zoom returns to 1
  useEffect(() => {
    if (zoom <= 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  // Fade out old particles
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setParticles((prev) => prev.filter((p) => now - p.born < 800));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Single stable projection — created once, used everywhere
  const projection = useMemo(
    () => createMapProjection(),
    []
  );

  // Project a [lng, lat] → [x, y] using the stable projection
  const project = useMemo(() => {
    return (lng: number, lat: number): [number, number] | null => {
      const result = projection([lng, lat]);
      return result ? [result[0], result[1]] : null;
    };
  }, [projection]);

  // Pre-compute all DC positions once
  const dcPositions = useMemo(() => {
    const map = new Map<string, [number, number]>();
    for (const dc of liveDCs) {
      const pt = project(dc.lng, dc.lat);
      if (pt) map.set(dc.name, pt);
    }
    return map;
  }, [project, liveDCs]);

  // Pre-compute city positions
  const cityPositions = useMemo(() => {
    const map = new Map<string, [number, number]>();
    for (const city of CITIES) {
      const pt = project(city.lng, city.lat);
      if (pt) map.set(city.name, pt);
    }
    return map;
  }, [project]);

  // Expedition trail points
  const expedFrom = useMemo(() => project(LAST_EXPEDITION.from.lng, LAST_EXPEDITION.from.lat), [project]);
  const expedTo = useMemo(() => dcPositions.get(LAST_EXPEDITION.to.name) ?? null, [dcPositions]);

  // Light parallax for mouse + particle spawning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x: cx * 10, y: cy * 10 });

    // Spawn particle (throttled to every 60ms, max 25)
    const now = Date.now();
    if (now - lastParticleTime.current > 60) {
      lastParticleTime.current = now;
      const svgX = ((e.clientX - rect.left) / rect.width) * MAP_W;
      const svgY = ((e.clientY - rect.top) / rect.height) * MAP_H;
      const color = PARTICLE_COLORS[particleIdRef.current % PARTICLE_COLORS.length];
      particleIdRef.current++;
      setParticles((prev) => {
        const next = [...prev, { id: particleIdRef.current, x: svgX, y: svgY, color, born: now }];
        return next.length > 25 ? next.slice(-25) : next;
      });
    }
  }, []);

  return (
    <div className="relative w-full">
      {/* SVG filters / gradients */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="realm-wobble" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" result="turbulence" seed="2" />
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <radialGradient id="coffee-stain"><stop offset="0%" stopColor="#6B3710" stopOpacity="0.06" /><stop offset="70%" stopColor="#6B3710" stopOpacity="0.03" /><stop offset="100%" stopColor="#6B3710" stopOpacity="0" /></radialGradient>
        </defs>
      </svg>

      {/* Map container — 3D perspective wrapper */}
      <div style={{ perspective: "1200px", transformStyle: "preserve-3d" }}>
      <motion.div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden select-none"
        style={{
          border: "2px solid rgba(107, 55, 16, 0.25)",
          background: "linear-gradient(135deg, #F7F3E8 0%, #EDE8D6 50%, #E8E0CC 100%)",
          aspectRatio: `${MAP_W} / ${MAP_H}`,
          transform: isPanning ? "none" : `rotateX(${mousePos.y * 0.3}deg) rotateY(${-mousePos.x * 0.3}deg)`,
          transformOrigin: "center center",
          boxShadow: isPanning ? "0 4px 20px rgba(107,55,16,0.12)" : `${-mousePos.x * 2}px ${-mousePos.y * 2}px 20px rgba(107,55,16,0.12)`,
          transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
          cursor: "none",
        }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        onMouseMove={(e) => { handleMouseMove(e); handlePanMove(e); }}
        onMouseDown={handlePanStart}
        onMouseUp={handlePanEnd}
        onMouseLeave={() => { setTooltip(null); setMousePos({ x: 0, y: 0 }); handlePanEnd(); }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 0.3s ease-out",
          }}
        >
          {/* Coffee stain marks */}
          <circle cx={MAP_W * 0.08} cy={MAP_H * 0.85} r={25} fill="url(#coffee-stain)" />
          <circle cx={MAP_W * 0.92} cy={MAP_H * 0.12} r={18} fill="url(#coffee-stain)" />

          {/* US states */}
          <USStates width={MAP_W} height={MAP_H} />

          {/* Region labels (mid parallax layer) */}
          <g style={{ transform: `translate(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px)` }}>
          {[
            { name: "The Crystal Falls", lng: -121, lat: 47, rotate: -5 },
            { name: "The Golden Coast", lng: -120, lat: 37, rotate: -8 },
            { name: "The Ashlands", lng: -110, lat: 34 },
            { name: "The Wind Plains", lng: -98, lat: 42 },
            { name: "The Peach Groves", lng: -83.5, lat: 32.8, rotate: 3 },
            { name: "The Iron Coast", lng: -74, lat: 41.5, rotate: -8 },
            { name: "Here Be Dragons", lng: -105, lat: 31, rotate: -5 },
          ].map((label) => {
            const pt = project(label.lng, label.lat);
            if (!pt) return null;
            return (
              <text key={label.name} x={pt[0]} y={pt[1]} textAnchor="middle" fill="#6B3710"
                fontSize="9" fontFamily="var(--font-sub)" fontStyle="italic"
                opacity={label.name === "Here Be Dragons" ? 0.15 : 0.22}
                transform={label.rotate ? `rotate(${label.rotate},${pt[0]},${pt[1]})` : undefined}>
                {label.name}
              </text>
            );
          })}
          </g>

          {/* City illustrations */}
          {CITIES.map((city) => {
            const pt = cityPositions.get(city.name);
            if (!pt) return null;
            const isGA = ["Atlanta", "Savannah", "Augusta", "Macon", "Athens"].includes(city.name);
            return (
              <g key={city.name}>
                {/* Building silhouette */}
                {city.size === "large" && (
                  <g transform={`translate(${pt[0]},${pt[1]})`} opacity={isGA ? 0.35 : 0.18}>
                    <rect x={-6} y={-12} width={4} height={12} fill="#6B3710" rx={0.5} />
                    <rect x={-1} y={-16} width={3} height={16} fill="#6B3710" rx={0.5} />
                    <polygon points="0.5,-16 -1,-18 2,-18" fill="#6B3710" />
                    <rect x={3} y={-10} width={4} height={10} fill="#6B3710" rx={0.5} />
                  </g>
                )}
                {city.size === "medium" && (
                  <g transform={`translate(${pt[0]},${pt[1]})`} opacity={0.18}>
                    <rect x={-3} y={-10} width={3} height={10} fill="#6B3710" rx={0.5} />
                    <rect x={1} y={-13} width={3} height={13} fill="#6B3710" rx={0.5} />
                  </g>
                )}
                {city.size === "small" && (
                  <g transform={`translate(${pt[0]},${pt[1]})`} opacity={isGA ? 0.3 : 0.15}>
                    <rect x={-2} y={-6} width={4} height={6} fill="#6B3710" rx={0.5} />
                  </g>
                )}
                <text x={pt[0]} y={pt[1] + 9} textAnchor="middle" fill={isGA ? "#4B6A4C" : "#6B3710"}
                  fontSize={city.size === "large" ? "8" : city.size === "medium" ? "6.5" : "5.5"} fontFamily="var(--font-sub)" fontStyle="italic"
                  opacity={isGA ? 0.55 : 0.3} fontWeight={isGA ? "bold" : "normal"}>
                  {city.name}
                </text>
              </g>
            );
          })}

          {/* Last Expedition Trail (Atlanta → The Dalles) */}
          {expedFrom && expedTo && (
            <g>
              <motion.path
                d={`M${expedFrom[0]},${expedFrom[1]} Q${(expedFrom[0] + expedTo[0]) / 2},${Math.min(expedFrom[1], expedTo[1]) - 40} ${expedTo[0]},${expedTo[1]}`}
                fill="none" stroke="#B52121" strokeWidth={1.2} strokeDasharray="5,4" opacity={0.4}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, ease: "easeInOut" }}
              />
              {/* Waypoint dots */}
              {[0.25, 0.5, 0.75].map((t) => {
                const midX = (expedFrom[0] + expedTo[0]) / 2;
                const midY = Math.min(expedFrom[1], expedTo[1]) - 40;
                const x = expedFrom[0] * (1 - t) * (1 - t) + 2 * midX * t * (1 - t) + expedTo[0] * t * t;
                const y = expedFrom[1] * (1 - t) * (1 - t) + 2 * midY * t * (1 - t) + expedTo[1] * t * t;
                return <circle key={t} cx={x} cy={y} r={1.8} fill="#B52121" opacity={0.25} />;
              })}
              {/* "You are here" */}
              <g transform={`translate(${expedFrom[0]},${expedFrom[1]})`}>
                <motion.circle r={5} fill="#4B6A4C" stroke="#6B3710" strokeWidth={0.8} opacity={0.8}
                  animate={{ r: [5, 6.5, 5] }} transition={{ duration: 2, repeat: Infinity }} />
                <text y={-10} textAnchor="middle" fill="#4B6A4C" fontSize="5" fontFamily="var(--font-sub)" fontStyle="italic" fontWeight="bold" opacity={0.7}>
                  You are here
                </text>
              </g>
              {/* "Last Expedition" label */}
              <motion.text x={expedTo[0]} y={expedTo[1] - 30} textAnchor="middle" fill="#B52121" fontSize="5" fontFamily="var(--font-sub)" fontStyle="italic" opacity={0.5}
                animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 3, repeat: Infinity }}>
                Last Expedition
              </motion.text>
            </g>
          )}

          {/* ── Data Center Markers (STATIC — no parallax for clickability) ── */}
          <g>
            {liveDCs.map((dc) => {
              const pt = dcPositions.get(dc.name);
              if (!pt) return null;
              const [x, y] = pt;
              const tier = getTier(dc.score);
              const color = TIER_COLORS[tier];

              return (
                <g
                  key={dc.name}
                  onMouseEnter={(evt: React.MouseEvent) => {
                    setTooltip({ dc, x: evt.clientX, y: evt.clientY });
                  }}
                  onMouseMove={(evt: React.MouseEvent) => {
                    setTooltip({ dc, x: evt.clientX, y: evt.clientY });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={(e) => { e.stopPropagation(); setSelectedDC(dc); }}
                  style={{ cursor: "pointer" }}
                >
                  {/* Outer pulse ring */}
                  <motion.circle cx={x} cy={y} r={20} fill={color} opacity={0.08}
                    animate={{ r: [20, 26, 20], opacity: [0.08, 0.03, 0.08] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />

                  {/* Mid glow */}
                  <circle cx={x} cy={y} r={14} fill={color} opacity={0.12} />

                  {/* Core dot */}
                  <motion.circle cx={x} cy={y} r={8} fill={color} stroke="#F7F3E8" strokeWidth={2}
                    animate={{ r: [8, 9.2, 8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />

                  {/* Score number inside dot */}
                  <text x={x} y={y + 2.5} textAnchor="middle" fill="#F7F3E8" fontSize="7" fontWeight="bold" fontFamily="var(--font-code)">
                    {dc.score}
                  </text>

                  {/* Label below */}
                  <text x={x} y={y + 20} textAnchor="middle" fill="#6B3710" fontSize="9" fontFamily="var(--font-sub)" fontWeight="bold" opacity={0.7}>
                    {dc.name}
                  </text>
                  <text x={x} y={y + 29} textAnchor="middle" fill="#6B3710" fontSize="6" fontFamily="var(--font-sub)" opacity={0.35}>
                    {dc.provider}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Sea creature (top parallax layer) */}
          <g style={{ transform: `translate(${mousePos.x * 2.5}px, ${mousePos.y * 2.5}px)` }}>
            {/* Sea serpent */}
            <motion.g transform={`translate(${MAP_W * 0.04},${MAP_H * 0.35})`} opacity={0.1}
              animate={{ y: [0, -3, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
              <path d="M0,0 C5,-8 10,-2 15,-10 C20,-2 25,-8 30,0" fill="none" stroke="#6B3710" strokeWidth={0.8} />
              <circle cx="3" cy="-2" r="1" fill="#6B3710" />
            </motion.g>
            {/* Whale */}
            <motion.g transform={`translate(${MAP_W * 0.06},${MAP_H * 0.65})`} opacity={0.08}
              animate={{ y: [0, -4, 0], x: [0, 3, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}>
              <ellipse cx={0} cy={0} rx={14} ry={5} fill="#6B3710" />
              <path d="M13,-1 L20,-6 L20,4 Z" fill="#6B3710" opacity={0.8} />
              <circle cx={-8} cy={-1} r={1} fill="#F7F3E8" />
            </motion.g>
          </g>

          {/* Ocean labels */}
          <text x={MAP_W * 0.04} y={MAP_H * 0.15} textAnchor="start" fill="#6B3710" fontSize="6" fontFamily="var(--font-sub)" fontStyle="italic" opacity={0.12}>
            The Western Seas
          </text>
          <text x={MAP_W * 0.94} y={MAP_H * 0.4} textAnchor="end" fill="#6B3710" fontSize="5.5" fontFamily="var(--font-sub)" fontStyle="italic" opacity={0.1}>
            The Atlantic Depths
          </text>
          <text x={MAP_W * 0.5} y={MAP_H * 0.97} textAnchor="middle" fill="#6B3710" fontSize="5" fontFamily="var(--font-sub)" fontStyle="italic" opacity={0.08}>
            The Gulf of Forgotten Servers
          </text>

          {/* Particle cursor trail */}
          <g className="pointer-events-none">
            {particles.map((p) => {
              const age = (Date.now() - p.born) / 800;
              const opacity = Math.max(0, 0.3 * (1 - age));
              const scale = 1 - age * 0.5;
              return (
                <circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r={2.5 * scale}
                  fill={p.color}
                  opacity={opacity}
                />
              );
            })}
          </g>

          {/* Ornate Border */}
          <OrnateBorder w={MAP_W} h={MAP_H} />

          {/* Title Cartouche */}
          <TitleCartouche x={MAP_W / 2} y={12} w={MAP_W} />

          {/* Compass Rose (STATIC) */}
          <CompassRose x={MAP_W * 0.88} y={MAP_H * 0.82} />

          {/* Scale Bar */}
          <g transform={`translate(${MAP_W * 0.05},${MAP_H * 0.92})`} opacity={0.35}>
            <line x1="0" y1="0" x2="60" y2="0" stroke="#6B3710" strokeWidth={0.6} />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#6B3710" strokeWidth={0.6} />
            <line x1="60" y1="-3" x2="60" y2="3" stroke="#6B3710" strokeWidth={0.6} />
            <text x="30" y="9" textAnchor="middle" fill="#6B3710" fontSize="4" fontFamily="var(--font-sub)">500 Digital Leagues</text>
          </g>
        </svg>
      </motion.div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 3}
          className="w-8 h-8 rounded-lg bg-parchment border border-oak/15 text-oak hover:bg-parchment-dark transition-all duration-200 flex items-center justify-center text-sm font-mono shadow-sm disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          className="w-8 h-8 rounded-lg bg-parchment border border-oak/15 text-oak hover:bg-parchment-dark transition-all duration-200 flex items-center justify-center text-sm font-mono shadow-sm disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
          aria-label="Zoom out"
        >
          −
        </button>
        {zoom > 1 && (
          <button
            onClick={handleZoomReset}
            className="w-8 h-8 rounded-lg bg-parchment border border-oak/15 text-oak hover:bg-parchment-dark transition-all duration-200 flex items-center justify-center text-[9px] font-sub shadow-sm active:scale-95"
            aria-label="Reset zoom"
          >
            1×
          </button>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && <MapTooltip data={tooltip} />}

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedDC && <DCDetailPanel dc={selectedDC} onClose={() => setSelectedDC(null)} />}
      </AnimatePresence>

      {/* Animated Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        {/* Clean — swaying tree */}
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <motion.g
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "8px 14px" }}
            >
              <rect x="7" y="8" width="2" height="6" rx="0.5" fill="#6B3710" opacity={0.4} />
              <circle cx="8" cy="6" r="4" fill="#4B6A4C" opacity={0.6} />
              <circle cx="6" cy="5" r="2.5" fill="#5E8260" opacity={0.5} />
            </motion.g>
          </svg>
          <span className="text-xs text-oak/50">Clean</span>
        </div>
        {/* Mixed — drifting fog */}
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <motion.g
              animate={{ x: [-1, 1, -1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <ellipse cx="8" cy="8" rx="5" ry="2" fill="#DDA059" opacity={0.3} />
              <ellipse cx="6" cy="10" rx="4" ry="1.5" fill="#DDA059" opacity={0.2} />
              <ellipse cx="10" cy="6" rx="3" ry="1.5" fill="#DDA059" opacity={0.25} />
            </motion.g>
          </svg>
          <span className="text-xs text-oak/50">Mixed</span>
        </div>
        {/* Dirty — storm cloud with lightning */}
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <ellipse cx="8" cy="6" rx="5" ry="3" fill="#B52121" opacity={0.3} />
            <ellipse cx="6" cy="5" rx="3" ry="2.5" fill="#B52121" opacity={0.25} />
            <motion.path
              d="M8 9 L7 12 L9 11 L8 14"
              stroke="#DDA059"
              strokeWidth={1}
              fill="none"
              strokeLinecap="round"
              animate={{ opacity: [0, 0.8, 0, 0, 0] }}
              transition={{ duration: 2, repeat: Infinity, times: [0, 0.05, 0.1, 0.9, 1] }}
            />
          </svg>
          <span className="text-xs text-oak/50">Dirty</span>
        </div>
      </div>
      <p className="text-center text-[10px] text-oak/25 mt-2 font-sub">
        Click any data center for details
      </p>
    </div>
  );
}

export const RealmMap = memo(RealmMapInner);
