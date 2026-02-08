"use client";

import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const pageVariants = {
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

function PageTransitionInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
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
