"use client";

import { useState } from "react";
import {
  X,
  History,
  Leaf,
  BarChart3,
  TreePine,
  Sprout,
  BookOpen,
  Feather,
} from "lucide-react";
import { useEnergy } from "@/context/EnergyContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SorcerSidebar({ isOpen, onClose }: SidebarProps) {
  const { isAutoMode, mode } = useEnergy();
  const [activeSection, setActiveSection] = useState("history");

  const chatHistory = [
    { id: "1", title: "Carbon footprint analysis", preview: "What's the carbon impact of...", timestamp: "2h ago", eco: true },
    { id: "2", title: "Sustainable AI models", preview: "Compare eco-friendly AI options...", timestamp: "1d ago", eco: true },
    { id: "3", title: "Energy optimization", preview: "How to reduce AI energy...", timestamp: "3d ago", eco: false },
  ];

  const carbonStats = {
    totalSaved: "127.5",
    unit: "kg CO₂",
    promptsRouted: 342,
    ecoPercent: 78,
  };

  const navItems = [
    { id: "history", label: "Field Notes", icon: BookOpen },
    { id: "carbon", label: "Carbon Ledger", icon: BarChart3 },
  ];

  return (
    <div className="h-full flex flex-col bg-parchment-dark/80 backdrop-blur-xl border-r border-oak/10">
      {/* ── Header: Journal spine ── */}
      <div className="p-5 border-b border-oak/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-moss/90 flex items-center justify-center shadow-sm">
              <Sprout className="w-5 h-5 text-parchment" />
            </div>
            <div>
              <h2 className="text-base font-header text-oak leading-tight tracking-wide">Sorcer</h2>
              <p className="text-[11px] font-sub text-oak-light/60">Carbon Arbitrage Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-oak/40 hover:text-oak hover:bg-oak/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode badge */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-moss/10 border border-moss/20">
          <TreePine className="w-3.5 h-3.5 text-moss" />
          <span className="text-xs font-medium text-moss">
            {isAutoMode ? "Auto Sustainable" : mode === "manual" ? "Manual Selection" : "Eco Mode"}
          </span>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-moss animate-pulse" />
        </div>
      </div>

      {/* ── Navigation tabs ── */}
      <div className="px-3 pt-3 flex gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200
                ${activeSection === item.id
                  ? "bg-parchment text-oak shadow-sm border border-oak/10"
                  : "text-oak/50 hover:text-oak hover:bg-parchment/50"
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {activeSection === "history" && (
          <div className="space-y-2">
            {chatHistory.map((chat) => (
              <button
                key={chat.id}
                className="w-full text-left p-3 rounded-xl bg-parchment/60 border border-oak/8 hover:border-oak/15 hover:shadow-sm transition-all duration-200 group"
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${chat.eco ? "bg-moss" : "bg-topaz"}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-oak truncate group-hover:text-moss transition-colors">
                      {chat.title}
                    </h4>
                    <p className="text-xs text-oak-light/50 truncate mt-0.5">{chat.preview}</p>
                  </div>
                  <span className="text-[10px] text-oak/30 shrink-0">{chat.timestamp}</span>
                </div>
              </button>
            ))}

            <button className="w-full mt-2 p-2.5 rounded-xl border border-dashed border-oak/15 text-xs text-oak/40 hover:text-oak/60 hover:border-oak/25 transition-all duration-200 flex items-center justify-center gap-1.5">
              <Feather className="w-3 h-3" />
              New Conversation
            </button>
          </div>
        )}

        {activeSection === "carbon" && (
          <div className="space-y-3">
            {/* Big stat card */}
            <div className="specimen-card p-4">
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-3xl font-header text-moss leading-none">{carbonStats.totalSaved}</span>
                <span className="text-xs text-oak-light/60">{carbonStats.unit}</span>
              </div>
              <p className="text-[11px] text-oak-light/50">Total carbon diverted from dirty grids</p>

              {/* Mini progress bar */}
              <div className="mt-3 h-1.5 rounded-full bg-oak/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-linear-to-r from-moss to-moss-light transition-all duration-1000"
                  style={{ width: `${carbonStats.ecoPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-oak/30">Eco usage</span>
                <span className="text-[10px] font-medium text-moss">{carbonStats.ecoPercent}%</span>
              </div>
            </div>

            {/* Stat pills */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-parchment/60 border border-oak/8">
                <div className="flex items-center gap-1.5 mb-1">
                  <History className="w-3 h-3 text-sage" />
                  <span className="text-[10px] text-oak/40">Prompts</span>
                </div>
                <span className="text-lg font-header text-oak">{carbonStats.promptsRouted}</span>
              </div>
              <div className="p-3 rounded-xl bg-parchment/60 border border-oak/8">
                <div className="flex items-center gap-1.5 mb-1">
                  <Leaf className="w-3 h-3 text-moss" />
                  <span className="text-[10px] text-oak/40">Trees equiv.</span>
                </div>
                <span className="text-lg font-header text-moss">5.2</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-4 border-t border-oak/8">
        <div className="flex items-center justify-between text-[10px] text-oak/30">
          <span className="font-sub text-xs">Sorcer v1.0</span>
          <div className="flex items-center gap-1">
            <Leaf className="w-2.5 h-2.5" />
            <span>Protecting Digital Earth</span>
          </div>
        </div>
      </div>
    </div>
  );
}
