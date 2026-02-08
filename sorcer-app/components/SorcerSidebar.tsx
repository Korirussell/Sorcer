"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Leaf,
  BarChart3,
  TreePine,
  BookOpen,
  Feather,
  Globe,
  User,
  Clock,
  Moon,
  Sun,
  Sparkles,
  PanelLeftClose,
  FlaskConical,
  Trash2,
  Info,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEnergy } from "@/context/EnergyContext";
import { useTheme } from "next-themes";
import { getAllChats, clearAllChats, createChat, seedIfEmpty, type ChatRecord } from "@/lib/localChatStore";
import { ChatBreakdownPopup } from "@/components/ChatBreakdownPopup";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCollapse?: () => void;
}

const SHORTCUT_KEYS = ["⌘1", "⌘2", "⌘3", "⌘4", "⌘5"];

// Mock pending task count (would come from shared state in real app)
const PENDING_TASKS = 2;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function SorcerSidebar({ isOpen, onClose, onCollapse }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAutoMode, mode } = useEnergy();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const [chatHistory, setChatHistory] = useState<ChatRecord[]>([]);
  const [breakdownChat, setBreakdownChat] = useState<ChatRecord | null>(null);

  const refreshChats = useCallback(() => {
    seedIfEmpty();
    setChatHistory(getAllChats());
  }, []);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  // Refresh when navigating back to sidebar
  useEffect(() => {
    refreshChats();
  }, [pathname, refreshChats]);

  const handleNewChat = () => {
    const id = crypto.randomUUID();
    createChat({
      id,
      title: "New Conversation",
      createdAt: new Date().toISOString(),
      carbonSaved: 0,
      promptCount: 0,
      model: "auto",
      region: "auto",
    });
    refreshChats();
    router.push(`/chat/${id}`);
    onClose();
  };

  const handleClearAll = () => {
    clearAllChats();
    refreshChats();
  };

  const navItems = [
    { id: "history", label: "Field Notes", icon: BookOpen, href: "/", badge: 0 },
    { id: "carbon", label: "Carbon Ledger", icon: BarChart3, href: "/ledger", badge: 0 },
    { id: "map", label: "Realm Map", icon: Globe, href: "/map", badge: 0 },
    { id: "profile", label: "Your Profile", icon: User, href: "/profile", badge: 0 },
    { id: "scheduler", label: "Task Scroll", icon: Clock, href: "/scheduler", badge: PENDING_TASKS },
    { id: "projects", label: "Agentic Lab", icon: FlaskConical, href: "/projects", badge: 0 },
  ];

  // Determine active nav from current route
  const routeMap: Record<string, string> = {
    "/": "history",
    "/ledger": "carbon",
    "/map": "map",
    "/profile": "profile",
    "/scheduler": "scheduler",
    "/projects": "projects",
  };
  const activeNav = routeMap[pathname] || "history";

  const handleReplayTour = () => {
    localStorage.removeItem("sorcer-tour-seen");
    window.dispatchEvent(new Event("restart-tour"));
  };

  return (
    <div className="h-full flex flex-col bg-parchment-dark/80 backdrop-blur-xl border-r border-oak/10">
      {/* ── Header: Logo + Home link ── */}
      <div className="p-5 border-b border-oak/10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-11 h-11 rounded-xl bg-parchment border border-oak/15 flex items-center justify-center shadow-sm overflow-hidden">
              <Image
                src="/images/logo.png"
                alt="Sorcer"
                width={60}
                height={60}
                className="object-contain"
              />
            </div>
            <div>
              <h2 className="text-base font-header text-oak leading-tight tracking-wide">Sorcer</h2>
              <p className="text-[11px] font-sub text-oak-light/60">Carbon Arbitrage Engine</p>
            </div>
          </button>
          <div className="flex items-center gap-1">
            {/* Desktop collapse button */}
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="hidden lg:block p-1.5 rounded-lg text-oak/30 hover:text-oak hover:bg-oak/5 transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
            {/* Mobile close */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-oak/40 hover:text-oak hover:bg-oak/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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

      {/* ── Vertical Navigation ── */}
      <div data-tour="sidebar-nav" className="px-3 pt-3 space-y-1">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                router.push(item.href);
                onClose();
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-parchment text-oak shadow-sm border border-oak/10"
                  : "text-oak/50 hover:text-oak hover:bg-parchment/50"
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-moss" : ""}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {/* Pending task badge */}
              {item.badge > 0 && (
                <span className="bg-topaz/20 text-topaz text-[10px] rounded-full px-1.5 py-0.5 font-medium">
                  {item.badge}
                </span>
              )}
              {/* Keyboard shortcut hint */}
              <span className="text-[9px] text-oak/20 font-mono">{SHORTCUT_KEYS[idx]}</span>
            </button>
          );
        })}
      </div>

      {/* ── Chat History (always visible) ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="text-[10px] text-oak/30 uppercase tracking-wider px-1 mb-2">Recent Chats</p>
        <div className="space-y-1.5">
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              onClick={() => { router.push(`/chat/${chat.id}`); onClose(); }}
              className="w-full text-left p-3 rounded-xl bg-parchment/60 border border-oak/8 hover:border-oak/15 hover:shadow-sm transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${chat.carbonSaved > 0 ? "bg-moss" : "bg-topaz"}`} />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-oak truncate group-hover:text-moss transition-colors">
                    {chat.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    {chat.carbonSaved > 0 && (
                      <span className="text-[10px] text-moss font-medium">
                        −{chat.carbonSaved < 1000 ? `${chat.carbonSaved.toFixed(1)}g` : `${(chat.carbonSaved / 1000).toFixed(2)}kg`}
                      </span>
                    )}
                    <span className="text-[10px] text-oak/25">{chat.promptCount} prompts</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-oak/30">{timeAgo(chat.createdAt)}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setBreakdownChat(chat); }}
                      className="p-1 rounded-md text-oak/20 hover:text-topaz hover:bg-topaz/10 transition-colors"
                      title="Quick Breakdown"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/breakdown/${chat.id}`); onClose(); }}
                      className="p-1 rounded-md text-oak/20 hover:text-moss hover:bg-moss/10 transition-colors"
                      title="Full Breakdown Page"
                    >
                      <FlaskConical className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleNewChat}
            className="w-full mt-1 p-2.5 rounded-xl border border-dashed border-oak/15 text-xs text-oak/40 hover:text-oak/60 hover:border-oak/25 transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            <Feather className="w-3 h-3" />
            New Conversation
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="p-4 border-t border-oak/8 space-y-2">
        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-oak/50 hover:text-oak hover:bg-parchment/50 transition-all duration-200 active:scale-95"
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-topaz" /> : <Moon className="w-3.5 h-3.5" />}
          {isDark ? "Purify (Light Mode)" : "Corrupt (Dark Mode)"}
        </button>

        {/* Replay tour */}
        <button
          onClick={handleReplayTour}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-oak/50 hover:text-oak hover:bg-parchment/50 transition-all duration-200 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Tour Guide
        </button>

        {/* Clear all chats */}
        {chatHistory.length > 0 && (
          <button
            onClick={handleClearAll}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-witchberry/50 hover:text-witchberry hover:bg-witchberry/5 transition-all duration-200 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All Chats
          </button>
        )}

        <div className="flex items-center justify-between text-[10px] text-oak/30 pt-1">
          <button
            onClick={() => { router.push("/developer"); onClose(); }}
            className="font-sub text-xs hover:text-oak/50 transition-colors cursor-default"
            title=""
          >
            Sorcer v1.0
          </button>
          <div className="flex items-center gap-1">
            <Leaf className="w-2.5 h-2.5" />
            <span>Protecting Digital Earth</span>
          </div>
        </div>
      </div>

      {/* Breakdown Popup */}
      <AnimatePresence>
        {breakdownChat && (
          <ChatBreakdownPopup
            chat={breakdownChat}
            onClose={() => setBreakdownChat(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
