"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface BackgroundBeamsProps {
  className?: string;
  children: React.ReactNode;
}

export function BackgroundBeams({ className, children }: BackgroundBeamsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { left, top, width, height } = container.getBoundingClientRect();
      const x = ((clientX - left) / width) * 100;
      const y = ((clientY - top) / height) * 100;

      container.style.setProperty("--mouse-x", `${x}%`);
      container.style.setProperty("--mouse-y", `${y}%`);
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-screen w-full overflow-hidden bg-slate-950",
        className
      )}
    >
      {/* Base background */}
      <div className="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-950 to-slate-950" />
      
      {/* Beams */}
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(71, 85, 105, 0.3)" />
            <stop offset="50%" stopColor="rgba(100, 116, 139, 0.2)" />
            <stop offset="100%" stopColor="rgba(71, 85, 105, 0.1)" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Vertical beams */}
        <g className="opacity-30">
          <rect
            x="10%"
            y="0"
            width="2"
            height="100%"
            fill="url(#beam-gradient)"
            filter="url(#glow)"
            style={{
              transform: `rotate(var(--mouse-x, 0deg))`,
              transformOrigin: "center",
              transition: "transform 0.3s ease-out",
            }}
          />
          <rect
            x="25%"
            y="0"
            width="1.5"
            height="100%"
            fill="url(#beam-gradient)"
            filter="url(#glow)"
            style={{
              transform: `rotate(calc(var(--mouse-x, 0deg) * 0.5))`,
              transformOrigin: "center",
              transition: "transform 0.4s ease-out",
            }}
          />
          <rect
            x="40%"
            y="0"
            width="1"
            height="100%"
            fill="url(#beam-gradient)"
            filter="url(#glow)"
            style={{
              transform: `rotate(calc(var(--mouse-x, 0deg) * -0.3))`,
              transformOrigin: "center",
              transition: "transform 0.5s ease-out",
            }}
          />
          <rect
            x="60%"
            y="0"
            width="1.5"
            height="100%"
            fill="url(#beam-gradient)"
            filter="url(#glow)"
            style={{
              transform: `rotate(calc(var(--mouse-x, 0deg) * 0.7))`,
              transformOrigin: "center",
              transition: "transform 0.35s ease-out",
            }}
          />
          <rect
            x="75%"
            y="0"
            width="2"
            height="100%"
            fill="url(#beam-gradient)"
            filter="url(#glow)"
            style={{
              transform: `rotate(calc(var(--mouse-x, 0deg) * -0.5))`,
              transformOrigin: "center",
              transition: "transform 0.45s ease-out",
            }}
          />
          <rect
            x="90%"
            y="0"
            width="1"
            height="100%"
            fill="url(#beam-gradient)"
            filter="url(#glow)"
            style={{
              transform: `rotate(calc(var(--mouse-x, 0deg) * 0.2))`,
              transformOrigin: "center",
              transition: "transform 0.4s ease-out",
            }}
          />
        </g>
        
        {/* Horizontal beams */}
        <g className="opacity-20">
          <rect
            x="0"
            y="20%"
            width="100%"
            height="1"
            fill="url(#beam-gradient)"
            filter="url(#glow)"
            style={{
              transform: `rotate(var(--mouse-y, 0deg))`,
              transformOrigin: "center",
              transition: "transform 0.3s ease-out",
            }}
          />
          <rect
            x="0"
            y="40%"
            width="100%"
            height="1.5"
            fill="url(#beam-gradient)"
            filter="url(#glow)"
            style={{
              transform: `rotate(calc(var(--mouse-y, 0deg) * 0.5))`,
              transformOrigin: "center",
              transition: "transform 0.4s ease-out",
            }}
          />
          <rect
            x="0"
            y="60%"
            width="100%"
            height="1"
            fill="url(#beam-gradient)"
            filter="url(#glow)"
            style={{
              transform: `rotate(calc(var(--mouse-y, 0deg) * -0.3))`,
              transformOrigin: "center",
              transition: "transform 0.5s ease-out",
            }}
          />
          <rect
            x="0"
            y="80%"
            width="100%"
            height="1.5"
            fill="url(#beam-gradient)"
            filter="url(#glow)"
            style={{
              transform: `rotate(calc(var(--mouse-y, 0deg) * 0.7))`,
              transformOrigin: "center",
              transition: "transform 0.35s ease-out",
            }}
          />
        </g>
        
        {/* Animated pulse effect */}
        <circle
          cx="50%"
          cy="50%"
          r="2"
          fill="rgba(148, 163, 184, 0.3)"
          filter="url(#glow)"
          style={{
            transform: `translate(calc(var(--mouse-x, 50%) - 50%), calc(var(--mouse-y, 50%) - 50%))`,
            transition: "transform 0.1s ease-out",
          }}
        >
          <animate
            attributeName="r"
            values="2;8;2"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.3;0.1;0.3"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-transparent to-slate-950/50" />
      
      <div className="relative z-50 flex h-full w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
}
