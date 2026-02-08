"use client";

import { memo } from "react";
import { motion } from "framer-motion";

interface RoutingVizProps {
  model: string;
  region: string;
  cfePercent: number;
}

const NODE_COLORS = {
  prompt: "#6B3710",
  oracle: "#DDA059",
  region: "#4B6A4C",
  model: "#59C9F1",
};

function RoutingVizInner({ model, region, cfePercent }: RoutingVizProps) {
  const modelLabel = model.split("/").pop() || model;

  const nodes = [
    { x: 40, y: 50, label: "Your Prompt", color: NODE_COLORS.prompt },
    { x: 180, y: 50, label: "Sorcer", color: NODE_COLORS.oracle },
    { x: 320, y: 50, label: region, color: NODE_COLORS.region, sub: `${cfePercent}% CFE` },
    { x: 460, y: 50, label: modelLabel, color: NODE_COLORS.model },
  ];

  return (
    <div className="specimen-card p-5">
      <h4 className="text-sm font-header text-oak mb-4">Routing Path</h4>
      <div className="overflow-x-auto">
        <svg width="500" height="100" viewBox="0 0 500 100" className="w-full max-w-full">
          {/* Connecting paths */}
          {nodes.slice(0, -1).map((node, i) => {
            const next = nodes[i + 1];
            return (
              <g key={`path-${i}`}>
                <motion.line
                  x1={node.x + 30}
                  y1={node.y}
                  x2={next.x - 30}
                  y2={next.y}
                  stroke={node.color}
                  strokeWidth={2}
                  strokeDasharray="6,4"
                  strokeOpacity={0.4}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.5 + 0.3 }}
                />
                {/* Animated dot traveling along path */}
                <motion.circle
                  r={3}
                  fill={next.color}
                  initial={{ cx: node.x + 30, cy: node.y, opacity: 0 }}
                  animate={{
                    cx: [node.x + 30, next.x - 30],
                    cy: [node.y, next.y],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 1.2,
                    delay: i * 0.5 + 0.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => (
            <g key={`node-${i}`}>
              {/* Pulse ring */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={18}
                fill={node.color}
                opacity={0.08}
                animate={{ r: [18, 22, 18], opacity: [0.08, 0.03, 0.08] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
              />
              {/* Core circle */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={12}
                fill={node.color}
                opacity={0.15}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.5, type: "spring", stiffness: 200 }}
              />
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={6}
                fill={node.color}
                stroke="#F7F3E8"
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.5 + 0.1, type: "spring", stiffness: 250 }}
              />
              {/* Label */}
              <motion.text
                x={node.x}
                y={node.y + 28}
                textAnchor="middle"
                fill="#6B3710"
                fontSize="9"
                fontFamily="var(--font-sub)"
                fontWeight="bold"
                opacity={0.7}
                initial={{ opacity: 0, y: node.y + 35 }}
                animate={{ opacity: 0.7, y: node.y + 28 }}
                transition={{ delay: i * 0.5 + 0.2 }}
              >
                {node.label}
              </motion.text>
              {/* Sub label */}
              {node.sub && (
                <motion.text
                  x={node.x}
                  y={node.y + 38}
                  textAnchor="middle"
                  fill="#4B6A4C"
                  fontSize="7"
                  fontFamily="var(--font-code)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{ delay: i * 0.5 + 0.3 }}
                >
                  {node.sub}
                </motion.text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export const RoutingViz = memo(RoutingVizInner);
