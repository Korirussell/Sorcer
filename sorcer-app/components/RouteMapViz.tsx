"use client";

import { memo, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { geoPath as d3GeoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { createMapProjection, MAP_W, MAP_H } from "@/lib/mapProjection";

interface RouteMapVizProps {
  model: string;
  region: string;
  cfePercent: number;
}

const US_TOPO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// Region → [lng, lat] of data center
const REGION_LNGLAT: Record<string, [number, number]> = {
  "us-central1": [-93.6, 41.6],
  "us-west1": [-121.2, 44.0],
  "us-east4": [-77.5, 39.0],
  "us-east1": [-80.8, 33.0],
  "europe-west1": [-93.6, 41.6],
  "auto": [-93.6, 41.6],
};
const ATLANTA_LNGLAT: [number, number] = [-84.39, 33.75];

interface GeoFeature {
  type: string;
  geometry: any;
  properties?: Record<string, any>;
}

function RouteMapVizInner({ model, region, cfePercent }: RouteMapVizProps) {
  const modelLabel = model.split("/").pop() || model;
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [phase, setPhase] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);

  const projection = useMemo(() => createMapProjection(), []);
  const pathGen = useMemo(() => d3GeoPath().projection(projection), [projection]);

  // Project coordinates
  const atlPt = useMemo(() => {
    const pt = projection(ATLANTA_LNGLAT);
    return pt || [0, 0];
  }, [projection]);
  
  const destLngLat = REGION_LNGLAT[region] || REGION_LNGLAT["us-central1"];
  const destPt = useMemo(() => {
    const pt = projection(destLngLat);
    return pt || [0, 0];
  }, [projection, destLngLat]);

  // Load US states
  useEffect(() => {
    fetch(US_TOPO_URL)
      .then((r) => r.json())
      .then((topo: Topology<{ states: GeometryCollection }>) => {
        const fc = feature(topo, topo.objects.states);
        setFeatures(fc.features as unknown as GeoFeature[]);
        setMapLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load US map:", err);
        setMapLoaded(true); // Still render without map
      });
  }, []);

  // Animation phases: 0=zoomed on Atlanta, 1=show route, 2=full view, 3=zoom to destination
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2500);
    const t3 = setTimeout(() => setPhase(3), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const midX = (atlPt[0] + destPt[0]) / 2;
  const midY = Math.min(atlPt[1], destPt[1]) - 60;
  const curvePath = `M${atlPt[0]},${atlPt[1]} Q${midX},${midY} ${destPt[0]},${destPt[1]}`;

  const waypoints = [0.2, 0.4, 0.6, 0.8].map((t) => ({
    x: atlPt[0] * (1 - t) * (1 - t) + 2 * midX * t * (1 - t) + destPt[0] * t * t,
    y: atlPt[1] * (1 - t) * (1 - t) + 2 * midY * t * (1 - t) + destPt[1] * t * t,
  }));

  // Viewbox: start zoomed on Atlanta, then full view, then zoom to destination
  const vbAtlanta = `${atlPt[0] - 80} ${atlPt[1] - 50} 160 100`;
  const vbFull = `0 0 ${MAP_W} ${MAP_H}`;
  const vbDestination = `${destPt[0] - 80} ${destPt[1] - 50} 160 100`;
  const viewBox = phase === 0 ? vbAtlanta : phase === 3 ? vbDestination : vbFull;

  return (
    <div className="specimen-card p-5 overflow-hidden">
      <h4 className="text-sm font-header text-oak mb-3">Routing Path</h4>
      <div className="relative rounded-xl overflow-hidden border border-oak/10" style={{ background: "linear-gradient(135deg, #F7F3E8, #EDE8D6)" }}>
        <motion.svg
          className="w-full"
          style={{ height: 280 }}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          animate={{ viewBox }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          {/* Real US states */}
          {features.map((f, i) => {
            const d = pathGen(f.geometry);
            if (!d) return null;
            return (
              <path key={i} d={d} fill="#EDE8D6" stroke="#6B3710" strokeWidth={0.5} strokeOpacity={0.3} />
            );
          })}

          {/* Red dotted route — like realm map */}
          {phase >= 1 && (
            <>
              <motion.path
                d={curvePath}
                fill="none" stroke="#B52121" strokeWidth={2} strokeDasharray="6,4" opacity={0.5}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              {waypoints.map((wp, i) => (
                <motion.circle key={i} cx={wp.x} cy={wp.y} r={2.5} fill="#B52121" opacity={0.25}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.3 }}
                />
              ))}
              <motion.circle r={4} fill="#B52121"
                initial={{ cx: atlPt[0], cy: atlPt[1], opacity: 0 }}
                animate={{ cx: destPt[0], cy: destPt[1], opacity: [0, 1, 1, 0.8] }}
                transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
              />
            </>
          )}

          {/* Atlanta origin */}
          <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }}>
            <motion.circle cx={atlPt[0]} cy={atlPt[1]} r={12} fill="rgba(107,55,16,0.06)"
              animate={{ r: [12, 16, 12] }} transition={{ duration: 2, repeat: Infinity }} />
            <circle cx={atlPt[0]} cy={atlPt[1]} r={7} fill="rgba(107,55,16,0.12)" />
            <circle cx={atlPt[0]} cy={atlPt[1]} r={3.5} fill="#6B3710" stroke="#F7F3E8" strokeWidth={1.5} />
            <text x={atlPt[0]} y={atlPt[1] + 18} textAnchor="middle" fill="#6B3710" fontSize="9" fontWeight="bold" opacity={0.7}>Atlanta (You)</text>
          </motion.g>

          {/* Destination server */}
          {phase >= 1 && (
            <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.5, type: "spring", stiffness: 200 }}>
              <motion.circle cx={destPt[0]} cy={destPt[1]} r={16} fill="rgba(75,106,76,0.08)"
                animate={{ r: [16, 22, 16], opacity: [0.08, 0.15, 0.08] }} transition={{ duration: 2.5, repeat: Infinity }} />
              <circle cx={destPt[0]} cy={destPt[1]} r={9} fill="rgba(75,106,76,0.15)" />
              <circle cx={destPt[0]} cy={destPt[1]} r={4.5} fill="#4B6A4C" stroke="#F7F3E8" strokeWidth={1.5} />
              <text x={destPt[0]} y={destPt[1] + 20} textAnchor="middle" fill="#4B6A4C" fontSize="9" fontWeight="bold" opacity={0.7}>{region}</text>
              <text x={destPt[0]} y={destPt[1] + 30} textAnchor="middle" fill="#4B6A4C" fontSize="7" opacity={0.5}>{cfePercent}% CFE · {modelLabel}</text>
            </motion.g>
          )}
        </motion.svg>

        {/* Legend */}
        <motion.div
          className="absolute bottom-2 left-2 flex items-center gap-3 px-2.5 py-1.5 rounded-lg bg-parchment/80 border border-oak/8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#6B3710]" />
            <span className="text-[9px] text-oak/50">You</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-moss" />
            <span className="text-[9px] text-oak/50">Server</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t border-dashed border-[#B52121]" />
            <span className="text-[9px] text-oak/50">Route</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export const RouteMapViz = memo(RouteMapVizInner);
