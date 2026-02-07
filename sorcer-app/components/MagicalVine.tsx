"use client";

import { useEffect, useRef } from "react";
import { useEnergy } from "@/context/EnergyContext";

export function MagicalVine({ ecoLevel }: { ecoLevel: number }) {
  const vineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vine = vineRef.current;
    if (!vine) return;

    // Create growing vine based on eco level
    const createVinePath = () => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      
      // Create organic vine curve based on eco level
      const height = 300 + (ecoLevel * 2); // Height based on eco level
      const curve = Math.sin((ecoLevel / 100) * Math.PI) * 50; // Curve based on eco level
      
      const d = `M 10 0 Q ${10 + curve} ${height/2} 10 ${height}`;
      path.setAttribute("d", d);
      path.setAttribute("stroke", ecoLevel > 70 ? "#10b981" : ecoLevel > 40 ? "#059669" : "#047857");
      path.setAttribute("stroke-width", "3");
      path.setAttribute("fill", "none");
      path.setAttribute("filter", "drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))");
      
      return path;
    };

    // Create leaves along the vine
    const createLeaves = () => {
      const leaves = [];
      const leafCount = Math.floor(ecoLevel / 20); // More leaves for higher eco levels
      
      for (let i = 0; i < leafCount; i++) {
        const leaf = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        const leafPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        leafPath.setAttribute("d", "M0 0 Q -3 -2 0 -4 Q 3 -2 0 0");
        leafPath.setAttribute("fill", ecoLevel > 70 ? "#22d3ee" : "#06b6d4");
        leafPath.setAttribute("filter", "drop-shadow(0 0 4px rgba(34, 211, 238, 0.8))");
        
        const position = (i + 1) * (300 / (leafCount + 1));
        leaf.setAttribute("transform", `translate(${10 + Math.sin(position * 0.05) * 20}, ${position}) rotate(${Math.sin(position * 0.1) * 30})`);
        leaf.appendChild(leafPath);
        
        leaves.push(leaf);
      }
      
      return leaves;
    };

    // Animate vine growth
    const animateGrowth = () => {
      const svg = vine.querySelector('svg');
      if (!svg) return;
      
      const path = createVinePath();
      const leaves = createLeaves();
      
      // Clear existing content
      svg.innerHTML = '';
      
      // Add new path
      svg.appendChild(path);
      
      // Add leaves with staggered animation
      leaves.forEach((leaf, index) => {
        setTimeout(() => {
          svg.appendChild(leaf);
        }, index * 200);
      });
    };

    // Initial growth
    setTimeout(animateGrowth, 500);

    // Regrow when eco level changes
    const interval = setInterval(animateGrowth, 10000);

    return () => clearInterval(interval);
  }, [ecoLevel]);

  return (
    <div 
      ref={vineRef}
      className="fixed top-0 right-8 w-20 h-96 pointer-events-none z-25"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 70%)'
      }}
    >
      <svg 
        width="40" 
        height="400" 
        viewBox="0 0 40 400" 
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.3))' }}
      >
        {/* Initial vine path */}
        <path
          d="M 20 0"
          stroke="#10b981"
          strokeWidth="3"
          fill="none"
          opacity="0.3"
        />
      </svg>
    </div>
  );
}
