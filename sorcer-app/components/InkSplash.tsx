"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Splash {
  id: number;
  x: number;
  y: number;
}

interface InkSplashButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  splashColor?: string;
}

let splashId = 0;

function InkSplashButtonInner({
  children,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  splashColor = "rgba(75,106,76,0.15)",
}: InkSplashButtonProps) {
  const [splashes, setSplashes] = useState<Splash[]>([]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      splashId++;
      const newSplash: Splash = { id: splashId, x, y };
      setSplashes((prev) => [...prev, newSplash]);

      // Remove after animation
      setTimeout(() => {
        setSplashes((prev) => prev.filter((s) => s.id !== newSplash.id));
      }, 600);

      onClick?.(e);
    },
    [disabled, onClick]
  );

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      <AnimatePresence>
        {splashes.map((splash) => (
          <motion.span
            key={splash.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: splash.x,
              top: splash.y,
              backgroundColor: splashColor,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ width: 0, height: 0, opacity: 0.6 }}
            animate={{ width: 200, height: 200, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </button>
  );
}

export const InkSplashButton = memo(InkSplashButtonInner);
