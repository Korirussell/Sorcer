"use client";

import { useState } from "react";
import { motion } from "framer-motion";

// Ink-vine SVG paths that curl around the search bar like botanical illustrations
const vinePaths = [
  // Top-left vine curling down and right
  "M 0,40 C 10,35 15,20 30,18 C 45,16 55,25 70,20 C 85,15 95,8 120,10 C 145,12 160,5 180,8",
  // Top-right vine curling down and left
  "M 420,35 C 405,30 395,15 380,18 C 365,21 355,12 340,15 C 325,18 310,10 290,12 C 270,14 255,8 240,10",
  // Bottom-left vine curling up and right
  "M 5,65 C 20,70 30,80 50,78 C 70,76 80,85 100,82 C 120,79 135,88 155,85",
  // Bottom-right vine curling up and left
  "M 415,70 C 400,75 390,85 370,82 C 350,79 340,88 320,85 C 300,82 285,90 265,87",
  // Small leaf cluster top-left
  "M 30,18 C 25,10 20,5 28,3 C 36,1 35,12 30,18",
  // Small leaf cluster top-right
  "M 380,18 C 385,10 390,5 382,3 C 374,1 375,12 380,18",
  // Tendril bottom-left
  "M 50,78 C 45,85 40,90 42,95 C 44,90 48,86 50,78",
  // Tendril bottom-right
  "M 370,82 C 375,89 380,94 378,98 C 376,93 372,88 370,82",
];

// Separate the main vines from small details for staggered animation
const mainVines = vinePaths.slice(0, 4);
const details = vinePaths.slice(4);

interface SearchVinesProps {
  isFocused: boolean;
  children: React.ReactNode;
}

export function SearchVines({ isFocused, children }: SearchVinesProps) {
  const [hasAnimated, setHasAnimated] = useState(false);

  // Trigger animation on first focus or on mount
  const shouldAnimate = isFocused || hasAnimated;

  if (isFocused && !hasAnimated) {
    setHasAnimated(true);
  }

  return (
    <div className="relative w-full">
      {/* SVG vine overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 420 100"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        {/* Main vine strokes */}
        {mainVines.map((d, i) => (
          <motion.path
            key={`vine-${i}`}
            d={d}
            stroke="#4a5d23"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.45}
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              shouldAnimate
                ? { pathLength: 1, opacity: 0.45 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{
              pathLength: {
                duration: 1.8,
                delay: i * 0.25,
                ease: "easeInOut",
              },
              opacity: {
                duration: 0.4,
                delay: i * 0.25,
              },
            }}
          />
        ))}

        {/* Detail strokes — leaves & tendrils */}
        {details.map((d, i) => (
          <motion.path
            key={`detail-${i}`}
            d={d}
            stroke="#5c4033"
            strokeWidth={0.8}
            strokeLinecap="round"
            opacity={0.35}
            fill={i < 2 ? "#4a5d23" : "none"}
            fillOpacity={0.15}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              shouldAnimate
                ? { pathLength: 1, opacity: 0.35 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{
              pathLength: {
                duration: 1.2,
                delay: 1.0 + i * 0.2,
                ease: "easeOut",
              },
              opacity: {
                duration: 0.3,
                delay: 1.0 + i * 0.2,
              },
            }}
          />
        ))}

        {/* Subtle glow on focus */}
        {isFocused && (
          <>
            {mainVines.map((d, i) => (
              <motion.path
                key={`glow-${i}`}
                d={d}
                stroke="#4a5d23"
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.08 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                style={{ filter: "blur(3px)" }}
              />
            ))}
          </>
        )}
      </svg>

      {/* The actual search bar content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
