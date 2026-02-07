"use client";

import { useState, useEffect } from "react";
import { Wand2, Leaf, Zap, Flame, Sprout } from "lucide-react";
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAutoMenuOpen, setIsAutoMenuOpen] = useState(false);
  const { isEcoMode, isAutoMode, setEcoMode, setAutoMode } = useEnergy();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      onSubmit();
    }
  };

  const models = [
    { id: "google/gemini-2.5-flash-lite", name: "Eco Mode", icon: Leaf, description: "98% Clean Energy", eco: true },
    { id: "anthropic/claude-haiku-4.5", name: "Force Mode", icon: Zap, description: "Fast / Low Carbon", eco: false },
    { id: "openai/gpt-5.2", name: "Power Mode", icon: Flame, description: "High Carbon / Coal Heavy", eco: false },
  ];

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0];

  // Auto mode logic - select cleanest model
  useEffect(() => {
    if (isAutoMode) {
      const cleanestModel = models.sort((a, b) => (b.eco ? 1 : 0) - (a.eco ? 1 : 0))[0];
      onModelChange?.(cleanestModel.id);
      setEcoMode(cleanestModel.eco);
    }
  }, [isAutoMode, onModelChange, setEcoMode]);

  const handleModelChange = (modelId: string) => {
    onModelChange?.(modelId);
    setCookie("chat-model", modelId);
    
    const model = models.find(m => m.id === modelId);
    if (model) {
      setEcoMode(model.eco);
    }
    setIsDropdownOpen(false);
  };

  const switchToManual = () => {
    setAutoMode(false);
    setIsAutoMenuOpen(false);
  };

  const switchToAuto = () => {
    setAutoMode(true);
    setIsDropdownOpen(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative backdrop-blur-xl border border-white/10 rounded-2xl bg-black/20 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex items-center gap-4 p-4">
          {/* Left: Auto Mode Badge OR Manual Dropdown */}
          {isAutoMode ? (
            // Auto Sustainable Mode Badge
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAutoMenuOpen(!isAutoMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-mana/30 bg-mana/10 text-mana hover:bg-mana/20 transition-all duration-200 text-sm font-medium"
              >
                <Sprout className="w-4 h-4" />
                <span>Auto Sustainable</span>
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${isAutoMenuOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Auto Mode Menu - positioned above */}
              {isAutoMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-void border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                  <div className="p-2">
                    <div className="px-3 py-2 text-mist/60 text-xs font-medium uppercase tracking-wider mb-2">
                      Current Mode
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-mana/10 border border-mana/30">
                      <Sprout className="w-4 h-4 text-mana" />
                      <div className="flex-1">
                        <div className="font-medium text-mana">Auto Sustainable</div>
                        <div className="text-xs text-mist/60">Automatically selects cleanest model</div>
                      </div>
                    </div>
                    <button
                      onClick={switchToManual}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-mist hover:bg-white/5 transition-colors duration-200 text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      <div className="flex-1">
                        <div className="font-medium">Switch to Manual Selection</div>
                        <div className="text-xs text-mist/60">Choose specific AI model</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Manual Model Selector Dropdown
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-black/30 text-mist hover:border-mana/50 transition-all duration-200 text-sm font-medium"
              >
                {selectedModel && <selectedModel.icon className="w-4 h-4" />}
                <span>{selectedModel?.name}</span>
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Manual Mode Dropdown - positioned above */}
              {isDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-void border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                  <div className="p-2">
                    <div className="px-3 py-2 text-mist/60 text-xs font-medium uppercase tracking-wider mb-2">
                      Manual Model Selection
                    </div>
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                          model.id === selectedModelId 
                            ? 'bg-mana/20 text-mana border border-mana/30' 
                            : 'text-mist hover:bg-white/5'
                        }`}
                      >
                        <model.icon className="w-4 h-4" />
                        <div className="flex-1">
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs opacity-70">{model.description}</div>
                        </div>
                        {model.id === selectedModelId && (
                          <div className="w-2 h-2 bg-mana rounded-full"></div>
                        )}
                      </button>
                    ))}
                    <div className="border-t border-white/10 my-2"></div>
                    <button
                      onClick={switchToAuto}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-mist hover:bg-mana/10 transition-colors duration-200 text-left"
                    >
                      <Sprout className="w-4 h-4 text-mana" />
                      <div className="flex-1">
                        <div className="font-medium text-mana">Switch to Auto Sustainable</div>
                        <div className="text-xs text-mist/60">Let AI choose the cleanest option</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
