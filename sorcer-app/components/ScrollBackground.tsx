"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

export function ScrollBackground() {
  const scrollY = useMotionValue(0);
  const [maxScroll, setMaxScroll] = useState(1);

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    scrollY.set(y);
    setMaxScroll(Math.max(document.body.scrollHeight - window.innerHeight, 1));
  }, [scrollY]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Parchment aging: sepia overlay increases with scroll
  const sepiaOpacity = useTransform(scrollY, [0, maxScroll * 0.8], [0, 0.08]);
  // Vignette darkens at edges as you scroll
  const vignetteOpacity = useTransform(scrollY, [0, maxScroll * 0.5], [0, 0.15]);
  // Subtle grain noise increases
  const grainOpacity = useTransform(scrollY, [0, maxScroll * 0.6], [0.02, 0.06]);
  // Magical particles appear after scrolling a bit
  const particleOpacity = useTransform(scrollY, [100, 400], [0, 1]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Sepia aging overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: sepiaOpacity,
          background: "linear-gradient(180deg, rgba(107,55,16,0.05) 0%, rgba(107,55,16,0.12) 50%, rgba(107,55,16,0.05) 100%)",
        }}
      />

      {/* Vignette effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: vignetteOpacity,
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(107,55,16,0.2) 100%)",
        }}
      />

      {/* Paper grain texture */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: grainOpacity,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Floating magical particles */}
      <motion.div className="absolute inset-0 overflow-hidden" style={{ opacity: particleOpacity }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <FloatingParticle key={i} index={i} />
        ))}
      </motion.div>

      {/* Ink blot decorations that fade in */}
      <motion.div className="absolute inset-0" style={{ opacity: vignetteOpacity }}>
        <svg className="absolute top-[15%] left-[5%] w-8 h-8 text-oak/10" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="currentColor" />
          <circle cx="22" cy="10" r="6" fill="currentColor" />
        </svg>
        <svg className="absolute bottom-[20%] right-[8%] w-6 h-6 text-oak/8" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="10" fill="currentColor" />
          <circle cx="8" cy="20" r="5" fill="currentColor" />
        </svg>
      </motion.div>
    </div>
  );
}

function FloatingParticle({ index }: { index: number }) {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState(2);
  const [dur, setDur] = useState(10);

  useEffect(() => {
    setPos({ x: 10 + (index * 7.3) % 80, y: 10 + (index * 13.7) % 80 });
    setSize(1.5 + (index % 3) * 0.8);
    setDur(8 + (index % 5) * 3);
  }, [index]);

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: size,
        height: size,
        background: index % 3 === 0 ? "#4B6A4C" : index % 3 === 1 ? "#DDA059" : "#6B3710",
      }}
      animate={{
        y: [0, -20, 0],
        x: [0, index % 2 === 0 ? 10 : -10, 0],
        opacity: [0.2, 0.6, 0.2],
      }}
      transition={{
        duration: dur,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.8,
      }}
    />
  );
}
