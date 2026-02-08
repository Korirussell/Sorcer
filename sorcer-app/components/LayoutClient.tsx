"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, X, PanelLeftOpen } from "lucide-react";
import Image from "next/image";
import { SorcerSidebar } from "@/components/SorcerSidebar";
import { CarbonIndicator } from "@/components/CarbonIndicator";
import { ScrollBackground } from "@/components/ScrollBackground";
import { PageTransition } from "@/components/PageTransition";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { OnboardingTour } from "@/components/OnboardingTour";
import { MagicParticles } from "@/components/MagicParticles";
import { CursorOrb } from "@/components/CursorOrb";

const COLLAPSED_KEY = "sorcer-sidebar-collapsed";

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === "true") setIsCollapsed(true);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <div className="relative min-h-screen bg-parchment">
      {/* Scroll-reactive background effects */}
      <ScrollBackground />

      {/* Floating magic particles */}
      <MagicParticles />

      {/* Global cursor orb */}
      <CursorOrb />

      {/* Keyboard shortcuts */}
      <KeyboardShortcuts onCloseSidebar={() => setIsSidebarOpen(false)} />

      {/* Onboarding tour (first visit only) */}
      <OnboardingTour />

      {/* Carbon Indicator — top-right glass pill */}
      <CarbonIndicator />

      {/* Mobile Menu Toggle — iOS-style pill button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-2xl glass-panel shadow-specimen text-oak hover:shadow-specimen-hover transition-all duration-200 active:scale-95"
        aria-label="Toggle menu"
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Desktop collapsed re-open pill */}
      {isCollapsed && (
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex fixed top-4 left-4 z-50 items-center gap-2 px-3 py-2 rounded-2xl glass-panel shadow-specimen text-oak hover:shadow-specimen-hover transition-all duration-200 active:scale-95"
          aria-label="Open sidebar"
        >
          <div className="w-6 h-6 rounded-lg overflow-hidden">
            <Image src="/images/logo.png" alt="Sorcer" width={24} height={24} className="object-contain" />
          </div>
          <PanelLeftOpen className="w-3.5 h-3.5 text-oak/40" />
        </button>
      )}

      {/* Main Layout */}
      <div className="flex min-h-screen">
        {/* Sidebar — Botanical journal spine */}
        <aside
          className={`
            fixed lg:sticky lg:top-0 top-0 left-0 h-screen w-[300px] z-40
            transform transition-all duration-300 ease-in-out shrink-0
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            ${isCollapsed ? "lg:-translate-x-full lg:w-0 lg:overflow-hidden" : "lg:translate-x-0"}
          `}
        >
          <SorcerSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onCollapse={toggleCollapse}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen relative">
          <div className="h-full w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>

      {/* Mobile Backdrop — frosted glass */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-oak/5 backdrop-blur-sm z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
