"use client";

import { useState, useCallback } from "react";

interface MagicOrbProps {
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  disabled?: boolean;
}

const sizes = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-20 h-20",
};

export function MagicOrb({
  onClick,
  size = "md",
  className = "",
  label,
  disabled = false,
}: MagicOrbProps) {
  const [ripples, setRipples] = useState<number[]>([]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    const id = Date.now();
    setRipples((prev) => [...prev, id]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r !== id));
    }, 700);
    onClick?.();
  }, [onClick, disabled]);

  return (
    <div className="relative inline-flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={label || "Submit"}
        className={`
          magic-orb animate-orb-pulse ${sizes[size]}
          ${disabled ? "opacity-40 cursor-not-allowed animate-none!" : ""}
          ${className}
        `}
      >
        {/* Inner light reflection */}
        <div className="absolute top-[20%] left-[25%] w-[30%] h-[30%] rounded-full bg-white/15 blur-sm" />

        {/* Ripple effects */}
        {ripples.map((id) => (
          <div key={id} className="magic-orb-ripple" />
        ))}
      </button>

      {label && (
        <span className="text-xs font-sub text-oak-light/70 tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
}
