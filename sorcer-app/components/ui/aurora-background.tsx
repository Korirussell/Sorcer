"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface AuroraBackgroundProps {
  className?: string;
  children: React.ReactNode;
  showRadialGradient?: boolean;
}

export function AuroraBackground({
  className,
  children,
  showRadialGradient = true,
}: AuroraBackgroundProps) {
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
      style={{
        background: `
          radial-gradient(
            circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
            rgba(16, 185, 129, 0.15) 0%,
            rgba(163, 230, 53, 0.1) 25%,
            transparent 50%
          ),
          radial-gradient(
            circle at 20% 80%,
            rgba(16, 185, 129, 0.2) 0%,
            transparent 50%
          ),
          radial-gradient(
            circle at 80% 20%,
            rgba(163, 230, 53, 0.15) 0%,
            transparent 50%
          ),
          radial-gradient(
            circle at 40% 40%,
            rgba(16, 185, 129, 0.1) 0%,
            transparent 50%
          ),
          linear-gradient(
            to bottom,
            #020617,
            #0f172a
          )
        `,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-950/50" />
      
      {/* Animated aurora layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-30">
          <div 
            className="absolute h-full w-full"
            style={{
              background: `
                radial-gradient(
                  ellipse at 20% 30%,
                  rgba(16, 185, 129, 0.3) 0%,
                  transparent 50%
                ),
                radial-gradient(
                  ellipse at 60% 70%,
                  rgba(163, 230, 53, 0.2) 0%,
                  transparent 50%
                )
              `,
              filter: "blur(40px)",
              animation: "float 20s ease-in-out infinite",
            }}
          />
        </div>
        
        <div className="absolute inset-0 opacity-20">
          <div 
            className="absolute h-full w-full"
            style={{
              background: `
                radial-gradient(
                  ellipse at 80% 20%,
                  rgba(16, 185, 129, 0.2) 0%,
                  transparent 50%
                ),
                radial-gradient(
                  ellipse at 30% 80%,
                  rgba(163, 230, 53, 0.3) 0%,
                  transparent 50%
                )
              `,
              filter: "blur(60px)",
              animation: "float 25s ease-in-out infinite reverse",
            }}
          />
        </div>
      </div>

      {showRadialGradient && (
        <div className="absolute inset-0 bg-radial-gradient" />
      )}
      
      <div className="relative z-50 flex h-full w-full items-center justify-center">
        {children}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) scale(1);
          }
          33% {
            transform: translateY(-20px) translateX(10px) scale(1.05);
          }
          66% {
            transform: translateY(10px) translateX(-10px) scale(0.95);
          }
        }

        .bg-radial-gradient {
          background: radial-gradient(
            ellipse at center,
            rgba(16, 185, 129, 0.05) 0%,
            transparent 70%
          );
        }
      `}</style>
    </div>
  );
}
