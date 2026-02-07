"use client";

import { useEffect, useRef } from "react";

export function GardenBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create subtle floating leaf particles (much slower and fewer)
    const createLeaf = () => {
      const leaf = document.createElement('div');
      leaf.className = 'absolute pointer-events-none';
      leaf.innerHTML = `
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 1C2 1 1 2 1 4C1 6 2 8 4 8C6 8 7 7 7 7C4 7 1 6 1 4C1 6 2 4 2 2C2 4 1 1 4 1Z" 
                fill="#10b981" 
                stroke="#06b6d4" 
                stroke-width="0.3"
                style="filter: drop-shadow(0 0 2px rgba(6, 182, 212, 0.4))"/>
        </svg>
      `;
      
      // Random starting position
      const startX = Math.random() * window.innerWidth;
      const startY = -20;
      
      leaf.style.left = `${startX}px`;
      leaf.style.top = `${startY}px`;
      leaf.style.opacity = '0.4';
      leaf.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      container.appendChild(leaf);
      
      // Animate leaf falling very slowly
      let progress = 0;
      const duration = 15000 + Math.random() * 10000; // 15-25 seconds
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
          const easeProgress = 1 - Math.pow(1 - progress, 2); // Ease out
          const currentY = startY + (window.innerHeight + 40) * easeProgress;
          const currentX = startX + Math.sin(progress * Math.PI * 2) * 20;
          const rotation = parseFloat(leaf.style.transform?.match(/rotate\(([^)]+)\)/)?.[1] || '0') + (progress * 90);
          const opacity = 0.4 * (1 - progress * 0.5);
          
          leaf.style.top = `${currentY}px`;
          leaf.style.left = `${currentX}px`;
          leaf.style.transform = `rotate(${rotation}deg)`;
          leaf.style.opacity = `${opacity}`;
          
          requestAnimationFrame(animate);
        } else {
          leaf.remove();
        }
      };
      
      requestAnimationFrame(animate);
    };

    // Create very subtle vine elements along screen edges
    const createVine = (side: 'left' | 'right') => {
      const vine = document.createElement('div');
      vine.className = `absolute ${side}-0 top-0 w-0.5 opacity-20`;
      vine.style.background = 'linear-gradient(to bottom, rgba(16, 185, 129, 0.3), transparent)';
      vine.style.height = `${window.innerHeight * 0.4}px`;
      vine.style.filter = 'blur(0.5px)';
      vine.style.boxShadow = '0 0 4px rgba(16, 185, 129, 0.2)';
      
      // Add very subtle leaves to vine
      for (let i = 0; i < 2; i++) {
        const vineLeaf = document.createElement('div');
        vineLeaf.className = 'absolute w-1.5 h-1.5';
        vineLeaf.innerHTML = `
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 1C1 1 0 2 0 4C0 6 1 8 3 8C5 8 6 7 6 7C3 7 0 6 0 4C0 6 1 4 1 2C1 4 0 1 3 1Z" 
                      fill="#059669" 
                      stroke="#22d3ee" 
                      stroke-width="0.2"/>
          </svg>
        `;
        vineLeaf.style.top = `${30 + i * 200}px`;
        vineLeaf.style.left = side === 'left' ? '-2px' : '2px';
        vineLeaf.style.transform = `rotate(${Math.random() * 40 - 20}deg)`;
        vine.appendChild(vineLeaf);
      }
      
      container.appendChild(vine);
    };

    // Create initial elements
    createVine('left');
    createVine('right');
    
    // Create leaves much less frequently
    const leafInterval = setInterval(() => {
      if (Math.random() > 0.9) { // Much less frequent
        createLeaf();
      }
    }, 8000); // Every 8 seconds instead of 3

    // Create initial leaves
    for (let i = 0; i < 2; i++) { // Only 2 initial leaves
      setTimeout(createLeaf, i * 2000);
    }

    return () => {
      clearInterval(leafInterval);
      container.innerHTML = '';
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-20"
      style={{ 
        background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.02) 0%, transparent 70%)',
      }}
    />
  );
}
