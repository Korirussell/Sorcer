"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface CarbonParticleFlowProps {
  trigger: boolean;
  sourceRef: React.RefObject<HTMLElement | null>;
  savedAmount?: number;
}

export function CarbonParticleFlow({ trigger, sourceRef, savedAmount = 0 }: CarbonParticleFlowProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const spawnParticles = useCallback(() => {
    if (!sourceRef.current) return;

    const sourceRect = sourceRef.current.getBoundingClientRect();
    const indicator = document.querySelector('[data-tour="carbon-indicator"]');
    if (!indicator) return;

    const targetRect = indicator.getBoundingClientRect();
    const count = Math.min(Math.max(3, Math.round(savedAmount * 5)), 6);

    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      startX: sourceRect.left + sourceRect.width / 2 + (Math.random() - 0.5) * 30,
      startY: sourceRect.top + (Math.random() - 0.5) * 10,
      endX: targetRect.left + targetRect.width / 2,
      endY: targetRect.top + targetRect.height / 2,
    }));

    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1500);
  }, [sourceRef, savedAmount]);

  useEffect(() => {
    if (trigger && savedAmount > 0) {
      const timer = setTimeout(spawnParticles, 300);
      return () => clearTimeout(timer);
    }
  }, [trigger, savedAmount, spawnParticles]);

  return (
    <AnimatePresence>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="fixed z-[100] pointer-events-none"
          initial={{
            left: p.startX,
            top: p.startY,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            left: [p.startX, p.startX + (p.endX - p.startX) * 0.3, p.endX],
            top: [p.startY, p.startY - 40 - Math.random() * 30, p.endY],
            opacity: [1, 1, 0.6],
            scale: [1, 1.2, 0.5],
          }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{
            duration: 1.0 + Math.random() * 0.3,
            ease: "easeInOut",
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-moss shadow-[0_0_6px_rgba(75,106,76,0.6)]" />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
