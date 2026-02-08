"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  Plus,
  Leaf,
  Clock,
  Cpu,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
  TreePine,
  Brain,
  ArrowRight,
  Loader2,
  AlertCircle,
  Play,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { postAgentProject, postExecuteStep } from "@/utils/api";
import type { ProjectPlan, StepPlan, ExecuteStepResponse } from "@/utils/api";

// ─── Persistence ────────────────────────────────────────────────────────

const STORAGE_KEY = "sorcer-agentic-projects";
const RESULTS_KEY = "sorcer-agentic-results";

/** Stored results are keyed by "planName::stepNumber" */
type ResultsMap = Record<string, ExecuteStepResponse>;

function loadPlans(): ProjectPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProjectPlan[]) : [];
  } catch {
    return [];
  }
}

function savePlans(plans: ProjectPlan[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)); } catch {}
}

function loadResults(): ResultsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? (JSON.parse(raw) as ResultsMap) : {};
  } catch {
    return {};
  }
}

function saveResults(results: ResultsMap) {
  try { localStorage.setItem(RESULTS_KEY, JSON.stringify(results)); } catch {}
}

function resultKey(planName: string, planIdx: number, stepNum: number): string {
  return `${planName}::${planIdx}::${stepNum}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatWindow(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function carbonLabel(g: number): string {
  if (g < 0.01) return `${(g * 1000).toFixed(1)} mg`;
  if (g < 1) return `${g.toFixed(3)} g`;
  return `${g.toFixed(2)} g`;
}

function pctLabel(a: number, b: number): string {
  if (b === 0) return "0%";
  return `${((a / b) * 100).toFixed(0)}%`;
}

const PHASE_ICONS: Record<string, typeof FlaskConical> = {
  "Research & Requirements": Brain,
  "Architecture & Design": Cpu,
  "Implementation": Zap,
  "Testing & Validation": FlaskConical,
  "Documentation & Deployment": TreePine,
};

// ─── Step Card ──────────────────────────────────────────────────────────

function StepCard({
  step,
  totalCarbon,
  result,
  executing,
  onExecute,
}: {
  step: StepPlan;
  totalCarbon: number;
  result: ExecuteStepResponse | null;
  executing: boolean;
  onExecute: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const Icon = PHASE_ICONS[step.title] || FlaskConical;
  const share = totalCarbon > 0 ? (step.estimated_carbon_g / totalCarbon) * 100 : 0;
  const isDone = !!result;

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: step.step_number * 0.08 }}
      className={`specimen-card overflow-hidden ${isDone ? "border-l-2 border-l-moss" : ""}`}
    >
      {/* Header */}
      <div
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((o) => !o); }}
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-oak/3 transition-colors cursor-pointer"
      >
        {/* Step number badge */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
          isDone
            ? "bg-moss/20 border-moss/30"
            : executing
            ? "bg-topaz/20 border-topaz/30"
            : "bg-moss/12 border-moss/20"
        }`}>
          {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-moss" />
          ) : executing ? (
            <Loader2 className="w-4 h-4 text-topaz animate-spin" />
          ) : (
            <span className="text-xs font-header text-moss">{step.step_number}</span>
          )}
        </div>

        <Icon className="w-4 h-4 text-oak/40 shrink-0" />

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-oak truncate">{step.title}</h4>
          <p className="text-[10px] text-oak/40 truncate mt-0.5">
            {isDone ? `Completed in ${(result.elapsed_ms / 1000).toFixed(1)}s — ${carbonLabel(result.estimated_carbon_g)} CO₂` : step.description}
          </p>
        </div>

        {/* Right side stats */}
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-oak/30 block">Carbon</span>
            <span className="text-xs font-medium text-moss tabular-nums">{carbonLabel(isDone ? result.estimated_carbon_g : step.estimated_carbon_g)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-oak/30 block">{isDone ? "Ran at" : "Schedule"}</span>
            <span className="text-[11px] font-medium text-topaz tabular-nums">{formatWindow(isDone ? result.executed_at : step.scheduled_window)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-oak/30 block">Model</span>
            <span className="text-[11px] font-mono text-oak/60">{isDone ? result.model_used : step.model_choice}</span>
          </div>
        </div>

        {/* Execute button or status */}
        {!isDone && !executing && (
          <button
            onClick={(e) => { e.stopPropagation(); onExecute(); }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-moss/15 text-moss text-xs font-medium border border-moss/25 hover:bg-moss/25 transition-all active:scale-95"
            title="Execute this step"
          >
            <Play className="w-3 h-3" />
            Go
          </button>
        )}

        {executing && (
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-topaz/10 text-topaz text-xs font-medium border border-topaz/20">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running
          </div>
        )}

        {isDone && !open && (
          <CheckCircle2 className="w-4 h-4 text-moss shrink-0" />
        )}

        {open ? (
          <ChevronDown className="w-4 h-4 text-oak/30 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-oak/30 shrink-0" />
        )}
      </div>

      {/* Carbon share bar */}
      <div className="px-5 pb-1">
        <div className="h-1 rounded-full bg-oak/8 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isDone ? "bg-moss/70" : "bg-moss/50"}`}
            initial={{ width: 0 }}
            animate={{ width: `${share}%` }}
            transition={{ duration: 0.6, delay: step.step_number * 0.1 }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[8px] text-oak/25">{share.toFixed(0)}% of budget</span>
          <span className="text-[8px] text-oak/25">~{step.estimated_tokens.toLocaleString()} tokens</span>
        </div>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-2 border-t border-oak/8 space-y-3">
              {/* Mobile stats */}
              <div className="sm:hidden grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-oak/30 block">Carbon</span>
                  <span className="text-xs font-medium text-moss">{carbonLabel(isDone ? result.estimated_carbon_g : step.estimated_carbon_g)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-oak/30 block">{isDone ? "Ran at" : "Schedule"}</span>
                  <span className="text-[11px] font-medium text-topaz">{formatWindow(isDone ? result.executed_at : step.scheduled_window)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-oak/30 block">Model</span>
                  <span className="text-[11px] font-mono text-oak/60">{isDone ? result.model_used : step.model_choice}</span>
                </div>
              </div>

              {/* ─── LLM Result ─── */}
              {isDone && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h5 className="text-[10px] text-moss uppercase tracking-wider font-medium">LLM Output</h5>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-[10px] text-oak/30 hover:text-oak/60 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-moss" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="relative group">
                    <div style={{ cursor: "auto", overflowY: "scroll" }}
                    className={`enchanted-terminal p-4 text-[12px] leading-relaxed whitespace-pre-wrap scroll-smooth transition-[max-height] duration-300 [&]:!cursor-auto [scrollbar-width:thin] [scrollbar-color:rgba(160,160,136,0.4)_transparent] ${expanded ? "max-h-[80vh]" : "max-h-[24rem]"}`}>
                      {result.output}
                    </div>
                    {/* Fade hint + expand toggle */}
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => setExpanded((e) => !e)}
                        className="text-[10px] text-oak/30 hover:text-oak/60 transition-colors px-3 py-1 rounded-lg hover:bg-oak/5"
                      >
                        {expanded ? "Collapse output" : "Expand output"}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-oak/30">
                    <span>Model: <span className="text-oak/50 font-mono">{result.model_used}</span></span>
                    <span>Time: <span className="text-oak/50">{(result.elapsed_ms / 1000).toFixed(1)}s</span></span>
                    <span>Carbon: <span className="text-moss">{carbonLabel(result.estimated_carbon_g)}</span></span>
                  </div>
                </motion.div>
              )}

              {/* Reasoning trace */}
              <div>
                <h5 className="text-[10px] text-oak/40 uppercase tracking-wider mb-1.5">Agent Reasoning</h5>
                <div className="space-y-1">
                  {step.reasoning.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-2"
                    >
                      <ArrowRight className="w-3 h-3 text-moss/50 mt-0.5 shrink-0" />
                      <span className="text-xs text-oak/60 leading-relaxed">{line}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* LLM prompt preview (only when NOT executed yet) */}
              {!isDone && (
                <div>
                  <h5 className="text-[10px] text-oak/40 uppercase tracking-wider mb-1.5">Planned Prompt</h5>
                  <div className="enchanted-terminal p-3 text-[11px] leading-relaxed max-h-32 overflow-y-auto">
                    {step.prompt}
                  </div>
                </div>
              )}

              {/* Execute button inside expanded view too */}
              {!isDone && !executing && (
                <button
                  onClick={onExecute}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-moss/15 text-moss text-sm font-medium border border-moss/25 hover:bg-moss/25 transition-all active:scale-[0.98]"
                >
                  <Play className="w-4 h-4" />
                  Execute Step {step.step_number}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Plan Display ───────────────────────────────────────────────────────

function PlanDisplay({
  plan,
  planIdx,
  results,
  executingStep,
  onExecuteStep,
}: {
  plan: ProjectPlan;
  planIdx: number;
  results: ResultsMap;
  executingStep: number | null;
  onExecuteStep: (step: StepPlan) => void;
}) {
  const savingsPct = plan.total_estimated_carbon_g > 0
    ? ((plan.total_savings_g / (plan.total_estimated_carbon_g + plan.total_savings_g)) * 100)
    : 0;
  const withinBudget = plan.total_estimated_carbon_g <= plan.carbon_limit_g;
  const completedCount = plan.steps.filter(
    (s) => !!results[resultKey(plan.name, planIdx, s.step_number)]
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Hero summary card */}
      <div className="specimen-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-topaz" />
          <h3 className="text-lg font-header text-oak">{plan.name}</h3>
          <span className="ml-auto text-[10px] font-medium text-moss bg-moss/10 px-2 py-0.5 rounded-full border border-moss/20">
            {completedCount === plan.steps.length
              ? "completed"
              : completedCount > 0
              ? `${completedCount}/${plan.steps.length} done`
              : plan.status}
          </span>
        </div>

        <p className="text-sm text-oak/60 mb-4">{plan.description}</p>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="specimen-card p-3 text-center">
            <Leaf className="w-4 h-4 text-moss mx-auto mb-1" />
            <span className="text-lg font-header text-moss block tabular-nums">{carbonLabel(plan.total_estimated_carbon_g)}</span>
            <span className="text-[9px] text-oak/40">Total CO₂</span>
          </div>
          <div className="specimen-card p-3 text-center">
            <TreePine className="w-4 h-4 text-moss mx-auto mb-1" />
            <span className="text-lg font-header text-moss block tabular-nums">{carbonLabel(plan.total_savings_g)}</span>
            <span className="text-[9px] text-oak/40">Savings ({savingsPct.toFixed(0)}%)</span>
          </div>
          <div className="specimen-card p-3 text-center">
            <Clock className="w-4 h-4 text-topaz mx-auto mb-1" />
            <span className="text-sm font-header text-oak block">{formatWindow(plan.deadline)}</span>
            <span className="text-[9px] text-oak/40">Deadline</span>
          </div>
          <div className="specimen-card p-3 text-center">
            <Zap className={`w-4 h-4 mx-auto mb-1 ${withinBudget ? "text-moss" : "text-witchberry"}`} />
            <span className={`text-lg font-header block tabular-nums ${withinBudget ? "text-moss" : "text-witchberry"}`}>
              {withinBudget ? "PASS" : "OVER"}
            </span>
            <span className="text-[9px] text-oak/40">Budget ({carbonLabel(plan.carbon_limit_g)})</span>
          </div>
        </div>

        {/* Budget progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-oak/40">Carbon budget usage</span>
            <span className={withinBudget ? "text-moss" : "text-witchberry"}>
              {pctLabel(plan.total_estimated_carbon_g, plan.carbon_limit_g)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-oak/8 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${withinBudget ? "bg-moss/60" : "bg-witchberry/60"}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((plan.total_estimated_carbon_g / plan.carbon_limit_g) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Top-level monologue */}
      <div className="specimen-card p-5">
        <h4 className="text-[10px] text-oak/40 uppercase tracking-wider mb-2">Agent Inner Monologue</h4>
        <div className="space-y-1.5">
          {plan.inner_monologue.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-start gap-2"
            >
              <Brain className="w-3 h-3 text-topaz/60 mt-0.5 shrink-0" />
              <span className="text-xs text-oak/60 leading-relaxed">{line}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical className="w-4 h-4 text-oak/40" />
        <h3 className="text-sm font-medium text-oak">Execution Steps</h3>
        <span className="text-[10px] text-oak/30">{completedCount}/{plan.steps.length} complete</span>
      </div>

      {/* Timeline connector */}
      <div className="relative space-y-3 pl-4">
        {/* Vertical timeline line */}
        <div className="absolute left-[1.05rem] top-4 bottom-4 w-px bg-oak/10" />

        {plan.steps.map((step) => {
          const key = resultKey(plan.name, planIdx, step.step_number);
          return (
            <div key={step.step_number} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-0.5 top-5 w-2.5 h-2.5 rounded-full border-2 border-parchment z-10 ${
                results[key] ? "bg-moss" : executingStep === step.step_number ? "bg-topaz animate-pulse" : "bg-oak/20"
              }`} />
              <div className="ml-4">
                <StepCard
                  step={step}
                  totalCarbon={plan.total_estimated_carbon_g}
                  result={results[key] || null}
                  executing={executingStep === step.step_number}
                  onExecute={() => onExecuteStep(step)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Create Form ────────────────────────────────────────────────────────

function CreateProjectForm({ onCreated }: { onCreated: (plan: ProjectPlan) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [carbonLimit, setCarbonLimit] = useState("10");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && prompt.trim() && parseFloat(carbonLimit) > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const plan = await postAgentProject({
        name: name.trim(),
        description: description.trim() || name.trim(),
        deadline: new Date(deadline).toISOString(),
        carbon_limit_g: parseFloat(carbonLimit),
        prompt: prompt.trim(),
      });
      onCreated(plan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate plan. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="specimen-card p-6 space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Plus className="w-4 h-4 text-moss" />
        <h3 className="text-sm font-medium text-oak">New Agentic Project</h3>
      </div>

      {/* Name */}
      <div>
        <label className="text-[10px] text-oak/40 uppercase tracking-wider block mb-1">Project Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. RAG Pipeline"
          className="w-full px-3 py-2 rounded-xl bg-parchment-dark/60 border border-oak/10 text-sm text-oak placeholder:text-oak/25 focus:outline-none focus:ring-2 focus:ring-moss/30 transition-all"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] text-oak/40 uppercase tracking-wider block mb-1">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short summary of the project"
          className="w-full px-3 py-2 rounded-xl bg-parchment-dark/60 border border-oak/10 text-sm text-oak placeholder:text-oak/25 focus:outline-none focus:ring-2 focus:ring-moss/30 transition-all"
        />
      </div>

      {/* Prompt */}
      <div>
        <label className="text-[10px] text-oak/40 uppercase tracking-wider block mb-1">Developer Prompt / Spec</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want the agentic system to build..."
          rows={4}
          className="w-full px-3 py-2 rounded-xl bg-parchment-dark/60 border border-oak/10 text-sm text-oak placeholder:text-oak/25 focus:outline-none focus:ring-2 focus:ring-moss/30 transition-all resize-none"
        />
      </div>

      {/* Carbon + Deadline row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-oak/40 uppercase tracking-wider block mb-1">
            Carbon Limit (g CO₂)
          </label>
          <div className="relative">
            <Leaf className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-moss/40" />
            <input
              type="number"
              value={carbonLimit}
              onChange={(e) => setCarbonLimit(e.target.value)}
              min="0.01"
              step="0.5"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-parchment-dark/60 border border-oak/10 text-sm text-oak placeholder:text-oak/25 focus:outline-none focus:ring-2 focus:ring-moss/30 transition-all tabular-nums"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-oak/40 uppercase tracking-wider block mb-1">Deadline</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-topaz/40" />
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-parchment-dark/60 border border-oak/10 text-sm text-oak focus:outline-none focus:ring-2 focus:ring-moss/30 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-witchberry/8 border border-witchberry/20 text-witchberry text-xs"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className={`
          w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]
          ${canSubmit && !loading
            ? "bg-moss/15 text-moss border border-moss/25 hover:bg-moss/25"
            : "bg-oak/5 text-oak/30 border border-oak/10 cursor-not-allowed"
          }
        `}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating plan...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Green Execution Plan
          </>
        )}
      </button>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [plans, setPlans] = useState<ProjectPlan[]>([]);
  const [activePlanIdx, setActivePlanIdx] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [results, setResults] = useState<ResultsMap>({});
  const [executingStep, setExecutingStep] = useState<number | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = loadPlans();
    const storedResults = loadResults();
    if (stored.length > 0) {
      setPlans(stored);
      setShowForm(false);
    }
    if (Object.keys(storedResults).length > 0) {
      setResults(storedResults);
    }
  }, []);

  const persistPlans = useCallback((next: ProjectPlan[]) => {
    setPlans(next);
    savePlans(next);
  }, []);

  const persistResults = useCallback((next: ResultsMap) => {
    setResults(next);
    saveResults(next);
  }, []);

  const handleCreated = (plan: ProjectPlan) => {
    const next = [plan, ...plans];
    persistPlans(next);
    setActivePlanIdx(0);
    setShowForm(false);
  };

  const activePlan = activePlanIdx !== null ? plans[activePlanIdx] : null;

  const handleExecuteStep = async (step: StepPlan) => {
    if (!activePlan || activePlanIdx === null) return;
    setExecutingStep(step.step_number);
    setExecError(null);
    try {
      const res = await postExecuteStep({
        prompt: step.prompt,
        model_choice: step.model_choice,
        step_number: step.step_number,
        title: step.title,
      });
      const key = resultKey(activePlan.name, activePlanIdx, step.step_number);
      const next = { ...results, [key]: res };
      persistResults(next);
    } catch (err: unknown) {
      setExecError(err instanceof Error ? err.message : "Execution failed — check backend logs.");
    } finally {
      setExecutingStep(null);
    }
  };

  return (
    <div className="min-h-screen py-6 px-4 sm:px-8 max-w-3xl mx-auto">
      <PageHeader title="Agentic Projects" subtitle="Carbon-aware multi-step execution planning" />

      {/* Toggle between form and plan list */}
      {!showForm && activePlanIdx === null && plans.length > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowForm(true)}
          className="mb-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-moss/10 text-moss text-sm font-medium hover:bg-moss/20 transition-colors border border-moss/20"
        >
          <Plus className="w-3.5 h-3.5" />
          New Project
        </motion.button>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            exit={{ opacity: 0, y: -12 }}
            className="mb-6"
          >
            <CreateProjectForm onCreated={handleCreated} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Execution error banner */}
      <AnimatePresence>
        {execError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-witchberry/8 border border-witchberry/20 text-witchberry text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{execError}</span>
            <button onClick={() => setExecError(null)} className="text-witchberry/40 hover:text-witchberry">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active plan detail */}
      <AnimatePresence mode="wait">
        {activePlan && activePlanIdx !== null && (
          <motion.div
            key={`plan-${activePlanIdx}`}
            exit={{ opacity: 0, y: 12 }}
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => { setActivePlanIdx(null); setShowForm(false); setExecError(null); }}
                className="text-xs text-oak/40 hover:text-oak transition-colors"
              >
                ← All Projects
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 text-xs text-moss hover:text-moss/80 transition-colors"
              >
                <Plus className="w-3 h-3" />
                New
              </button>
            </div>
            <PlanDisplay
              plan={activePlan}
              planIdx={activePlanIdx}
              results={results}
              executingStep={executingStep}
              onExecuteStep={handleExecuteStep}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan list (when no active plan and form is hidden) */}
      {activePlanIdx === null && !showForm && plans.length > 0 && (
        <div className="space-y-3">
          {plans.map((plan, i) => {
            const completedCount = plan.steps.filter(
              (s) => !!results[resultKey(plan.name, i, s.step_number)]
            ).length;
            return (
              <motion.button
                key={`${plan.name}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActivePlanIdx(i)}
                className="w-full text-left specimen-card p-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    completedCount === plan.steps.length
                      ? "bg-moss/15 border-moss/20"
                      : "bg-moss/10 border-moss/15"
                  }`}>
                    {completedCount === plan.steps.length ? (
                      <CheckCircle2 className="w-4 h-4 text-moss" />
                    ) : (
                      <FlaskConical className="w-4 h-4 text-moss" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-oak truncate">{plan.name}</h4>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-moss font-medium">{carbonLabel(plan.total_estimated_carbon_g)}</span>
                      <span className="text-[10px] text-oak/30">{completedCount}/{plan.steps.length} steps done</span>
                      <span className="text-[10px] text-topaz">{formatWindow(plan.deadline)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-oak/20 shrink-0" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {activePlanIdx === null && !showForm && plans.length === 0 && (
        <motion.div
          className="specimen-card p-10 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FlaskConical className="w-12 h-12 text-oak/15 mx-auto mb-3" />
          <h3 className="text-lg font-header text-oak">No projects yet</h3>
          <p className="text-xs text-oak/40 mt-1 max-w-xs mx-auto">
            Create your first agentic project to see a carbon-optimized execution plan.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-moss/15 text-moss text-sm font-medium hover:bg-moss/25 transition-colors border border-moss/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Project
          </button>
        </motion.div>
      )}
    </div>
  );
}
