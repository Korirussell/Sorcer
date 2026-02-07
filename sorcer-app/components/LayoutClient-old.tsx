"use client";

import { useState } from "react";
import { SorcerSidebar } from "@/components/SorcerSidebar";
import { CarbonIndicator } from "@/components/CarbonIndicator";
import { MagicalParticles } from "@/components/MagicalParticles";

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <MagicalParticles />
      <CarbonIndicator />
      <div className="relative z-10 flex min-h-screen">
        {/* SorcerSidebar */}
        <SorcerSidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        
        {/* Main Content */}
        <div className="flex-1 lg:ml-80">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg border border-white/10 bg-black/20 backdrop-blur-md text-mist hover:border-mana/50 transition-all duration-200"
            type="button"
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          
          <div className="relative">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

