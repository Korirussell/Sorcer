"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Play,
  X as XIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Scroll,
  Hourglass,
  Sparkles,
  Home,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createChat } from "@/lib/localChatStore";

// ─── Types ───────────────────────────────────────────────────────────────────

type TaskStatus = "pending" | "processing" | "completed" | "failed";
type ForecastIntensity = "optimal" | "medium" | "high";

interface ScheduledTask {
  id: string;
  prompt: string;
  status: TaskStatus;
  scheduledFor?: string;
  completedAt?: string;
  region: string;
  estimatedSavings?: string;
  actualSavings?: string;
}

interface ForecastHour {
  hour: string;
  intensity: ForecastIntensity;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const INITIAL_TASKS: ScheduledTask[] = [
  { id: "task_001", prompt: "Analyze the environmental impact of cloud computing in 2026", status: "pending", scheduledFor: "2026-02-08T02:00:00Z", region: "us-central1", estimatedSavings: "2.3g CO₂" },
  { id: "task_002", prompt: "Generate a comprehensive report on renewable energy trends", status: "pending", scheduledFor: "2026-02-08T04:00:00Z", region: "us-west1", estimatedSavings: "4.1g CO₂" },
  { id: "task_003", prompt: "Summarize latest carbon capture research papers", status: "completed", completedAt: "2026-02-07T03:00:00Z", region: "us-central1", actualSavings: "3.7g CO₂" },
  { id: "task_004", prompt: "Compare sustainable packaging materials for e-commerce", status: "processing", scheduledFor: "2026-02-07T23:30:00Z", region: "us-west1", estimatedSavings: "1.8g CO₂" },
  { id: "task_005", prompt: "Draft a proposal for carbon offset program", status: "failed", scheduledFor: "2026-02-07T01:00:00Z", region: "us-east4", estimatedSavings: "0.9g CO₂" },
];

const MOCK_FORECAST: ForecastHour[] = [
  { hour: "6 PM", intensity: "high" },
  { hour: "7 PM", intensity: "high" },
  { hour: "8 PM", intensity: "medium" },
  { hour: "9 PM", intensity: "medium" },
  { hour: "10 PM", intensity: "medium" },
  { hour: "11 PM", intensity: "medium" },
  { hour: "12 AM", intensity: "optimal" },
  { hour: "1 AM", intensity: "optimal" },
  { hour: "2 AM", intensity: "optimal" },
  { hour: "3 AM", intensity: "optimal" },
  { hour: "4 AM", intensity: "optimal" },
  { hour: "5 AM", intensity: "medium" },
  { hour: "6 AM", intensity: "medium" },
  { hour: "7 AM", intensity: "high" },
  { hour: "8 AM", intensity: "high" },
  { hour: "9 AM", intensity: "high" },
  { hour: "10 AM", intensity: "medium" },
  { hour: "11 AM", intensity: "medium" },
  { hour: "12 PM", intensity: "medium" },
  { hour: "1 PM", intensity: "high" },
  { hour: "2 PM", intensity: "high" },
  { hour: "3 PM", intensity: "high" },
  { hour: "4 PM", intensity: "medium" },
  { hour: "5 PM", intensity: "medium" },
];

// ─── Status Helpers ──────────────────────────────────────────────────────────

function statusConfig(status: TaskStatus) {
  switch (status) {
    case "pending":
      return { icon: Clock, color: "text-topaz", label: "⏳ Pending" };
    case "processing":
      return { icon: Loader2, color: "text-moss", label: "✨ Casting" };
    case "completed":
      return { icon: CheckCircle2, color: "text-moss", label: "✨ Dispatched" };
    case "failed":
      return { icon: AlertCircle, color: "text-witchberry", label: "💀 Failed" };
  }
}

function intensityColor(intensity: ForecastIntensity): string {
  switch (intensity) {
    case "optimal": return "bg-moss/60";
    case "medium": return "bg-topaz/50";
    case "high": return "bg-witchberry/40";
  }
}

// ─── Animated Hourglass ─────────────────────────────────────────────────────

function AnimatedHourglass({ size = 48 }: { size?: number }) {
  return (
    <motion.div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      animate={{ rotate: [0, 0, 180, 180, 0] }}
      transition={{ duration: 6, repeat: Infinity, times: [0, 0.1, 0.15, 0.9, 0.95], ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        {/* Top bulb */}
        <path d="M14 8 L34 8 L28 22 L20 22 Z" fill="var(--topaz)" opacity={0.2} stroke="var(--oak)" strokeWidth={0.8} strokeOpacity={0.3} />
        {/* Bottom bulb */}
        <path d="M14 40 L34 40 L28 26 L20 26 Z" fill="var(--moss)" opacity={0.2} stroke="var(--oak)" strokeWidth={0.8} strokeOpacity={0.3} />
        {/* Frame */}
        <rect x="12" y="6" width="24" height="2" rx="1" fill="var(--oak)" opacity={0.3} />
        <rect x="12" y="40" width="24" height="2" rx="1" fill="var(--oak)" opacity={0.3} />
        {/* Sand stream */}
        <motion.line
          x1="24" y1="22" x2="24" y2="26"
          stroke="var(--topaz)" strokeWidth={1.5} strokeLinecap="round"
          animate={{ opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        {/* Sand particles */}
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={24} cy={24}
            r={0.8}
            fill="var(--topaz)"
            animate={{ cy: [22, 34], opacity: [0.6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </svg>
    </motion.div>
  );
}

// ─── Compact Forecast Strip ─────────────────────────────────────────────────

function ForecastStrip({ forecast }: { forecast: ForecastHour[] }) {
  const optimalHours = forecast.filter((f) => f.intensity === "optimal");
  const optimalWindow = optimalHours.length > 0
    ? `${optimalHours[0].hour} – ${optimalHours[optimalHours.length - 1].hour}`
    : "Calculating...";

  return (
    <motion.div
      className="specimen-card p-4 mb-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-3.5 h-3.5 text-oak/40" />
        <span className="text-xs font-medium text-oak">Carbon Forecast</span>
        <span className="text-[10px] text-moss font-medium ml-auto">Optimal: {optimalWindow}</span>
      </div>
      <div className="flex items-end gap-px h-8 rounded overflow-hidden">
        {forecast.map((f, i) => (
          <motion.div
            key={i}
            className={`flex-1 ${intensityColor(f.intensity)} rounded-t-sm`}
            style={{ height: f.intensity === "optimal" ? "30%" : f.intensity === "medium" ? "60%" : "90%" }}
            initial={{ height: 0 }}
            animate={{ height: f.intensity === "optimal" ? "30%" : f.intensity === "medium" ? "60%" : "90%" }}
            transition={{ duration: 0.4, delay: i * 0.02 }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-moss/60" />
          <span className="text-[8px] text-oak/30">Clean</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-topaz/50" />
          <span className="text-[8px] text-oak/30">Mixed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-witchberry/40" />
          <span className="text-[8px] text-oak/30">Dirty</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Scroll Task Card ───────────────────────────────────────────────────────

function ScrollCard({
  task,
  index,
  onExecute,
  onCancel,
}: {
  task: ScheduledTask;
  index: number;
  onExecute: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const config = statusConfig(task.status);
  const rotation = index % 2 === 0 ? -0.5 : 0.5;
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, rotate: rotation * 2 }}
      animate={{ opacity: 1, x: 0, rotate: rotation }}
      exit={
        isFailed
          ? { opacity: 0, scale: 0.8, rotate: rotation * 4, backgroundColor: "rgba(181,33,33,0.1)" }
          : { opacity: 0, x: 20, height: 0 }
      }
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`
        specimen-card p-4 border border-oak/10 relative overflow-hidden
        ${isCompleted ? "border-l-2 border-l-moss" : isFailed ? "border-l-2 border-l-witchberry/40" : "border-l-2 border-l-topaz/40"}
      `}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* Sparkle overlay for completed */}
      {isCompleted && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2 }}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-topaz"
              style={{ left: `${20 + i * 15}%`, top: `${30 + (i % 3) * 20}%` }}
              animate={{ opacity: [0.8, 0], y: [-5, -20], scale: [1, 0] }}
              transition={{ duration: 1.5, delay: i * 0.15 }}
            />
          ))}
        </motion.div>
      )}

      <div className="flex items-start gap-3">
        <Scroll className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-oak leading-snug">&ldquo;{task.prompt}&rdquo;</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
            <span className="text-[10px] text-oak/30">·</span>
            <span className="text-[10px] text-oak/30">{task.region}</span>
            <span className="text-[10px] text-oak/30">·</span>
            <span className="text-[10px] text-moss font-medium">~{task.actualSavings || task.estimatedSavings || "?"}</span>
          </div>
        </div>

        {/* Action buttons */}
        {task.status === "pending" && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onExecute(task.id)}
              className="p-1.5 rounded-lg bg-moss/10 hover:bg-moss/20 text-moss transition-colors active:scale-95"
              title="Cast Now"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onCancel(task.id)}
              className="p-1.5 rounded-lg bg-witchberry/8 hover:bg-witchberry/15 text-witchberry/60 hover:text-witchberry transition-colors active:scale-95"
              title="Dismiss"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {task.status === "processing" && (
          <Loader2 className="w-4 h-4 text-moss animate-spin shrink-0" />
        )}

        {isCompleted && (
          <Sparkles className="w-4 h-4 text-moss shrink-0" />
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function SchedulerPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<ScheduledTask[]>(INITIAL_TASKS);

  const handleExecute = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    // Create a new chat with this prompt
    const chatId = crypto.randomUUID();
    const title = task.prompt.length > 50 ? task.prompt.slice(0, 50) + "..." : task.prompt;
    
    createChat({
      id: chatId,
      title,
      createdAt: new Date().toISOString(),
      carbonSaved: 0,
      promptCount: 0,
      model: "auto",
      region: task.region,
    });

    // Store the prompt in sessionStorage for the chat page to pick up
    sessionStorage.setItem(`pending-query-${chatId}`, task.prompt);

    // Mark task as processing
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "processing" as TaskStatus } : t))
    );

    // Navigate to the chat page
    router.push(`/chat/${chatId}`);
  };

  const handleCancel = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen py-6 px-4 sm:px-8 max-w-2xl mx-auto">
      <PageHeader title="Enchanted Scroll Queue" subtitle="Spell scrolls deferred to cleaner time windows" />

      {/* ── Animated Hourglass Centerpiece ── */}
      <motion.div
        className="flex flex-col items-center mb-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <AnimatedHourglass size={56} />
        <p className="text-[10px] text-oak/30 font-sub mt-2 italic">The sands of time reveal the cleanest windows...</p>
      </motion.div>

      {/* ── Compact Forecast Strip ── */}
      <ForecastStrip forecast={MOCK_FORECAST} />

      {/* ── Scroll List ── */}
      <div className="flex items-center gap-2 mb-3">
        <Scroll className="w-4 h-4 text-oak/40" />
        <h3 className="text-sm font-medium text-oak font-sub">Spell Scrolls</h3>
        <span className="text-[10px] text-oak/30">{tasks.length} queued</span>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {tasks.map((task, i) => (
            <ScrollCard
              key={task.id}
              task={task}
              index={i}
              onExecute={handleExecute}
              onCancel={handleCancel}
            />
          ))}
        </AnimatePresence>

        {/* ── Cute Empty State ── */}
        {tasks.length === 0 && (
          <motion.div
            className="specimen-card p-10 text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AnimatedHourglass size={64} />
            <h3 className="text-lg font-header text-oak mt-4">No scrolls in the queue</h3>
            <p className="text-xs text-oak/40 mt-1 max-w-xs mx-auto">
              Schedule a spell from the Spell Bar on the home page using the clock icon
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-moss/15 text-moss text-sm font-medium hover:bg-moss/25 transition-colors border border-moss/20"
            >
              <Home className="w-3.5 h-3.5" />
              Go to Field Notes
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
