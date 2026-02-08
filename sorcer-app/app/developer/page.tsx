"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { SemanticCacheGraph3D } from "@/components/SemanticCacheGraph";

export default function DeveloperPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen py-6 px-4 sm:px-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/")} className="p-1.5 rounded-lg text-oak/40 hover:text-oak hover:bg-oak/5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-header text-oak">Developer Details</h1>
          <p className="text-[11px] text-oak/40">Semantic cache performance &amp; token savings</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SemanticCacheGraph3D />
      </motion.div>
    </div>
  );
}
