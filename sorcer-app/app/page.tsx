"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Zap, Shield } from "lucide-react";
import { SpellBar } from "@/components/SpellBar";
import { MagicOrb } from "@/components/MagicOrb";
import { useEnergy } from "@/context/EnergyContext";
import { postOracleRoute } from "@/lib/backendApi";
import { generateUUID } from "@/lib/utils";

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
      description: "Monitors carbon intensity across data center regions worldwide",
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
    <div className="min-h-[calc(100vh-3rem)] flex flex-col items-center justify-center py-12">
      <div className="text-center max-w-3xl mx-auto w-full px-6">
        {/* Orb — floating above title */}
        <div className="mb-8 flex justify-center">
          <MagicOrb size="lg" />
        </div>

        {/* Title */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-header text-oak mb-3 leading-[0.9] tracking-tight">
          Sorcer
        </h1>
        <p className="text-lg sm:text-xl font-sub text-oak-light/60 mb-10 max-w-lg mx-auto leading-relaxed">
          Route prompts to the cleanest available intelligence using real-time carbon &amp; weather signals
        </p>

        {/* SpellBar */}
        <div className="mb-16">
          <SpellBar
            input={input}
            setInput={setInput}
            onSubmit={handleSpellSubmit}
            status={status}
          />
        </div>

        {/* Feature cards — Specimen Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="specimen-card p-5 text-left group hover:scale-[1.02] transition-transform duration-300"
            >
              <div className={`w-9 h-9 rounded-xl ${feature.bg} flex items-center justify-center mb-3`}>
                <feature.icon className={`w-4.5 h-4.5 ${feature.color}`} />
              </div>
              <h3 className="text-sm font-semibold text-oak mb-1">{feature.title}</h3>
              <p className="text-xs text-oak-light/50 leading-relaxed">{feature.description}</p>
            </div>
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
