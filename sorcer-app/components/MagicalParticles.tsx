"use client";

import { useEffect, useRef } from "react";

export function MagicalParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create magical floating particles
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'absolute w-1 h-1 bg-mana rounded-full pointer-events-none';
      
      // Random starting position
      const startX = Math.random() * window.innerWidth;
      const startY = window.innerHeight + 10;
      
      particle.style.left = `${startX}px`;
      particle.style.top = `${startY}px`;
      particle.style.opacity = '0';
      particle.style.boxShadow = '0 0 6px rgba(16, 185, 129, 0.8)';
      
      container.appendChild(particle);
      
      // Animate particle floating upward
      let progress = 0;
      const animate = () => {
        progress += 0.02;
        
        if (progress <= 1) {
          const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
          const currentY = startY - (window.innerHeight + 100) * easeProgress;
          const currentX = startX + Math.sin(progress * Math.PI * 2) * 50;
          const opacity = Math.sin(progress * Math.PI) * 0.8;
          
          particle.style.top = `${currentY}px`;
          particle.style.left = `${currentX}px`;
          particle.style.opacity = `${opacity}`;
          
          requestAnimationFrame(animate);
        } else {
          particle.remove();
        }
      };
      
      requestAnimationFrame(animate);
    };

    // Create particles periodically
    const particleInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        createParticle();
      }
    }, 2000);

    // Create initial particles
    for (let i = 0; i < 3; i++) {
      setTimeout(createParticle, i * 500);
    }

    return () => clearInterval(particleInterval);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-30"
      style={{ background: 'transparent' }}
    />
  );
}
