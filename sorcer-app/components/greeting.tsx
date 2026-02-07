"use client";

import { motion } from "framer-motion";

export const Greeting = () => {
  return (
    <div
      className="mx-auto flex size-full max-w-4xl flex-col items-center justify-center px-4 py-12 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 text-center"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-zinc-100 text-5xl font-bold md:text-6xl">
          🧙‍♂️ Sourcer
        </h1>
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-zinc-400 text-lg md:text-xl">
          Manage your Mana. Code Sustainably.
        </p>
      </motion.div>
    </div>
  );
};
