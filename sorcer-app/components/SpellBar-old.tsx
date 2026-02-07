"use client";

import { useState, useEffect } from "react";
import { Wand2 } from "lucide-react";
import { useEnergy } from "@/context/EnergyContext";

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

export function SpellBar({
  selectedModelId,
  onModelChange,
  input,
  setInput,
  onSubmit,
  status,
}: {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  status: "ready" | "submitted" | "streaming" | "error";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { setEcoMode } = useEnergy();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      onSubmit();
    }
  };

  const models = [
    { id: "google/gemini-2.5-flash-lite", name: "Eco Mode", emoji: "🌱", description: "98% Clean Energy", eco: true },
    { id: "anthropic/claude-haiku-4.5", name: "Force Mode", emoji: "⚡", description: "Fast / Low Carbon", eco: false },
    { id: "openai/gpt-5.2", name: "Power Mode", emoji: "🔥", description: "High Carbon / Coal Heavy", eco: false },
  ];

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0];

  // Update eco mode when model changes
  useEffect(() => {
    if (selectedModel) {
      setEcoMode(selectedModel.eco);
    }
  }, [selectedModelId, selectedModel, setEcoMode]);

  const handleModelChange = (modelId: string) => {
    onModelChange?.(modelId);
    setCookie("chat-model", modelId);
    
    const model = models.find(m => m.id === modelId);
    if (model) {
      setEcoMode(model.eco);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative backdrop-blur-xl border border-white/10 rounded-2xl bg-black/20 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex items-center gap-4 p-4">
          {/* Model Selector - Left */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-black/30 text-mist hover:border-mana/50 transition-all duration-200 text-sm font-medium"
            >
              <span className="text-lg">{selectedModel.emoji}</span>
              <span>{selectedModel.name}</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Absolute Positioning Dropdown */}
            {isOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-void border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        handleModelChange(model.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                        model.id === selectedModelId 
                          ? 'bg-mana/20 text-mana border border-mana/30' 
                          : 'text-mist hover:bg-white/5'
                      }`}
                    >
                      <span className="text-lg">{model.emoji}</span>
                      <div className="flex-1">
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs opacity-70">{model.description}</div>
                      </div>
                      {model.id === selectedModelId && (
                        <div className="w-2 h-2 bg-mana rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Input - Right */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Cast your spell..."
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/30 text-mist placeholder:text-mist/50 focus:outline-none focus:border-mana/50 focus:ring-2 focus:ring-mana/20 transition-all duration-200"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!input.trim() || status !== "ready"}
            className="p-3 rounded-xl bg-mana/20 border border-mana/30 text-mana hover:bg-mana/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wand2 className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
