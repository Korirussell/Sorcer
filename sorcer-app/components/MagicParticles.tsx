"use client";

import { useEffect, useRef, memo, useCallback } from "react";

type LeafType = "leaf" | "fern" | "sprout" | "seed";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  type: LeafType;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
  swayPhase: number;
  swaySpeed: number;
}

const GREENS = ["#4B6A4C", "#5E8260", "#6B8E6B", "#3D5A3D", "#7BA37B", "#8FBC8F", "#2E4A2E"];

function MagicParticlesInner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);

  const createParticle = useCallback((width: number, height: number): Particle => {
    const types: LeafType[] = ["leaf", "leaf", "leaf", "fern", "fern", "sprout", "seed"];
    const type = types[Math.floor(Math.random() * types.length)];
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -0.15 - Math.random() * 0.25,
      size: type === "seed" ? 1 + Math.random() * 1.5 : 2.5 + Math.random() * 4,
      opacity: 0,
      color: GREENS[Math.floor(Math.random() * GREENS.length)],
      type,
      life: 0,
      maxLife: 500 + Math.random() * 700,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.015,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.01 + Math.random() * 0.02,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const count = Math.min(15, Math.floor(window.innerWidth / 100));
    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(canvas.width, canvas.height)
    );
    for (const p of particlesRef.current) { p.life = Math.random() * p.maxLife; }

    const handleMouseMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handleMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = mouseRef.current;

      for (const p of particlesRef.current) {
        p.life++;
        const lifeRatio = p.life / p.maxLife;

        // Fade in/out
        if (lifeRatio < 0.1) p.opacity = lifeRatio / 0.1;
        else if (lifeRatio > 0.8) p.opacity = (1 - lifeRatio) / 0.2;
        else p.opacity = Math.min(p.opacity + 0.006, 0.2);

        // Gentle mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100 && dist > 0) {
          const force = (100 - dist) / 100 * 0.3;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Gentle sway (like wind)
        p.swayPhase += p.swaySpeed;
        p.vx += Math.sin(p.swayPhase) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.02;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Wrap
        if (p.x < -30) p.x = canvas.width + 30;
        if (p.x > canvas.width + 30) p.x = -30;
        if (p.y < -30) p.y = canvas.height + 30;
        if (p.y > canvas.height + 30) p.y = -30;

        if (p.life >= p.maxLife) Object.assign(p, createParticle(canvas.width, canvas.height));

        // Draw
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.type === "leaf") {
          // Organic leaf shape
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.2);
          ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.6, p.size * 0.8, p.size * 0.6, 0, p.size * 1.2);
          ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.6, -p.size * 0.8, -p.size * 0.6, 0, -p.size * 1.2);
          ctx.fillStyle = p.color;
          ctx.fill();
          // Central vein
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1);
          ctx.lineTo(0, p.size * 1);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = p.opacity * 0.25;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        } else if (p.type === "fern") {
          // Fern frond - curved stem with tiny leaves
          ctx.beginPath();
          ctx.moveTo(0, p.size * 1.5);
          ctx.quadraticCurveTo(p.size * 0.5, 0, 0, -p.size * 1.5);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.6;
          ctx.stroke();
          // Simplified leaflets (3 instead of 5 pairs)
          for (let j = -1; j <= 1; j++) {
            const ly = j * p.size * 0.6;
            ctx.beginPath();
            ctx.ellipse(p.size * 0.35, ly, p.size * 0.3, p.size * 0.12, 0.3, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity * 0.6;
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-p.size * 0.35, ly, p.size * 0.3, p.size * 0.12, -0.3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (p.type === "sprout") {
          // Little sprout growing upward
          const growProgress = Math.min(lifeRatio * 3, 1);
          const stemH = p.size * 2 * growProgress;
          // Stem
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(p.size * 0.2, -stemH * 0.5, 0, -stemH);
          ctx.strokeStyle = "#3D5A3D";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          // Two tiny leaves at top
          if (growProgress > 0.5) {
            const leafAlpha = (growProgress - 0.5) * 2;
            ctx.globalAlpha = p.opacity * leafAlpha;
            ctx.beginPath();
            ctx.ellipse(p.size * 0.4, -stemH + p.size * 0.2, p.size * 0.5, p.size * 0.2, 0.5, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-p.size * 0.4, -stemH + p.size * 0.3, p.size * 0.45, p.size * 0.18, -0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Seed - tiny green dot with soft glow
          const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
          glow.addColorStop(0, p.color);
          glow.addColorStop(1, "rgba(75,106,76,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
}

export const MagicParticles = memo(MagicParticlesInner);
