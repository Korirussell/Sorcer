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

      // Spawn subtle ember particles — fewer, smaller
      const spawnCount = Math.min(Math.floor(speed * 0.15) + (frame % 3 === 0 ? 1 : 0), 2);
      if (mx > 0 && my > 0) {
        for (let i = 0; i < spawnCount; i++) {
          const t = i / Math.max(spawnCount, 1);
          const sx = pmx + (mx - pmx) * t;
          const sy = pmy + (my - pmy) * t;
          embersRef.current.push({
            x: sx + (Math.random() - 0.5) * 4,
            y: sy + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -0.5 - Math.random() * 0.6,
            life: 0,
            maxLife: 20 + Math.random() * 15,
            size: 0.6 + Math.random() * 1.2,
            hue: 205 + Math.random() * 30,
          });
        }
      }

      // Cap embers
      if (embersRef.current.length > 40) {
        embersRef.current = embersRef.current.slice(-40);
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

        // Soft glow only
        const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, size * 2);
        grad.addColorStop(0, `hsla(${e.hue}, 70%, 75%, ${alpha * 0.35})`);
        grad.addColorStop(1, `hsla(${e.hue}, 70%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(e.x, e.y, size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Tiny bright core
        ctx.fillStyle = `hsla(${e.hue}, 50%, 92%, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      // Main orb — subtle and aligned
      if (mx > 0 && my > 0) {
        const pulse = Math.sin(frame * 0.08) * 0.1 + 1;
        const orbSize = 5 * pulse;

        // Soft outer glow — very subtle
        const outerGlow = ctx.createRadialGradient(mx, my, 0, mx, my, orbSize * 2.5);
        outerGlow.addColorStop(0, "hsla(215, 70%, 65%, 0.08)");
        outerGlow.addColorStop(0.6, "hsla(220, 80%, 55%, 0.03)");
        outerGlow.addColorStop(1, "hsla(220, 80%, 40%, 0)");
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(mx, my, orbSize * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner orb
        const innerGlow = ctx.createRadialGradient(mx, my, 0, mx, my, orbSize);
        innerGlow.addColorStop(0, "hsla(210, 60%, 92%, 0.4)");
        innerGlow.addColorStop(0.4, "hsla(215, 75%, 65%, 0.2)");
        innerGlow.addColorStop(1, "hsla(225, 80%, 50%, 0)");
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(mx, my, orbSize, 0, Math.PI * 2);
        ctx.fill();

        // Tiny white core
        ctx.fillStyle = `hsla(210, 50%, 96%, ${0.35 + Math.sin(frame * 0.12) * 0.1})`;
        ctx.beginPath();
        ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
        ctx.fill();
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
