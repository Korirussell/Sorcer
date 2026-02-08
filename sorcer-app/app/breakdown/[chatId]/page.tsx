"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Leaf, TreePine, Zap, Bot } from "lucide-react";
import { getChat, getMessages, type ChatRecord, type StoredMessage } from "@/lib/localChatStore";
import { PromptCacheViz } from "@/components/PromptCacheViz";
import { CompressionViz } from "@/components/CompressionViz";
import { MessageTimeline } from "@/components/MessageTimeline";
import { RoutingViz } from "@/components/RoutingViz";

function AnimatedCounter({ value, suffix = "", decimals = 2, className = "" }: { value: number; suffix?: string; decimals?: number; className?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out with slight overshoot (spring-like)
      const eased = progress < 1
        ? 1 - Math.pow(1 - progress, 3) + (progress > 0.7 ? Math.sin((progress - 0.7) * 10) * 0.02 : 0)
        : 1;
      setDisplay(value * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className={className}>
      {display.toFixed(decimals)}{suffix}
    </span>
  );
}

function TreeEquivalent({ grams }: { grams: number }) {
  // A mature tree absorbs ~22kg CO₂/year = ~2.5g/hour
  const treeHours = grams / 2.5;
  return (
    <motion.div
      className="flex items-center gap-2 text-sm text-moss/70"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
    >
      <TreePine className="w-4 h-4" />
      <span>Equivalent to <strong>{treeHours.toFixed(1)} tree-hours</strong> of absorption</span>
    </motion.div>
  );
}

export default function BreakdownPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;

  const [chat, setChat] = useState<ChatRecord | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const c = getChat(chatId);
    const m = getMessages(chatId);
    setChat(c || null);
    setMessages(m);
    setLoaded(true);
  }, [chatId]);

  // Aggregate stats from messages
  const stats = useMemo(() => {
    const assistantMsgs = messages.filter((m) => m.role === "assistant" && m.carbon.cost_g > 0);
    const totalCost = assistantMsgs.reduce((s, m) => s + m.carbon.cost_g, 0);
    const totalBaseline = assistantMsgs.reduce((s, m) => s + m.carbon.baseline_g, 0);
    const totalSaved = assistantMsgs.reduce((s, m) => s + m.carbon.saved_g, 0);
    const totalCacheHits = assistantMsgs.reduce((s, m) => s + m.carbon.cache_hit_tokens, 0);
    const totalTokensIn = assistantMsgs.reduce((s, m) => s + m.carbon.tokens_in, 0);
    const totalTokensOut = assistantMsgs.reduce((s, m) => s + m.carbon.tokens_out, 0);
    const totalTokens = totalTokensIn + totalTokensOut;

    const compressedMsgs = assistantMsgs.filter((m) => m.carbon.compressed && m.carbon.compression_ratio < 1);
    const avgCompression = compressedMsgs.length > 0
      ? compressedMsgs.reduce((s, m) => s + m.carbon.compression_ratio, 0) / compressedMsgs.length
      : 1;
    const totalOriginalTokens = compressedMsgs.reduce((s, m) => s + m.carbon.original_tokens, 0);
    const totalCompressedTokens = compressedMsgs.reduce((s, m) => s + m.carbon.compressed_tokens, 0);

    const reductionPct = totalBaseline > 0 ? ((totalSaved / totalBaseline) * 100) : 0;
    const cacheHitRate = totalTokens > 0 ? totalCacheHits / totalTokens : 0;

    // Get primary model/region from first assistant message
    const firstAssistant = assistantMsgs[0];
    const primaryModel = firstAssistant?.carbon.model || "auto";
    const primaryRegion = firstAssistant?.carbon.region || "auto";
    const primaryCfe = firstAssistant?.carbon.cfe_percent || 0;

    return {
      totalCost,
      totalBaseline,
      totalSaved,
      reductionPct,
      totalCacheHits,
      totalTokens,
      cacheHitRate,
      avgCompression,
      totalOriginalTokens,
      totalCompressedTokens,
      primaryModel,
      primaryRegion,
      primaryCfe,
      messageCount: messages.length,
      promptCount: messages.filter((m) => m.role === "user").length,
    };
  }, [messages]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-moss/30 border-t-moss rounded-full animate-spin" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-oak/50 text-sm">Chat not found</p>
        <button onClick={() => router.push("/")} className="text-moss text-sm hover:underline">
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Floating particles background effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-moss/20"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0, 0.4, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-8">
        {/* Back button */}
        <motion.button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-oak/50 hover:text-oak transition-colors mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </motion.button>

        {/* Chat title */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl font-header text-oak mb-2">{chat.title}</h1>
          <div className="flex items-center gap-3 text-xs text-oak/40">
            <span>{stats.messageCount} messages</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Bot className="w-3 h-3" />
              {stats.primaryModel.split("/").pop()}
            </span>
            <span>·</span>
            <span>{stats.primaryRegion}</span>
          </div>
        </motion.div>

        {/* ═══ HERO STAT ═══ */}
        <motion.div
          className="specimen-card p-6 mb-6 relative overflow-visible"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
        >
          {/* Green glow aura */}
          <div className="absolute -inset-2 rounded-3xl bg-moss/5 blur-xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-5 h-5 text-moss" />
              <span className="text-sm font-sub text-moss/70">Carbon Saved</span>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <AnimatedCounter
                value={stats.totalSaved}
                suffix="g"
                decimals={2}
                className="text-5xl font-header text-moss"
              />
              <span className="text-lg text-oak/30">CO₂</span>
            </div>

            {/* Progress bar with liquid effect */}
            <div className="h-4 rounded-full bg-oak/8 overflow-hidden mb-3 relative">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: "linear-gradient(90deg, #4B6A4C, #5E8260, #4B6A4C)",
                  backgroundSize: "200% 100%",
                }}
                initial={{ width: 0 }}
                animate={{
                  width: `${stats.reductionPct}%`,
                  backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
                }}
                transition={{
                  width: { duration: 1.5, ease: "easeOut", delay: 0.4 },
                  backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" },
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  className="text-[11px] font-medium text-parchment mix-blend-difference"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  {stats.reductionPct.toFixed(0)}% reduction
                </motion.span>
              </div>
            </div>

            <TreeEquivalent grams={stats.totalSaved} />

            {/* Baseline comparison */}
            <motion.div
              className="mt-3 flex items-center gap-4 text-xs text-oak/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              <span>Actual: {stats.totalCost.toFixed(2)}g</span>
              <span>Baseline: {stats.totalBaseline.toFixed(2)}g</span>
            </motion.div>
          </div>
        </motion.div>

        {/* ═══ CACHING + COMPRESSION CARDS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <PromptCacheViz
              totalTokens={stats.totalTokens}
              cachedTokens={stats.totalCacheHits}
              cacheHitRate={stats.cacheHitRate}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, type: "spring" }}
          >
            <CompressionViz
              originalTokens={stats.totalOriginalTokens || stats.totalTokens}
              compressedTokens={stats.totalCompressedTokens || Math.round(stats.totalTokens * stats.avgCompression)}
              compressionRatio={stats.avgCompression}
            />
          </motion.div>
        </div>

        {/* ═══ ROUTING VISUALIZATION ═══ */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <RoutingViz
            model={stats.primaryModel}
            region={stats.primaryRegion}
            cfePercent={stats.primaryCfe}
          />
        </motion.div>

        {/* ═══ MESSAGE TIMELINE ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <MessageTimeline messages={messages} />
        </motion.div>

        {/* Footer */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <p className="text-[11px] text-oak/20 font-sub">
            Carbon data estimated using real-time grid intensity signals
          </p>
        </motion.div>
      </div>
    </div>
  );
}
