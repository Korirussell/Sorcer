"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import React from "react";
import { Send, Leaf, Zap, Sprout, ChevronDown, Brain, Bot, Sparkles, Mic } from "lucide-react";
import { VoiceSession } from "@/components/VoiceMode";
import { useEnergy } from "@/context/EnergyContext";
import { SearchVines } from "./SearchVines";
import { InkSplashButton } from "./InkSplash";
import { chatModels, modelsByProvider } from "@/lib/ai/models";

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

const PROVIDER_ICONS: Record<string, typeof Leaf> = {
  anthropic: Brain,
  openai: Sparkles,
  google: Leaf,
  xai: Zap,
  reasoning: Bot,
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  xai: "xAI",
  reasoning: "Reasoning",
};

export function SpellBar({
  input,
  setInput,
  onSubmit,
  status,
  enableScheduling = false,
}: {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  status: "ready" | "submitted" | "streaming" | "error";
  enableScheduling?: boolean;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const { mode, selectedModelId, setMode, setSelectedModelId } = useEnergy();

  // Portal positioning for dropdown (escapes overflow:hidden)
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const updateDropdownPos = useCallback(() => {
    if (modelBtnRef.current) {
      const rect = modelBtnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.top - 8, left: rect.left });
    }
  }, []);

  useEffect(() => {
    if (isDropdownOpen) updateDropdownPos();
  }, [isDropdownOpen, updateDropdownPos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      onSubmit();
    }
  };

  const selectedModel = selectedModelId ? chatModels.find((m) => m.id === selectedModelId) : null;
  const selectedIcon = selectedModel ? (PROVIDER_ICONS[selectedModel.provider] || Bot) : null;

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    setCookie("chat-model", modelId);
    setIsDropdownOpen(false);
  };

  const switchToManual = () => {
    setMode("manual");
    if (!selectedModelId) setSelectedModelId(chatModels[0].id);
    setIsDropdownOpen(false);
  };

  const switchToAuto = () => {
    setMode("auto");
    setSelectedModelId(null);
    setIsDropdownOpen(false);
  };

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="mx-auto max-w-2xl w-full">
      <SearchVines isFocused={isFocused}>
      <form
        onSubmit={handleSubmit}
        className="specimen-card"
        style={{
          transform: isFocused ? "translateY(-2px) scale(1.01)" : "translateY(0) scale(1)",
          boxShadow: isFocused
            ? "0 8px 30px rgba(107,55,16,0.12), 0 2px 8px rgba(107,55,16,0.06)"
            : undefined,
          transition: "transform 0.25s ease-out, box-shadow 0.25s ease-out",
        }}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 p-3">
          {/* Model selector pill */}
          <div className="relative">
            <button
              ref={modelBtnRef}
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`
                flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-xl text-xs font-medium
                transition-all duration-200 border whitespace-nowrap
                ${mode === "auto"
                  ? "bg-moss/10 border-moss/20 text-moss hover:bg-moss/15"
                  : "bg-parchment-dark border-oak/10 text-oak hover:border-oak/20"
                }
              `}
            >
              {mode === "auto" ? (
                <>
                  <Sprout className="w-3.5 h-3.5" />
                  <span>Auto</span>
                </>
              ) : (
                <>
                  {selectedIcon && <>{React.createElement(selectedIcon, { className: "w-3.5 h-3.5 text-oak/60" })}</>}
                  <span>{selectedModel?.name || "Select"}</span>
                </>
              )}
              <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

          </div>

          {/* Text input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask Sorcer..."
            disabled={isLoading}
            data-spellbar
            className="flex-1 px-3 py-2.5 bg-transparent text-oak placeholder:text-oak/30 focus:outline-none text-sm"
          />

          {/* Voice mode button */}
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 bg-oak/5 text-oak/30 hover:text-moss hover:bg-moss/10 border border-oak/8 hover:border-moss/20"
            title="Voice mode"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Submit — Magic Orb mini with ink splash */}
          <InkSplashButton
            type="submit"
            disabled={!input.trim() || status !== "ready"}
            splashColor="rgba(75,106,76,0.2)"
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
              ${input.trim() && status === "ready"
                ? "bg-moss text-parchment shadow-sm hover:shadow-md active:scale-95"
                : "bg-oak/5 text-oak/20 cursor-not-allowed"
              }
            `}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-parchment/30 border-t-parchment rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </InkSplashButton>
        </div>

        {/* Status bar */}
        {status === "error" && (
          <div className="px-4 pb-3 -mt-1">
            <p className="text-xs text-witchberry">Something went wrong. Please try again.</p>
          </div>
        )}
      </form>
      </SearchVines>

      {/* Portal-rendered dropdowns (escape overflow:hidden) */}
      {isDropdownOpen && dropdownPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9990]" onClick={() => setIsDropdownOpen(false)} />
          <div
            className="fixed z-[9991] w-64 bg-[#fffbf0] border border-[#5c4033]/30 rounded-2xl shadow-lg overflow-hidden"
            style={{ top: dropdownPos.top, left: dropdownPos.left, transform: 'translateY(-100%)' }}
          >
            <div className="p-2 max-h-[400px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(160,160,136,0.4)_transparent]">
              <button
                type="button"
                onClick={switchToAuto}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200
                  ${mode === "auto" ? "bg-moss/10 border border-moss/20" : "hover:bg-oak/5"}
                `}
              >
                <div className="w-7 h-7 rounded-lg bg-moss/15 flex items-center justify-center">
                  <Sprout className="w-4 h-4 text-moss" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-oak">Auto Sustainable</div>
                  <div className="text-[11px] text-oak-light/50">Sorcer finds cleanest energy source</div>
                </div>
                {mode === "auto" && <div className="w-2 h-2 rounded-full bg-moss" />}
              </button>

              {Object.entries(modelsByProvider).map(([provider, providerModels]) => {
                const ProvIcon = PROVIDER_ICONS[provider] || Bot;
                return (
                  <div key={provider}>
                    <div className="my-1.5 mx-3 border-t border-oak/8" />
                    <div className="px-3 py-1 text-[10px] font-medium text-oak/30 uppercase tracking-wider flex items-center gap-1.5">
                      <ProvIcon className="w-3 h-3" />
                      {PROVIDER_LABELS[provider] || provider}
                    </div>
                    {providerModels.map((model) => {
                      const isSelected = mode === "manual" && model.id === selectedModelId;
                      return (
                        <button
                          type="button"
                          key={model.id}
                          onClick={() => {
                            if (mode !== "manual") switchToManual();
                            handleModelChange(model.id);
                          }}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-200
                            ${isSelected ? "bg-oak/5 border border-oak/10" : "hover:bg-oak/5"}
                          `}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-oak/10" : "bg-oak/5"}`}>
                            <ProvIcon className={`w-4 h-4 ${isSelected ? "text-moss" : "text-oak/40"}`} />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-oak">{model.name}</div>
                            <div className="text-[11px] text-oak-light/50">{model.description}</div>
                          </div>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-moss" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Voice session overlay */}
      <VoiceSession isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </div>
  );
}
