"use client";

import { useRef, useState } from "react";

interface EnchantedTerminalProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function EnchantedTerminal({
  children,
  className = "",
  title = "terminal",
  onFocus,
  onBlur,
}: EnchantedTerminalProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  return (
    <div
      ref={containerRef}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={-1}
      className={`enchanted-terminal p-4 ${className}`}
    >
      {/* Terminal header bar */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#B52121]/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#DDA059]/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#5E8260]/60" />
        </div>
        <span className="text-xs text-white/40 font-mono ml-2">{title}</span>

        {/* Active glow indicator */}
        {isFocused && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
            <span className="text-[10px] text-sage/70 font-mono">active</span>
          </div>
        )}
      </div>

      {/* Terminal content */}
      <div className="relative font-mono text-sm leading-relaxed text-[#d4e4d4]">
        {children}
      </div>
    </div>
  );
}
