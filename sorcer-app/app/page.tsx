"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Leaf, Zap, Shield, WifiOff } from "lucide-react";
import { SpellBar } from "@/components/SpellBar";
import { useEnergy } from "@/context/EnergyContext";
import { postOracleRoute } from "@/lib/backendApi";
import { generateUUID } from "@/lib/utils";
import { getHealth } from "@/utils/api";

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: cy * -10, y: cx * 10 });
  }, []);

  return (
    <div style={{ perspective: "600px" }}>
      <div
        ref={ref}
        className={className}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setTilt({ x: 0, y: 0 }); }}
        style={{
          transform: isHovered ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.03)` : "rotateX(0) rotateY(0) scale(1)",
          transition: "transform 0.2s ease-out",
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

export default function HomePage() {
  const router = useRouter();
  const { mode, selectedModelId } = useEnergy();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming" | "error">("ready");

  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then(() => { if (!cancelled) setBackendOnline(true); })
      .catch(() => { if (!cancelled) setBackendOnline(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSpellSubmit = async () => {
    const prompt = input.trim();
    if (!prompt || status !== "ready") return;

    setStatus("submitted");

    try {
      let modelIdToUse = selectedModelId;

      if (mode === "auto" || !modelIdToUse) {
        const oracle = await postOracleRoute({ prompt });
        modelIdToUse = oracle.model_id;
      }

      if (modelIdToUse) {
        setCookie("chat-model", modelIdToUse);
      }

      const chatId = generateUUID();
      router.push(`/chat/${chatId}?query=${encodeURIComponent(prompt)}`);
    } catch (e) {
      console.error("Failed to route prompt via Oracle:", e);
      setStatus("error");
    }
  };

  const features = [
    {
      icon: Leaf,
      title: "Carbon Arbitrage",
      description: "Routes your prompt to the cleanest available model in real-time",
      color: "text-moss",
      bg: "bg-moss/8",
    },
    {
      icon: Zap,
      title: "Live Grid Data",
      description: "Monitors carbon intensity across US data center regions in real-time",
      color: "text-topaz",
      bg: "bg-topaz/8",
    },
    {
      icon: Shield,
      title: "Zero Compromise",
      description: "Same intelligence, dramatically lower environmental footprint",
      color: "text-miami",
      bg: "bg-miami/8",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-3rem)] py-10">
      <div className="flex flex-col max-w-2xl mx-auto w-full px-6 text-center">
          {/* Logo */}
          <div className="mb-0 flex justify-center">
            <Image
              src="/images/logo.png"
              alt="Sorcer Logo"
              width={204}
              height={224}
              priority
              className="drop-shadow-lg"
            />
          </div>

          {/* Title */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-header text-oak mb-3 leading-[0.9] tracking-tight -mt-8">
            Sorcer
          </h1>
          <p className="text-lg sm:text-xl font-sub text-oak-light/60 mb-10 max-w-lg mx-auto leading-relaxed">
            Route prompts to the cleanest available intelligence using real-time carbon &amp; weather signals
          </p>

          {/* SpellBar */}
          <div className="mb-12">
            <SpellBar
              input={input}
              setInput={setInput}
              onSubmit={handleSpellSubmit}
              status={status}
              enableScheduling
            />
          </div>

          {/* Backend status banner */}
          {backendOnline === false && (
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-witchberry/8 border border-witchberry/15 text-witchberry text-xs">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Backend offline — showing mock data</span>
            </div>
          )}

          {/* Feature cards — 3D Tilt Specimen Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {features.map((feature) => (
              <TiltCard
                key={feature.title}
                className="specimen-card p-5 text-left group cursor-default"
              >
                <div className={`w-9 h-9 rounded-xl ${feature.bg} flex items-center justify-center mb-3`}>
                  <feature.icon className={`w-4.5 h-4.5 ${feature.color}`} />
                </div>
                <h3 className="text-sm font-semibold text-oak mb-1">{feature.title}</h3>
                <p className="text-xs text-oak-light/50 leading-relaxed">{feature.description}</p>
              </TiltCard>
            ))}
          </div>

          {/* Subtle footer tagline */}
          <p className="mt-12 text-[11px] text-oak/20 font-sub">
            Powered by the Oracle — real-time carbon intelligence
          </p>
      </div>
    </div>
  );
}
