"use client";

import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const defaultVariants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.998,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.999,
  },
};

const grimoireVariants = {
  initial: {
    opacity: 0,
    rotateY: -12,
    x: -30,
    scale: 0.96,
    transformOrigin: "left center",
  },
  animate: {
    opacity: 1,
    rotateY: 0,
    x: 0,
    scale: 1,
    transformOrigin: "left center",
  },
  exit: {
    opacity: 0,
    rotateY: 8,
    x: 20,
    scale: 0.98,
    transformOrigin: "left center",
  },
};

function PageTransitionInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const key = typeof window !== 'undefined' ? window.location.href : pathname;
  const isChatRoute = pathname.startsWith("/chat/");
  const variants = isChatRoute ? grimoireVariants : defaultVariants;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: isChatRoute ? 0.35 : 0.25,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        style={isChatRoute ? { perspective: 1200 } : undefined}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>{children}</div>}>
      <PageTransitionInner>{children}</PageTransitionInner>
    </Suspense>
  );
}
