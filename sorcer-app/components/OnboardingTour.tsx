"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Sparkles } from "lucide-react";

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: "bottom" | "top" | "right" | "left";
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-spellbar]",
    title: "The Spell Bar",
    description: "Type your prompt here — the Oracle will route it to the cleanest available model.",
    position: "bottom",
  },
  {
    target: "[data-tour='carbon-indicator']",
    title: "Carbon Indicator",
    description: "This shows your real-time carbon savings and current grid status.",
    position: "bottom",
  },
  {
    target: "[data-tour='sidebar-nav']",
    title: "Navigation",
    description: "Explore the Realm Map, Carbon Ledger, your Profile, and the Task Scheduler.",
    position: "right",
  },
];

const STORAGE_KEY = "sorcer-tour-seen";

export function OnboardingTour() {
  const [step, setStep] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [hasSeen, setHasSeen] = useState(true);

  // First-visit auto-trigger
  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setHasSeen(false);
      const timer = setTimeout(() => setStep(0), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for external restart-tour event (from sidebar replay button)
  useEffect(() => {
    const handler = () => {
      setHasSeen(false);
      setStep(0);
    };
    window.addEventListener("restart-tour", handler);
    return () => window.removeEventListener("restart-tour", handler);
  }, []);

  // Position tooltip near target element
  useEffect(() => {
    if (step < 0 || step >= TOUR_STEPS.length) {
      setRect(null);
      return;
    }
    const el = document.querySelector(TOUR_STEPS[step].target);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [step]);

  const advance = useCallback(() => {
    if (step >= TOUR_STEPS.length - 1) {
      setStep(-1);
      setHasSeen(true);
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      setStep((s) => s + 1);
    }
  }, [step]);

  const dismiss = useCallback(() => {
    setStep(-1);
    setHasSeen(true);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  if (hasSeen || step < 0 || step >= TOUR_STEPS.length) return null;

  const current = TOUR_STEPS[step];

  // Calculate tooltip position — clamp horizontally so the tooltip
  // never overflows the left or right edge of the viewport.
  const TOOLTIP_WIDTH = 288; // w-72 = 18rem = 288px
  const EDGE_PADDING = 12;

  let tooltipStyle: React.CSSProperties = {};
  if (rect) {
    const clampX = (centerX: number) =>
      Math.min(
        Math.max(EDGE_PADDING, centerX - TOOLTIP_WIDTH / 2),
        window.innerWidth - TOOLTIP_WIDTH - EDGE_PADDING
      );

    switch (current.position) {
      case "bottom":
        tooltipStyle = { top: rect.bottom + 12, left: clampX(rect.left + rect.width / 2) };
        break;
      case "top":
        tooltipStyle = { bottom: window.innerHeight - rect.top + 12, left: clampX(rect.left + rect.width / 2) };
        break;
      case "right":
        tooltipStyle = { top: rect.top + rect.height / 2, left: rect.right + 12, transform: "translateY(-50%)" };
        break;
      case "left":
        tooltipStyle = { top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + 12, transform: "translateY(-50%)" };
        break;
    }
  } else {
    // Fallback: center of screen
    tooltipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-60 bg-oak/10 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={dismiss}
      />

      {/* Highlight ring around target */}
      {rect && (
        <motion.div
          className="fixed z-61 pointer-events-none rounded-2xl"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 4000px rgba(26,21,16,0.3), 0 0 12px rgba(75,106,76,0.4)",
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="fixed z-62 w-72"
          style={tooltipStyle}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <div className="specimen-card p-4 shadow-specimen-hover">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-moss" />
                <span className="text-xs text-oak/40 font-medium">
                  {step + 1} / {TOUR_STEPS.length}
                </span>
              </div>
              <button
                onClick={dismiss}
                className="p-1 rounded-lg hover:bg-oak/5 text-oak/30 hover:text-oak transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <h4 className="text-sm font-header text-oak mb-1">{current.title}</h4>
            <p className="text-xs text-oak-light/60 leading-relaxed">{current.description}</p>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={dismiss}
                className="text-[10px] text-oak/30 hover:text-oak/50 transition-colors"
              >
                Skip tour
              </button>
              <button
                onClick={advance}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-moss/15 text-moss text-xs font-medium hover:bg-moss/25 transition-colors border border-moss/20"
              >
                {step === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
