"use client";

import { useEffect, useState, memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { getGridMap, type GridRegion } from "@/utils/api";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Mock carbon intensity by ISO country code — used when backend is unavailable
const MOCK_INTENSITY: Record<string, number> = {
  USA: 380,
  CAN: 120,
  BRA: 80,
  GBR: 200,
  DEU: 340,
  FRA: 60,
  IND: 650,
  CHN: 580,
  AUS: 520,
  JPN: 450,
  NOR: 20,
  SWE: 30,
  POL: 700,
  ZAF: 800,
  RUS: 420,
  KOR: 410,
  IDN: 600,
  MEX: 350,
  ARG: 250,
  SAU: 550,
};

function getIntensityColor(intensity: number): string {
  if (intensity > 400) return "rgba(127, 29, 29, 0.5)";   // Corrupted — high carbon
  if (intensity > 200) return "rgba(221, 160, 89, 0.25)";  // Amber — moderate
  return "rgba(16, 185, 129, 0.2)";                        // Elven — low carbon
}

function getIntensityLabel(intensity: number): string {
  if (intensity > 400) return "High";
  if (intensity > 200) return "Moderate";
  return "Clean";
}

interface CarbonMapProps {
  className?: string;
}

function CarbonMapInner({ className = "" }: CarbonMapProps) {
  const [regions, setRegions] = useState<GridRegion[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [tooltip, setTooltip] = useState<{
    name: string;
    intensity: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGridMap()
      .then((data) => {
        if (!cancelled) {
          setRegions(data.regions);
          setBackendOnline(true);
        }
      })
      .catch(() => {
        if (!cancelled) setBackendOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // For now, we use mock data keyed by ISO code since backend returns region names
  const getCountryIntensity = (isoA3: string): number => {
    return MOCK_INTENSITY[isoA3] ?? 300;
  };

  return (
    <div className={`specimen-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-oak">Carbon Grid Map</h3>
          <p className="text-[11px] text-oak-light/50">
            Global carbon intensity by region
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              backendOnline === true
                ? "bg-moss"
                : backendOnline === false
                  ? "bg-witchberry"
                  : "bg-topaz animate-pulse"
            }`}
          />
          <span className="text-[10px] text-oak/40">
            {backendOnline === true
              ? "Live"
              : backendOnline === false
                ? "Offline — Mock Data"
                : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative px-2 pb-3">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 120, center: [0, 30] }}
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: Array<{ rsmKey: string; properties: Record<string, string> }> }) =>
                geographies.map((geo: { rsmKey: string; properties: Record<string, string> }) => {
                  const isoA3: string =
                    geo.properties.ISO_A3 || geo.properties.iso_a3 || "";
                  const name: string =
                    geo.properties.NAME || geo.properties.name || "Unknown";
                  const intensity = getCountryIntensity(isoA3);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getIntensityColor(intensity)}
                      stroke="#5c4033"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: {
                          outline: "none",
                          fill: getIntensityColor(intensity).replace(
                            /[\d.]+\)$/,
                            "0.7)"
                          ),
                          stroke: "#6B3710",
                          strokeWidth: 1,
                          cursor: "pointer",
                        },
                        pressed: { outline: "none" },
                      }}
                      onMouseEnter={(evt: React.MouseEvent) => {
                        setTooltip({
                          name,
                          intensity,
                          x: evt.clientX,
                          y: evt.clientY,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 glass-panel rounded-xl px-3 py-2 shadow-specimen pointer-events-none"
            style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
          >
            <p className="text-xs font-semibold text-oak">{tooltip.name}</p>
            <p className="text-[11px] text-oak-light/60">
              {tooltip.intensity}g CO₂/kWh —{" "}
              <span
                className={
                  tooltip.intensity > 400
                    ? "text-witchberry"
                    : tooltip.intensity > 200
                      ? "text-topaz"
                      : "text-moss"
                }
              >
                {getIntensityLabel(tooltip.intensity)}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-5 pb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(16, 185, 129, 0.2)" }} />
          <span className="text-[10px] text-oak/50">Clean (&lt;200g)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(221, 160, 89, 0.25)" }} />
          <span className="text-[10px] text-oak/50">Moderate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(127, 29, 29, 0.5)" }} />
          <span className="text-[10px] text-oak/50">High (&gt;400g)</span>
        </div>
      </div>

      {/* Backend region data if available */}
      {regions.length > 0 && (
        <div className="border-t border-oak/8 px-5 py-3">
          <p className="text-[10px] text-oak/30 uppercase tracking-wider mb-2">
            Live Regions
          </p>
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => (
              <div
                key={r.name}
                className="px-2 py-1 rounded-lg bg-moss/8 text-[11px] text-oak"
              >
                {r.name}{" "}
                <span className="text-moss font-medium">{r.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const CarbonMap = memo(CarbonMapInner);
