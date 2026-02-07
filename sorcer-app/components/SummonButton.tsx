"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

export function SummonButton({
  onClick,
  isVisible = true,
}: {
  onClick?: () => void;
  isVisible?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  if (!isVisible) return null;

  const handleClick = () => {
    setIsClicked(true);
    onClick?.();
    setTimeout(() => setIsClicked(false), 600);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full border-2 border-mana bg-void/80 backdrop-blur-md 
        shadow-[0_0_20px_#10b981] hover:shadow-[0_0_30px_#10b981] 
        transition-all duration-300 hover:scale-105 flex items-center justify-center
        group relative overflow-hidden
        ${isClicked ? 'scale-95' : ''}
      `}
    >
      {/* Magical particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-mana rounded-full animate-ping"></div>
        <div className="absolute top-1/4 left-1/4 w-0.5 h-0.5 bg-toxic rounded-full animate-ping animation-delay-200"></div>
        <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-mana rounded-full animate-ping animation-delay-400"></div>
      </div>

      {/* Glow effect on hover */}
      {isHovered && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-mana/20 via-transparent to-toxic/20 animate-pulse"></div>
      )}

      {/* Icon with rotation */}
      <Sparkles 
        className={`w-6 h-6 text-mana group-hover:text-toxic transition-all duration-200 ${
          isClicked ? 'animate-spin' : ''
        }`} 
      />
      
      {/* Ripple effect on click */}
      {isClicked && (
        <div className="absolute inset-0 rounded-full border-2 border-mana animate-ping"></div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(180deg); }
        }
        
        .animate-delay-200 {
          animation-delay: 200ms;
        }
        
        .animate-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </button>
  );
}
