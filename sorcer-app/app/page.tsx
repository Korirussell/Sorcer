"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Leaf, Zap, Shield, WifiOff, ArrowRight, Bot } from "lucide-react";
import { SpellBar } from "@/components/SpellBar";
import { StatsTicker } from "@/components/StatsTicker";
import { useEnergy } from "@/context/EnergyContext";
import { generateUUID } from "@/lib/utils";
import { getHealth } from "@/utils/api";
import { getAllChats, seedIfEmpty, createChat } from "@/lib/localChatStore";

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

// Animated tagline — words glow sequentially
function GlowingTagline({ text }: { text: string }) {
  const words = text.split(" ");
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % words.length);
    }, 800);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <p className="text-lg sm:text-xl font-sub text-oak-light/60 mb-10 max-w-lg mx-auto leading-relaxed">
      {words.map((word, i) => (
        <span
          key={i}
          className="transition-all duration-500 inline-block mr-[0.3em]"
          style={{
            color: i === activeIdx ? "var(--moss)" : undefined,
            textShadow: i === activeIdx ? "0 0 12px rgba(75,106,76,0.3)" : "none",
            transform: i === activeIdx ? "translateY(-1px)" : "translateY(0)",
          }}
        >
          {word}
        </span>
      ))}
    </p>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { mode, selectedModelId } = useEnergy();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming" | "error">("ready");
  const [lastChat, setLastChat] = useState<{ title: string; model: string; region: string; saved: number } | null>(null);

  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then(() => { if (!cancelled) setBackendOnline(true); })
      .catch(() => { if (!cancelled) setBackendOnline(false); });
    return () => { cancelled = true; };
  }, []);

  // Seed localStorage and get last chat
  useEffect(() => {
    seedIfEmpty();
    const chats = getAllChats();
    if (chats.length > 0) {
      const c = chats[0];
      setLastChat({
        title: c.title,
        model: c.model.split("/").pop() || c.model,
        region: c.region,
        saved: c.carbonSaved,
      });
    }
  }, []);

  const handleSpellSubmit = () => {
    const prompt = input.trim();
    if (!prompt || status !== "ready") return;

    setStatus("submitted");

    const chatId = generateUUID();
    const title = prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt;

    // Create chat in localStorage immediately
    createChat({
      id: chatId,
      title,
      createdAt: new Date().toISOString(),
      carbonSaved: 0,
      promptCount: 0,
      model: selectedModelId || "auto",
      region: "auto",
    });

    // Pass query via URL params — survives React Strict Mode double-mount
    router.push(`/chat/${chatId}?query=${encodeURIComponent(prompt)}`);
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
          <motion.div
            className="mb-0 flex justify-center"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Image
              src="/images/logo.png"
              alt="Sorcer Logo"
              width={204}
              height={224}
              priority
              className="drop-shadow-lg"
            />
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-6xl sm:text-7xl md:text-8xl font-header text-oak mb-3 leading-[0.9] tracking-tight -mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Sorcer
          </motion.h1>

          {/* Animated tagline */}
          <GlowingTagline text="Route prompts to the cleanest available intelligence using real-time carbon & weather signals" />

          {/* SpellBar */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <SpellBar
              input={input}
              setInput={setInput}
              onSubmit={handleSpellSubmit}
              status={status}
              enableScheduling
            />
          </motion.div>

          {/* Stats ticker */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <StatsTicker />
          </motion.div>

          {/* Backend status banner */}
          {backendOnline === false && (
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-witchberry/8 border border-witchberry/15 text-witchberry text-xs">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Backend offline — showing mock data</span>
            </div>
          )}

          {/* Feature cards — 3D Tilt Specimen Cards with stagger */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.15, type: "spring", stiffness: 120, damping: 20 }}
              >
                <TiltCard
                  className="specimen-card p-5 text-left group cursor-default"
                >
                  <div className={`w-9 h-9 rounded-xl ${feature.bg} flex items-center justify-center mb-3`}>
                    <feature.icon className={`w-4.5 h-4.5 ${feature.color}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-oak mb-1">{feature.title}</h3>
                  <p className="text-xs text-oak-light/50 leading-relaxed">{feature.description}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>

          {/* Last expedition summary */}
          {lastChat && (
            <motion.div
              className="mt-8 specimen-card p-4 text-left"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-moss/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-moss" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-oak/30 uppercase tracking-wider mb-0.5">Last Expedition</p>
                  <p className="text-sm text-oak truncate">{lastChat.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-oak/40">{lastChat.model}</span>
                    <span className="text-[10px] text-oak/20">·</span>
                    <span className="text-[10px] text-oak/40">{lastChat.region}</span>
                    {lastChat.saved > 0 && (
                      <>
                        <span className="text-[10px] text-oak/20">·</span>
                        <span className="text-[10px] text-moss font-medium">saved {lastChat.saved.toFixed(1)}g</span>
                      </>
                    )}
                  </div>
                  {/* Mini savings bar */}
                  {lastChat.saved > 0 && (
                    <div className="mt-2 h-1 rounded-full bg-oak/8 overflow-hidden w-full max-w-[200px]">
                      <motion.div
                        className="h-full rounded-full bg-moss/40"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(lastChat.saved * 20, 100)}%` }}
                        transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    const chats = getAllChats();
                    if (chats[0]) router.push(`/breakdown/${chats[0].id}`);
                  }}
                  className="p-2 rounded-lg text-oak/30 hover:text-moss hover:bg-moss/10 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Subtle footer tagline */}
          <motion.p
            className="mt-12 text-[11px] text-oak/20 font-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            Powered by the Oracle — real-time carbon intelligence
          </motion.p>
      </div>
    </div>
  );
}
