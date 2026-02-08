"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Zap, Leaf, Flame, Bot, UserIcon } from "lucide-react";
import type { StoredMessage } from "@/lib/localChatStore";

const MODEL_ICONS: Record<string, { icon: typeof Leaf; color: string; label: string }> = {
  "google/gemini-2.5-flash-lite": { icon: Leaf, color: "text-moss", label: "Eco" },
  "anthropic/claude-haiku-4.5": { icon: Zap, color: "text-topaz", label: "Balanced" },
  "openai/gpt-5.2": { icon: Flame, color: "text-witchberry", label: "Power" },
};

function MessageCard({ msg, index }: { msg: StoredMessage; index: number }) {
  const isAssistant = msg.role === "assistant";
  const modelInfo = MODEL_ICONS[msg.carbon.model] || { icon: Bot, color: "text-oak", label: msg.carbon.model.split("/").pop() };
  const ModelIcon = modelInfo.icon;
  const savingsPct = msg.carbon.baseline_g > 0 ? ((msg.carbon.saved_g / msg.carbon.baseline_g) * 100) : 0;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, type: "spring", stiffness: 120, damping: 20 }}
    >
      {/* Timeline connector */}
      {index > 0 && (
        <div className="absolute -top-3 left-5 w-px h-3 bg-oak/10" />
      )}

      <div className={`specimen-card p-4 ${isAssistant ? "" : "bg-parchment-dark/50"}`}>
        <div className="flex items-start gap-3">
          {/* Role icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAssistant ? "bg-moss/10" : "bg-oak/5"}`}>
            {isAssistant ? <Bot className="w-4 h-4 text-moss" /> : <UserIcon className="w-4 h-4 text-oak/50" />}
          </div>

          <div className="flex-1 min-w-0">
            {/* Message preview */}
            <p className="text-xs text-oak/70 line-clamp-2 mb-2">{msg.content.slice(0, 150)}{msg.content.length > 150 ? "..." : ""}</p>

            {/* Carbon stats (only for assistant messages with actual carbon data) */}
            {isAssistant && msg.carbon.cost_g > 0 && (
              <div className="space-y-2">
                {/* Carbon bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 rounded-full bg-oak/8 overflow-hidden relative">
                    {/* Baseline (full width, faded) */}
                    <div className="absolute inset-0 bg-witchberry/8 rounded-full" />
                    {/* Actual cost */}
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-moss/30 rounded-full"
                      initial={{ width: "100%" }}
                      animate={{ width: `${(msg.carbon.cost_g / msg.carbon.baseline_g) * 100}%` }}
                      transition={{ duration: 0.8, delay: index * 0.12 + 0.3, ease: "easeOut" }}
                    />
                    {/* Saved portion pulse */}
                    <motion.div
                      className="absolute inset-y-0 rounded-full bg-moss/15"
                      style={{ left: `${(msg.carbon.cost_g / msg.carbon.baseline_g) * 100}%`, right: 0 }}
                      animate={{ opacity: [0.15, 0.3, 0.15] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <span className="text-[10px] text-moss font-medium whitespace-nowrap">
                    −{savingsPct.toFixed(0)}%
                  </span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Model badge */}
                  <motion.span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${modelInfo.color} bg-current/5 border border-current/10`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.12 + 0.4, type: "spring", stiffness: 200 }}
                  >
                    <ModelIcon className="w-2.5 h-2.5" />
                    {modelInfo.label}
                  </motion.span>

                  {/* Region badge */}
                  <span className="px-2 py-0.5 rounded-md text-[10px] text-oak/50 bg-oak/5 border border-oak/8">
                    {msg.carbon.region} · {msg.carbon.cfe_percent}% CFE
                  </span>

                  {/* Cache hit */}
                  {msg.carbon.cached && (
                    <motion.span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-topaz bg-topaz/8 border border-topaz/15"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.12 + 0.5 }}
                    >
                      <Zap className="w-2.5 h-2.5" />
                      {msg.carbon.cache_hit_tokens} cached
                    </motion.span>
                  )}

                  {/* Compression */}
                  {msg.carbon.compressed && msg.carbon.compression_ratio < 1 && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] text-miami bg-miami/8 border border-miami/15">
                      {Math.round((1 - msg.carbon.compression_ratio) * 100)}% compressed
                    </span>
                  )}
                </div>

                {/* Micro stats */}
                <div className="flex items-center gap-3 text-[10px] text-oak/30">
                  <span>{msg.carbon.cost_g.toFixed(2)}g CO₂</span>
                  <span>·</span>
                  <span>{msg.carbon.tokens_in + msg.carbon.tokens_out} tokens</span>
                  <span>·</span>
                  <span>{msg.carbon.latency_ms}ms</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MessageTimelineInner({ messages }: { messages: StoredMessage[] }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-header text-oak mb-2">Message Timeline</h4>
      {messages.map((msg, i) => (
        <MessageCard key={msg.id} msg={msg} index={i} />
      ))}
    </div>
  );
}

export const MessageTimeline = memo(MessageTimelineInner);
