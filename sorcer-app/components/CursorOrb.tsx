"use client";

import { useEffect, useRef, memo } from "react";

function CursorOrbInner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -200, y: -200 });
  const prevMouseRef = useRef({ x: -200, y: -200 });
  const embersRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number }[]>([]);
  const rafRef = useRef(0);
  const isTouchRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use devicePixelRatio for crisp rendering and correct alignment
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const onTouch = () => { isTouchRef.current = true; };
    window.addEventListener("touchstart", onTouch, { once: true });

    const onMove = (e: MouseEvent) => {
      if (isTouchRef.current) return;
      prevMouseRef.current = { ...mouseRef.current };
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      frame++;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const pmx = prevMouseRef.current.x;
      const pmy = prevMouseRef.current.y;
      const speed = Math.sqrt((mx - pmx) ** 2 + (my - pmy) ** 2);

      // Spawn ember particles — only when moving
      const spawnCount = Math.min(Math.floor(speed * 0.35), 5);
      if (mx > 0 && my > 0 && speed > 1.5) {
        for (let i = 0; i < spawnCount; i++) {
          const t = i / Math.max(spawnCount, 1);
          const sx = pmx + (mx - pmx) * t;
          const sy = pmy + (my - pmy) * t;
          embersRef.current.push({
            x: sx + (Math.random() - 0.5) * 4,
            y: sy + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -0.4 - Math.random() * 0.5,
            life: 0,
            maxLife: 30 + Math.random() * 20,
            size: 0.5 + Math.random() * 1.0,
            hue: 200 + Math.random() * 40,
          });
        }
      }

      // Cap embers
      if (embersRef.current.length > 80) {
        embersRef.current = embersRef.current.slice(-80);
      }

      // Update & draw embers
      embersRef.current = embersRef.current.filter((e) => {
        e.life++;
        e.x += e.vx;
        e.y += e.vy;
        e.vy -= 0.02;
        e.vx *= 0.96;
        e.vy *= 0.96;
        const progress = e.life / e.maxLife;
        if (progress >= 1) return false;

        const alpha = progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.85;
        const size = e.size * (1 - progress * 0.4);

        // Ember glow
        const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, size * 3);
        grad.addColorStop(0, `hsla(${e.hue}, 80%, 75%, ${alpha * 0.5})`);
        grad.addColorStop(0.5, `hsla(${e.hue}, 70%, 55%, ${alpha * 0.2})`);
        grad.addColorStop(1, `hsla(${e.hue}, 70%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(e.x, e.y, size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        ctx.fillStyle = `hsla(${e.hue}, 50%, 92%, ${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      // Main orb — clearly visible as the cursor replacement
      if (mx > 0 && my > 0) {
        const pulse = Math.sin(frame * 0.04) * 0.10 + 1;
        const orbSize = 12 * pulse;

        // Wide outer aura
        const outerGlow = ctx.createRadialGradient(mx, my, 0, mx, my, orbSize * 3);
        outerGlow.addColorStop(0, "hsla(215, 80%, 65%, 0.15)");
        outerGlow.addColorStop(0.4, "hsla(220, 85%, 55%, 0.06)");
        outerGlow.addColorStop(1, "hsla(220, 80%, 40%, 0)");
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(mx, my, orbSize * 3, 0, Math.PI * 2);
        ctx.fill();

        // Inner fire orb
        const innerGlow = ctx.createRadialGradient(mx, my, 0, mx, my, orbSize);
        innerGlow.addColorStop(0, "hsla(200, 70%, 95%, 0.6)");
        innerGlow.addColorStop(0.3, "hsla(210, 85%, 70%, 0.4)");
        innerGlow.addColorStop(0.7, "hsla(225, 90%, 55%, 0.15)");
        innerGlow.addColorStop(1, "hsla(230, 80%, 45%, 0)");
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(mx, my, orbSize, 0, Math.PI * 2);
        ctx.fill();

        // Bright white-hot core (the actual cursor point)
        ctx.fillStyle = `hsla(210, 60%, 97%, ${0.7 + Math.sin(frame * 0.06) * 0.12})`;
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();

        // Secondary ring pulse
        const ringAlpha = 0.08 + Math.sin(frame * 0.03) * 0.04;
        ctx.strokeStyle = `hsla(215, 70%, 70%, ${ringAlpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(mx, my, orbSize * 1.8, 0, Math.PI * 2);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouch);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
      aria-hidden="true"
    />
  );
}

export const CursorOrb = memo(CursorOrbInner);
