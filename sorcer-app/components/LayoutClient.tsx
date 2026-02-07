"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SorcerSidebar } from "@/components/SorcerSidebar";
import { CarbonIndicator } from "@/components/CarbonIndicator";

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-parchment">
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

      {/* Main Layout */}
      <div className="flex min-h-screen">
        {/* Sidebar — Botanical journal spine */}
        <aside
          className={`
            fixed lg:sticky lg:top-0 top-0 left-0 h-screen w-[300px] z-40
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <SorcerSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen relative">
          <div className="h-full w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
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
