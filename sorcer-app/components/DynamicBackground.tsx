"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AuroraBackground } from "./ui/aurora-background";
import { BackgroundBeams } from "./ui/background-beams";
import { useEnergy } from "@/context/EnergyContext";

export function DynamicBackground({ children }: { children: React.ReactNode }) {
  const { isEcoMode } = useEnergy();

  return (
    <AnimatePresence mode="wait">
      {isEcoMode ? (
        <motion.div
          key="eco-mode"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-0"
        >
          <BackgroundBeams>{children}</BackgroundBeams>
        </motion.div>
      ) : (
        <motion.div
          key="force-mode"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-0"
        >
          <AuroraBackground>{children}</AuroraBackground>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
