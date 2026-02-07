"use client";

import { useState, useEffect, memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { motion } from "framer-motion";

// ─── US States TopoJSON ──────────────────────────────────────────────────────
const US_TOPO = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

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
  { name: "The Dalles", provider: "Google", lat: 45.5946, lng: -121.1787, score: 92, breakdown: { hydro: 70, wind: 22 }, lore: "The Shire of Clean Compute" },
  { name: "Council Bluffs", provider: "Google", lat: 41.2619, lng: -95.8608, score: 88, breakdown: { wind: 75, solar: 13 }, lore: "The Windfields of the West" },
  { name: "Ashburn", provider: "AWS us-east-1", lat: 39.0438, lng: -77.4874, score: 55, breakdown: { gas: 40, nuclear: 35, coal: 15 }, lore: "The Crossroads of Mixed Currents" },
  { name: "San Jose", provider: "Equinix", lat: 37.3382, lng: -121.8863, score: 62, breakdown: { solar: 45, gas: 35 }, lore: "The Sun-Touched Bazaar" },
  { name: "Phoenix", provider: "AWS / Azure", lat: 33.4484, lng: -112.074, score: 28, breakdown: { coal: 40, gas: 45 }, lore: "The Ashlands of Coal Power" },
  { name: "Dallas", provider: "AWS / Azure", lat: 32.7767, lng: -96.797, score: 35, breakdown: { gas: 55, coal: 30 }, lore: "The Smog Furnaces of the South" },
  { name: "Chicago", provider: "Equinix", lat: 41.8781, lng: -87.6298, score: 58, breakdown: { nuclear: 40, gas: 30, wind: 20 }, lore: "The Windy Citadel" },
  { name: "Hillsboro", provider: "Intel / Cloud", lat: 45.5231, lng: -122.9898, score: 90, breakdown: { hydro: 80, wind: 10 }, lore: "The Verdant Spires" },
  { name: "Quincy", provider: "Microsoft", lat: 47.2343, lng: -119.8526, score: 95, breakdown: { hydro: 90, wind: 5 }, lore: "The Crystal Falls Sanctuary" },
  { name: "Mayes County", provider: "Google", lat: 36.302, lng: -95.1534, score: 32, breakdown: { coal: 55, gas: 30 }, lore: "The Darkened Hollows" },
];

// ─── Classification ──────────────────────────────────────────────────────────
type Tier = "clean" | "medium" | "dirty";
function getTier(score: number): Tier {
  if (score > 70) return "clean";
  if (score >= 40) return "medium";
  return "dirty";
}

// ─── Trade Routes (connect nearby DCs) ──────────────────────────────────────
const TRADE_ROUTES: [number, number][] = [
  [0, 7], // Dalles ↔ Hillsboro
  [7, 8], // Hillsboro ↔ Quincy
  [1, 6], // Council Bluffs ↔ Chicago
  [1, 9], // Council Bluffs ↔ Mayes County
  [9, 5], // Mayes County ↔ Dallas
  [4, 5], // Phoenix ↔ Dallas
  [3, 4], // San Jose ↔ Phoenix
  [2, 6], // Ashburn ↔ Chicago
];

// ═══════════════════════════════════════════════════════════════════════════════
// SVG Decorations
// ═══════════════════════════════════════════════════════════════════════════════

function HandDrawnTree({ x, y, scale = 1, delay = 0 }: { x: number; y: number; scale?: number; delay?: number }) {
  const [animDuration, setAnimDuration] = useState(6);
  const [animDelay, setAnimDelay] = useState(0);

  useEffect(() => {
    setAnimDuration(4 + Math.random() * 2);
    setAnimDelay(Math.random() * 2);
  }, []);

  return (
    <motion.g
      transform={`translate(${x}, ${y}) scale(${scale})`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      <motion.g
        animate={{ rotate: [0, 1.5, -1, 0.5, 0] }}
        transition={{ duration: animDuration, repeat: Infinity, ease: "easeInOut", delay: animDelay }}
        style={{ transformOrigin: `0px 0px` }}
      >
        {/* Trunk */}
        <line x1="0" y1="0" x2="0" y2="-6" stroke="#6B3710" strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
        {/* Canopy */}
        <path d="M0,-6 L-4,-2 L-2,-4 L-5,0 L0,-10 L5,0 L2,-4 L4,-2 Z" fill="#4B6A4C" opacity={0.75} />
      </motion.g>
    </motion.g>
  );
}

function VineFlourish({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <motion.path
      d={`M${x},${y} c${flip ? "-" : ""}3,-2 ${flip ? "-" : ""}5,-1 ${flip ? "-" : ""}6,-4 c${flip ? "-" : ""}1,2 ${flip ? "-" : ""}3,3 ${flip ? "-" : ""}2,5`}
      stroke="#4B6A4C"
      strokeWidth={0.8}
      fill="none"
      opacity={0.5}
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.5, delay: 0.5 }}
    />
  );
}

function StormCloud({ x, y, size = 1, opacity = 0.5, delay = 0 }: { x: number; y: number; size?: number; opacity?: number; delay?: number }) {
  const [animDuration, setAnimDuration] = useState(8);

  useEffect(() => {
    setAnimDuration(6 + Math.random() * 3);
  }, []);

  return (
    <motion.g
      transform={`translate(${x}, ${y}) scale(${size})`}
      animate={{ x: [0, 3, -2, 1, 0] }}
      transition={{ duration: animDuration, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <ellipse cx="0" cy="0" rx="8" ry="4" fill="#3a3a3a" opacity={opacity} />
      <ellipse cx="-4" cy="-1" rx="5" ry="3" fill="#555" opacity={opacity * 0.8} />
      <ellipse cx="4" cy="-1.5" rx="6" ry="3.5" fill="#4a2020" opacity={opacity * 0.6} />
    </motion.g>
  );
}

function LightningBolt({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.path
      d={`M${x},${y} l2,4 l-1.5,0 l1.5,5`}
      stroke="#DDA059"
      strokeWidth={0.8}
      fill="none"
      strokeLinecap="round"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0, 0.9, 0, 0, 0, 0.7, 0] }}
      transition={{ duration: 4, repeat: Infinity, delay }}
    />
  );
}

function FogWisp({ x, y }: { x: number; y: number }) {
  return (
    <motion.ellipse
      cx={x}
      cy={y}
      rx={10}
      ry={3}
      fill="#A0A088"
      opacity={0.15}
      animate={{ x: [0, 4, -2, 0], opacity: [0.15, 0.2, 0.12, 0.15] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function SparseTree({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.g
      transform={`translate(${x}, ${y})`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.5 }}
      transition={{ duration: 0.6, delay }}
    >
      <line x1="0" y1="0" x2="0" y2="-4" stroke="#6B3710" strokeWidth={0.8} strokeLinecap="round" opacity={0.5} />
      <path d="M0,-4 L-2,-1 L0,-7 L2,-1 Z" fill="#A0A088" opacity={0.5} />
    </motion.g>
  );
}

// ─── Compass Rose ────────────────────────────────────────────────────────────
function CompassRose({ x, y }: { x: number; y: number }) {
  const r = 18;
  const inner = 6;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Outer circle */}
      <circle cx="0" cy="0" r={r} fill="none" stroke="#6B3710" strokeWidth={0.6} opacity={0.4} />
      <circle cx="0" cy="0" r={r - 2} fill="none" stroke="#6B3710" strokeWidth={0.3} opacity={0.3} />
      {/* Cardinal points */}
      {[0, 90, 180, 270].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const ox = Math.sin(rad) * r;
        const oy = -Math.cos(rad) * r;
        const ix = Math.sin(rad) * inner;
        const iy = -Math.cos(rad) * inner;
        const perpX = Math.cos(rad) * 3;
        const perpY = Math.sin(rad) * 3;
        return (
          <g key={angle}>
            <polygon
              points={`${ix + perpX},${iy + perpY} ${ox},${oy} ${ix - perpX},${iy - perpY}`}
              fill={angle === 0 ? "#B52121" : "#6B3710"}
              opacity={angle === 0 ? 0.7 : 0.4}
            />
          </g>
        );
      })}
      {/* Labels */}
      <text x="0" y={-r - 3} textAnchor="middle" fill="#6B3710" fontSize="5" fontFamily="var(--font-sub)" opacity={0.6}>N</text>
      <text x={r + 4} y="1.5" textAnchor="middle" fill="#6B3710" fontSize="4" fontFamily="var(--font-sub)" opacity={0.5}>E</text>
      <text x="0" y={r + 6} textAnchor="middle" fill="#6B3710" fontSize="4" fontFamily="var(--font-sub)" opacity={0.5}>S</text>
      <text x={-r - 4} y="1.5" textAnchor="middle" fill="#6B3710" fontSize="4" fontFamily="var(--font-sub)" opacity={0.5}>W</text>
      {/* Center dot */}
      <circle cx="0" cy="0" r="1.5" fill="#6B3710" opacity={0.5} />
    </g>
  );
}

// ─── Marker Decorations per Tier ─────────────────────────────────────────────
function CleanDecorations() {
  return (
    <g>
      <HandDrawnTree x={0} y={-2} scale={0.9} delay={0} />
      <HandDrawnTree x={-6} y={1} scale={0.7} delay={0.15} />
      <HandDrawnTree x={5} y={0} scale={0.75} delay={0.25} />
      <HandDrawnTree x={-3} y={3} scale={0.6} delay={0.35} />
      <HandDrawnTree x={4} y={4} scale={0.55} delay={0.4} />
      <VineFlourish x={-8} y={2} />
      <VineFlourish x={6} y={3} flip />
    </g>
  );
}

function DirtyDecorations() {
  return (
    <g>
      <StormCloud x={0} y={-12} size={1.1} opacity={0.6} delay={0} />
      <StormCloud x={-5} y={-9} size={0.8} opacity={0.4} delay={0.5} />
      <StormCloud x={6} y={-10} size={0.9} opacity={0.5} delay={1} />
      <LightningBolt x={-2} y={-6} delay={1.5} />
      <LightningBolt x={4} y={-5} delay={3} />
      {/* Smoke wisp */}
      <motion.path
        d="M0,0 C-1,-3 1,-5 -1,-8"
        stroke="#555"
        strokeWidth={0.6}
        fill="none"
        opacity={0.3}
        animate={{ y: [0, -2, 0], opacity: [0.3, 0.15, 0.3] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
    </g>
  );
}

function MediumDecorations() {
  return (
    <g>
      <FogWisp x={0} y={-4} />
      <FogWisp x={-5} y={-2} />
      <SparseTree x={-4} y={1} delay={0.2} />
      <SparseTree x={3} y={2} delay={0.4} />
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tooltip
// ═══════════════════════════════════════════════════════════════════════════════

interface TooltipData {
  dc: DataCenter;
  x: number;
  y: number;
}

function MapTooltip({ data }: { data: TooltipData }) {
  const tier = getTier(data.dc.score);
  const tierLabel = tier === "clean" ? "🌲 Clean" : tier === "dirty" ? "⛈️ Corrupted" : "🌫️ Mixed";
  const tierColor = tier === "clean" ? "text-moss" : tier === "dirty" ? "text-witchberry" : "text-topaz";

  return (
    <div
      className="fixed z-100 pointer-events-none"
      style={{ left: data.x + 16, top: data.y - 20 }}
    >
      <div className="bg-[#F7F3E8] border border-[#6B3710]/30 rounded-lg px-4 py-3 shadow-lg max-w-[220px]"
        style={{ filter: "url(#hand-drawn-border)" }}
      >
        <h4 className="font-header text-base text-oak leading-tight">{data.dc.name}</h4>
        <p className="text-[11px] font-sub text-oak-light/60 mt-0.5">{data.dc.provider}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`text-sm font-semibold ${tierColor}`}>{data.dc.score}</span>
          <span className="text-[10px] text-oak/40">/ 100</span>
          <span className={`text-[10px] font-medium ${tierColor}`}>{tierLabel}</span>
        </div>
        {/* Energy breakdown */}
        <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
          {Object.entries(data.dc.breakdown).map(([source, pct]) => (
            <span key={source} className="text-[9px] text-oak/50">
              {source} {pct}%
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] font-sub italic text-oak/40 leading-snug">
          &ldquo;{data.dc.lore}&rdquo;
        </p>
      </div>
    </div>
  );
}

// ─── Wrapper Components to avoid Marker destructuring issues ───────────────────────
function CompassRoseWrapper({ lng, lat }: { lng: number; lat: number }) {
  return (
    <Marker coordinates={[lng, lat]}>
      <CompassRose x={0} y={0} />
    </Marker>
  );
}

function TextLabel({ 
  lng, 
  lat, 
  text, 
  fontSize = "6", 
  opacity = 0.18, 
  rotate = 0 
}: { 
  lng: number; 
  lat: number; 
  text: string; 
  fontSize?: string; 
  opacity?: number; 
  rotate?: number; 
}) {
  return (
    <Marker coordinates={[lng, lat]}>
      <text
        textAnchor="middle"
        fill="#6B3710"
        fontSize={fontSize}
        fontFamily="var(--font-sub)"
        fontStyle="italic"
        opacity={opacity}
        transform={rotate !== 0 ? `rotate(${rotate})` : undefined}
      >
        {text}
      </text>
    </Marker>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Map Component
// ═══════════════════════════════════════════════════════════════════════════════

function RealmMapInner() {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  return (
    <div className="relative w-full">
      {/* ── SVG Filters ── */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="realm-wobble" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="3" result="turbulence" seed="2" />
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* ── Map Title ── */}
      <div className="text-center mb-4">
        <h2 className="text-3xl sm:text-4xl font-header text-oak tracking-wide">
          The Realms of Digital Power
        </h2>
        <p className="text-sm font-sub text-oak-light/50 mt-1">
          A cartograph of the great data sanctuaries &amp; their elemental allegiances
        </p>
      </div>

      {/* ── Map Container ── */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          border: "2px solid rgba(107, 55, 16, 0.25)",
          filter: "url(#realm-wobble)",
          background: "linear-gradient(135deg, #F7F3E8 0%, #EDE8D6 100%)",
        }}
      >
        {/* Inner decorative border */}
        <div
          className="absolute inset-1.5 rounded pointer-events-none z-10"
          style={{ border: "1px solid rgba(107, 55, 16, 0.12)" }}
        />

        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          style={{ width: "100%", height: "auto" }}
        >
          {/* ── State Geographies ── */}
          <Geographies geography={US_TOPO}>
            {({ geographies }: { geographies: Array<{ rsmKey: string; properties: Record<string, string> }> }) =>
              geographies.map((geo: { rsmKey: string; properties: Record<string, string> }) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#EDE8D6"
                  stroke="#6B3710"
                  strokeWidth={0.4}
                  strokeOpacity={0.4}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#E8E0CC" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {/* ── Data Center Markers ── */}
          {DATA_CENTERS.map((dc) => {
            const tier = getTier(dc.score);
            return (
              <Marker
                key={dc.name}
                coordinates={[dc.lng, dc.lat]}
                onMouseEnter={(evt: React.MouseEvent) =>
                  setTooltip({ dc, x: evt.clientX, y: evt.clientY })
                }
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Tier decorations */}
                {tier === "clean" && <CleanDecorations />}
                {tier === "dirty" && <DirtyDecorations />}
                {tier === "medium" && <MediumDecorations />}

                {/* Center dot */}
                <circle
                  r={2.5}
                  fill={tier === "clean" ? "#4B6A4C" : tier === "dirty" ? "#B52121" : "#DDA059"}
                  stroke="#6B3710"
                  strokeWidth={0.5}
                  opacity={0.8}
                  style={{ cursor: "pointer" }}
                />

                {/* Label */}
                <text
                  y={10}
                  textAnchor="middle"
                  fill="#6B3710"
                  fontSize="4.5"
                  fontFamily="var(--font-sub)"
                  opacity={0.6}
                >
                  {dc.name}
                </text>
              </Marker>
            );
          })}

          {/* ── Compass Rose ── */}
          <CompassRoseWrapper lng={-70} lat={28} />

          {/* ── "The Outer Void" ocean labels ── */}
          <TextLabel lng={-60} lat={42} text="The Outer Void" fontSize="6" opacity={0.18} />
          <TextLabel lng={-130} lat={38} text="The Western Seas" fontSize="5" opacity={0.15} rotate={-15} />
        </ComposableMap>
      </div>

      {/* ── Tooltip ── */}
      {tooltip && <MapTooltip data={tooltip} />}

      {/* ── Legend ── */}
      <div className="specimen-card mt-6 p-4">
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <line x1="9" y1="14" x2="9" y2="8" stroke="#6B3710" strokeWidth={1.2} strokeLinecap="round" />
              <path d="M9,8 L5,12 L7,10 L4,14 L9,4 L14,14 L11,10 L13,12 Z" fill="#4B6A4C" opacity={0.8} />
            </svg>
            <span className="text-xs text-oak">Clean Energy Region</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <ellipse cx="9" cy="8" rx="7" ry="4" fill="#3a3a3a" opacity={0.5} />
              <ellipse cx="6" cy="7" rx="4" ry="2.5" fill="#555" opacity={0.4} />
              <path d="M8,12 l1,3 l-1,0 l1,3" stroke="#DDA059" strokeWidth={0.8} fill="none" />
            </svg>
            <span className="text-xs text-oak">High Carbon Region</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <ellipse cx="9" cy="9" rx="8" ry="3" fill="#A0A088" opacity={0.2} />
              <line x1="7" y1="14" x2="7" y2="10" stroke="#6B3710" strokeWidth={0.8} strokeLinecap="round" opacity={0.4} />
              <path d="M7,10 L5,12 L7,7 L9,12 Z" fill="#A0A088" opacity={0.4} />
            </svg>
            <span className="text-xs text-oak">Mixed Grid Region</span>
          </div>
        </div>
        <p className="text-center text-[10px] text-oak/30 mt-3 font-sub">
          Data sourced from the Oracle — real-time carbon intelligence
        </p>
      </div>
    </div>
  );
}

export const RealmMap = memo(RealmMapInner);
