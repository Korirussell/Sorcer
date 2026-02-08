"use client";

import { useState } from "react";
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
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { postAgentProject } from "@/utils/api";
import type { ProjectPlan, StepPlan } from "@/utils/api";

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

function StepCard({ step, totalCarbon }: { step: StepPlan; totalCarbon: number }) {
  const [open, setOpen] = useState(false);
  const Icon = PHASE_ICONS[step.title] || FlaskConical;
  const share = totalCarbon > 0 ? (step.estimated_carbon_g / totalCarbon) * 100 : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: step.step_number * 0.08 }}
      className="specimen-card overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-oak/3 transition-colors"
      >
        {/* Step number badge */}
        <div className="w-8 h-8 rounded-xl bg-moss/12 flex items-center justify-center shrink-0 border border-moss/20">
          <span className="text-xs font-header text-moss">{step.step_number}</span>
        </div>

        <Icon className="w-4 h-4 text-oak/40 shrink-0" />

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-oak truncate">{step.title}</h4>
          <p className="text-[10px] text-oak/40 truncate mt-0.5">{step.description}</p>
        </div>

        {/* Right side stats */}
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-oak/30 block">Carbon</span>
            <span className="text-xs font-medium text-moss tabular-nums">{carbonLabel(step.estimated_carbon_g)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-oak/30 block">Schedule</span>
            <span className="text-[11px] font-medium text-topaz tabular-nums">{formatWindow(step.scheduled_window)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-oak/30 block">Model</span>
            <span className="text-[11px] font-mono text-oak/60">{step.model_choice}</span>
          </div>
        </div>

        {open ? (
          <ChevronDown className="w-4 h-4 text-oak/30 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-oak/30 shrink-0" />
        )}
      </button>

      {/* Carbon share bar */}
      <div className="px-5 pb-1">
        <div className="h-1 rounded-full bg-oak/8 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-moss/50"
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
                  <span className="text-xs font-medium text-moss">{carbonLabel(step.estimated_carbon_g)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-oak/30 block">Schedule</span>
                  <span className="text-[11px] font-medium text-topaz">{formatWindow(step.scheduled_window)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-oak/30 block">Model</span>
                  <span className="text-[11px] font-mono text-oak/60">{step.model_choice}</span>
                </div>
              </div>

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

              {/* LLM prompt preview */}
              <div>
                <h5 className="text-[10px] text-oak/40 uppercase tracking-wider mb-1.5">Planned Prompt</h5>
                <div className="enchanted-terminal p-3 text-[11px] leading-relaxed max-h-32 overflow-y-auto">
                  {step.prompt}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Plan Display ───────────────────────────────────────────────────────

function PlanDisplay({ plan }: { plan: ProjectPlan }) {
  const savingsPct = plan.total_estimated_carbon_g > 0
    ? ((plan.total_savings_g / (plan.total_estimated_carbon_g + plan.total_savings_g)) * 100)
    : 0;
  const withinBudget = plan.total_estimated_carbon_g <= plan.carbon_limit_g;

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
            {plan.status}
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
        <span className="text-[10px] text-oak/30">{plan.steps.length} phases</span>
      </div>

      {/* Timeline connector */}
      <div className="relative space-y-3 pl-4">
        {/* Vertical timeline line */}
        <div className="absolute left-[1.05rem] top-4 bottom-4 w-px bg-oak/10" />

        {plan.steps.map((step) => (
          <div key={step.step_number} className="relative">
            {/* Timeline dot */}
            <div className="absolute -left-0.5 top-5 w-2.5 h-2.5 rounded-full bg-moss border-2 border-parchment z-10" />
            <div className="ml-4">
              <StepCard step={step} totalCarbon={plan.total_estimated_carbon_g} />
            </div>
          </div>
        ))}
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
  const [activePlan, setActivePlan] = useState<ProjectPlan | null>(null);
  const [showForm, setShowForm] = useState(true);

  const handleCreated = (plan: ProjectPlan) => {
    setPlans((prev) => [plan, ...prev]);
    setActivePlan(plan);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen py-6 px-4 sm:px-8 max-w-3xl mx-auto">
      <PageHeader title="Agentic Projects" subtitle="Carbon-aware multi-step execution planning" />

      {/* Toggle between form and plan list */}
      {!showForm && !activePlan && plans.length > 0 && (
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

      {/* Active plan detail */}
      <AnimatePresence mode="wait">
        {activePlan && (
          <motion.div
            key={activePlan.name}
            exit={{ opacity: 0, y: 12 }}
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => { setActivePlan(null); setShowForm(false); }}
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
            <PlanDisplay plan={activePlan} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan list (when no active plan and form is hidden) */}
      {!activePlan && !showForm && plans.length > 0 && (
        <div className="space-y-3">
          {plans.map((plan, i) => (
            <motion.button
              key={`${plan.name}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActivePlan(plan)}
              className="w-full text-left specimen-card p-4 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-moss/10 flex items-center justify-center shrink-0 border border-moss/15">
                  <FlaskConical className="w-4 h-4 text-moss" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-oak truncate">{plan.name}</h4>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-moss font-medium">{carbonLabel(plan.total_estimated_carbon_g)}</span>
                    <span className="text-[10px] text-oak/30">{plan.steps.length} steps</span>
                    <span className="text-[10px] text-topaz">{formatWindow(plan.deadline)}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-oak/20 shrink-0" />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!activePlan && !showForm && plans.length === 0 && (
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
