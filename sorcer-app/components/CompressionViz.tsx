"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { PackageOpen } from "lucide-react";

interface CompressionVizProps {
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
}

function CompressionVizInner({ originalTokens, compressedTokens, compressionRatio }: CompressionVizProps) {
  const reductionPct = Math.round((1 - compressionRatio) * 100);
  const barWidth = compressionRatio * 100;

  // Color based on compression quality
  const getColor = (ratio: number) => {
    if (ratio < 0.5) return { bar: "bg-moss", text: "text-moss", label: "Excellent" };
    if (ratio < 0.75) return { bar: "bg-moss-light", text: "text-moss", label: "Good" };
    if (ratio < 0.9) return { bar: "bg-topaz", text: "text-topaz", label: "Moderate" };
    return { bar: "bg-oak/30", text: "text-oak/50", label: "Minimal" };
  };

  const colors = getColor(compressionRatio);

  return (
    <div className="specimen-card p-5">
      <h4 className="text-sm font-header text-oak mb-4 flex items-center gap-2">
        <PackageOpen className="w-4 h-4 text-moss" />
        Prompt Compression
      </h4>

      {/* Squish animation */}
      <div className="relative mb-4">
        <div className="flex items-center gap-3">
          {/* Original bar */}
          <div className="flex-1">
            <div className="text-[10px] text-oak/40 mb-1">Original</div>
            <div className="h-8 rounded-lg bg-oak/8 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-witchberry/15 rounded-lg flex items-center justify-center"
                initial={{ width: "100%" }}
                animate={{ width: "100%" }}
              >
                <span className="text-[11px] font-mono text-oak/50">{originalTokens.toLocaleString()}</span>
              </motion.div>
            </div>
          </div>

          {/* Arrow */}
          <motion.div
            className="text-moss font-header text-lg"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            →
          </motion.div>

          {/* Compressed bar */}
          <div className="flex-1">
            <div className="text-[10px] text-oak/40 mb-1">Compressed</div>
            <div className="h-8 rounded-lg bg-oak/8 relative overflow-hidden">
              <motion.div
                className={`absolute inset-y-0 left-0 ${colors.bar}/20 rounded-lg flex items-center justify-center`}
                initial={{ width: "100%" }}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              >
                <span className="text-[11px] font-mono text-oak/70">{compressedTokens.toLocaleString()}</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div>
          <motion.div
            className={`text-2xl font-header ${colors.text}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 150, damping: 12 }}
          >
            {reductionPct}%
          </motion.div>
          <span className="text-[10px] text-oak/40">reduction</span>
        </div>

        <div className="text-right">
          <span className={`text-xs font-medium ${colors.text}`}>{colors.label}</span>
          <div className="text-[10px] text-oak/30 mt-0.5">
            {(originalTokens - compressedTokens).toLocaleString()} tokens saved
          </div>
        </div>
      </div>

      {/* Compression gauge */}
      <div className="mt-3 h-1.5 rounded-full bg-oak/8 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, #4B6A4C, ${compressionRatio < 0.7 ? '#5E8260' : '#DDA059'})`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${reductionPct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
        />
      </div>
    </div>
  );
}

export const CompressionViz = memo(CompressionVizInner);
