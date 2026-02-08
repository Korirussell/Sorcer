/**
 * Backend API client for the Carbon-Aware AI Orchestrator.
 * Base URL defaults to localhost:8000 (FastAPI backend).
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GridRegion {
  name: string;
  score: number;
  breakdown: Record<string, number>;
}

export interface GridMapResponse {
  regions: GridRegion[];
}

export interface UserSummary {
  chat_ids: string[];
  project_ids: string[];
  pending_tasks_count: number;
  total_user_savings_g: number;
}

export interface OrchestrateRequest {
  prompt: string;
  user_id: string;
  project_id: string;
  is_urgent?: boolean;
  bypass_eco?: boolean;
  deadline?: string;
}

export interface OrchestrateResponse {
  status: string;
  chat_id: string;
  response: string;
  receipt_id: string;
  deferred: boolean;
  task_id?: string;
  message?: string;
  eco_stats?: Record<string, unknown>;
  was_cached?: boolean;
  cache_type?: "hash" | "semantic" | null;
  input_tokens?: number;
  compressed_text_tokens?: number;
  compressed_prompt?: string;
}

export interface Receipt {
  timestamp: string;
  server_location: string;
  model_used: string;
  baseline_co2_est: number;
  actual_co2: number;
  net_savings: number;
  was_cached: boolean;
}

export interface NutritionLabel {
  energy_kwh: number;
  grid_source: Record<string, number>;
  og_co2: number;
  end_co2: number;
  net_savings: number;
}

export interface BudgetStatus {
  limit_g: number;
  used_g: number;
  remaining_percent: number;
  policy_active: string;
}

export interface LeaderboardEntry {
  name: string;
  saved_kg: number;
}

export interface PromptAnalysis {
  score: number;
  suggestions: string[];
  potential_co2_savings: string;
}

// ─── Fetch helper ────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ─── Discovery ───────────────────────────────────────────────────────────────

export function getUserSummary(userId: string) {
  return apiFetch<UserSummary>(`/user/${userId}/summary`);
}

export function getChatHistory(chatId: string) {
  return apiFetch<{
    messages: { role: string; content: string; receipt_id: string }[];
    total_chat_co2_saved_g: number;
    efficiency_score: number;
  }>(`/chat/${chatId}/history`);
}

// ─── Action ──────────────────────────────────────────────────────────────────

export function postOrchestrate(body: OrchestrateRequest) {
  return apiFetch<OrchestrateResponse>("/orchestrate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postDeferredExecute(taskId: string) {
  return apiFetch<{
    status: string;
    new_eta: string;
    current_grid_intensity: number;
  }>(`/deferred/execute/${taskId}`, { method: "POST" });
}

export function postBypass(prompt: string) {
  return apiFetch<{
    response: string;
    warning: string;
    potential_savings_lost: string;
  }>("/bypass", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

// ─── Transparency ────────────────────────────────────────────────────────────

export function getReceipt(receiptId: string) {
  return apiFetch<Receipt>(`/receipt/${receiptId}`);
}

export function getNutritionLabel(receiptId: string) {
  return apiFetch<NutritionLabel>(`/analytics/nutrition/${receiptId}`);
}

// ─── Intelligence ────────────────────────────────────────────────────────────

export function analyzePrompt(prompt: string) {
  return apiFetch<PromptAnalysis>("/analyze/prompt", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export function getGridMap() {
  return apiFetch<GridMapResponse>("/grid/map");
}

// ─── Governance ──────────────────────────────────────────────────────────────

export function getBudgetStatus(projectId: string) {
  return apiFetch<BudgetStatus>(`/budget/status/${projectId}`);
}

export function getLeaderboard(filter?: string) {
  const q = filter ? `?filter=${encodeURIComponent(filter)}` : "";
  return apiFetch<{ rankings: LeaderboardEntry[] }>(`/leaderboard${q}`);
}

// ─── Health ──────────────────────────────────────────────────────────────────

export function getHealth() {
  return apiFetch<{ status: string }>("/health");
}


// ─── Agent ──────────────────────────────────────────────────────────────

export interface ProjectRequest {
  name: string;
  description: string;
  deadline: string;
  carbon_limit_g: number;
  prompt: string;
}

export interface StepPlan {
  step_number: number;
  title: string;
  prompt: string;
  description: string;
  model_choice: string;
  scheduled_window: string;
  estimated_carbon_g: number;
  estimated_tokens: number;
  reasoning: string[];
}

export interface ProjectPlan {
  name: string;
  description: string;
  deadline: string;
  carbon_limit_g: number;
  prompt: string;
  status: string;
  total_estimated_carbon_g: number;
  total_savings_g: number;
  steps: StepPlan[];
  inner_monologue: string[];
}

export function postAgentProject(body: ProjectRequest) {
  return apiFetch<ProjectPlan>("/agent/project", {
    method: "POST",
    body: JSON.stringify(body),
  });
}


// ─── Agent: Execute Step ────────────────────────────────────────────────

export interface ExecuteStepRequest {
  prompt: string;
  model_choice: string;
  step_number: number;
  title: string;
}

export interface ExecuteStepResponse {
  step_number: number;
  title: string;
  model_used: string;
  output: string;
  elapsed_ms: number;
  estimated_carbon_g: number;
  executed_at: string;
}

export function postExecuteStep(body: ExecuteStepRequest) {
  return apiFetch<ExecuteStepResponse>("/agent/execute-step", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
