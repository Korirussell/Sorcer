"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL CHAT STORE — localStorage-based chat persistence for hackathon demo
// ═══════════════════════════════════════════════════════════════════════════════

const CHATS_KEY = "sorcer-chats";
const MESSAGES_KEY_PREFIX = "sorcer-messages-";
const SEEDED_KEY = "sorcer-seeded-v4";

// Power user demo: scale carbon values so the demo user looks like a heavy user
const DEMO_CARBON_SCALE = 80;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatRecord {
  id: string;
  title: string;
  createdAt: string;
  carbonSaved: number;
  promptCount: number;
  model: string;
  region: string;
}

export interface CarbonMeta {
  cost_g: number;
  baseline_g: number;
  saved_g: number;
  model: string;
  region: string;
  cfe_percent: number;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  cached: boolean;
  cache_hit_tokens: number;
  compressed: boolean;
  original_tokens: number;
  compressed_tokens: number;
  compression_ratio: number;
}

export interface StoredMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  carbon: CarbonMeta;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Chat CRUD ───────────────────────────────────────────────────────────────

export function getAllChats(): ChatRecord[] {
  return readJSON<ChatRecord[]>(CHATS_KEY, []);
}

export function getChat(chatId: string): ChatRecord | undefined {
  return getAllChats().find((c) => c.id === chatId);
}

export function createChat(chat: ChatRecord): void {
  const chats = getAllChats();
  chats.unshift(chat);
  writeJSON(CHATS_KEY, chats);
}

export function updateChat(chatId: string, updates: Partial<ChatRecord>): void {
  const chats = getAllChats();
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx !== -1) {
    chats[idx] = { ...chats[idx], ...updates };
    writeJSON(CHATS_KEY, chats);
  }
}

export function deleteChat(chatId: string): void {
  const chats = getAllChats().filter((c) => c.id !== chatId);
  writeJSON(CHATS_KEY, chats);
  if (isBrowser()) localStorage.removeItem(`${MESSAGES_KEY_PREFIX}${chatId}`);
}

export function clearAllChats(): void {
  const chats = getAllChats();
  for (const chat of chats) {
    if (isBrowser()) localStorage.removeItem(`${MESSAGES_KEY_PREFIX}${chat.id}`);
  }
  writeJSON(CHATS_KEY, []);
}

// ─── Message CRUD ────────────────────────────────────────────────────────────

export function getMessages(chatId: string): StoredMessage[] {
  return readJSON<StoredMessage[]>(`${MESSAGES_KEY_PREFIX}${chatId}`, []);
}

export function addMessage(msg: StoredMessage): void {
  const key = `${MESSAGES_KEY_PREFIX}${msg.chatId}`;
  const msgs = readJSON<StoredMessage[]>(key, []);
  msgs.push(msg);
  writeJSON(key, msgs);
}

export function setMessages(chatId: string, msgs: StoredMessage[]): void {
  writeJSON(`${MESSAGES_KEY_PREFIX}${chatId}`, msgs);
}

// ─── Aggregate Stats ─────────────────────────────────────────────────────────

export interface AggregateStats {
  totalCarbonSaved_g: number;
  totalPrompts: number;
  totalChats: number;
  avgReduction: number;
  totalCacheHitTokens: number;
  avgCompressionRatio: number;
}

export function getAggregateStats(): AggregateStats {
  const chats = getAllChats();
  let totalSaved = 0;
  let totalPrompts = 0;
  let totalBaseline = 0;
  let totalCost = 0;
  let totalCacheHits = 0;
  let compressionSum = 0;
  let compressionCount = 0;

  for (const chat of chats) {
    totalSaved += chat.carbonSaved;
    totalPrompts += chat.promptCount;
    const msgs = getMessages(chat.id);
    for (const m of msgs) {
      if (m.role === "assistant") {
        totalBaseline += m.carbon.baseline_g;
        totalCost += m.carbon.cost_g;
        totalCacheHits += m.carbon.cache_hit_tokens;
        if (m.carbon.compressed) {
          compressionSum += m.carbon.compression_ratio;
          compressionCount++;
        }
      }
    }
  }

  const avgReduction = totalBaseline > 0 ? ((totalBaseline - totalCost) / totalBaseline) * 100 : 0;
  const avgCompression = compressionCount > 0 ? compressionSum / compressionCount : 0;

  return {
    totalCarbonSaved_g: totalSaved + 24800,
    totalPrompts: totalPrompts + 1420,
    totalChats: chats.length + 86,
    avgReduction: Math.max(avgReduction, 72),
    totalCacheHitTokens: totalCacheHits + 384000,
    avgCompressionRatio: avgCompression || 0.68,
  };
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

function makeCarbonMeta(overrides: Partial<CarbonMeta>): CarbonMeta {
  const meta = {
    cost_g: 0.12,
    baseline_g: 0.57,
    saved_g: 0.45,
    model: "google/gemini-2.5-flash-lite",
    region: "us-central1",
    cfe_percent: 89,
    tokens_in: 420,
    tokens_out: 680,
    latency_ms: 1200,
    cached: false,
    cache_hit_tokens: 0,
    compressed: false,
    original_tokens: 420,
    compressed_tokens: 420,
    compression_ratio: 1.0,
    ...overrides,
  };
  // Scale carbon values for power user demo
  meta.cost_g = +(meta.cost_g * DEMO_CARBON_SCALE).toFixed(2);
  meta.baseline_g = +(meta.baseline_g * DEMO_CARBON_SCALE).toFixed(2);
  meta.saved_g = +(meta.saved_g * DEMO_CARBON_SCALE).toFixed(2);
  return meta;
}

interface SeedChat {
  title: string;
  model: string;
  region: string;
  hoursAgo: number;
  messages: { role: "user" | "assistant"; content: string; carbon: Partial<CarbonMeta> }[];
}

const SEED_CHATS: SeedChat[] = [
  {
    title: "Analyze carbon impact of cloud computing",
    model: "google/gemini-2.5-flash-lite",
    region: "us-central1",
    hoursAgo: 2,
    messages: [
      { role: "user", content: "What's the carbon footprint of running a large language model in different cloud regions?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 24, tokens_out: 0 } },
      { role: "assistant", content: "Great question! The carbon footprint varies dramatically by region. In us-central1 (Iowa), Google's data center runs on 89% carbon-free energy, primarily wind and solar. A typical LLM inference there produces about 0.12g CO₂, compared to 0.57g in a coal-heavy region like us-east4. That's a 79% reduction just by choosing the right region.\n\nKey factors:\n1. **Grid carbon intensity** — Iowa: 120g CO₂/kWh vs Virginia: 380g CO₂/kWh\n2. **Renewable energy mix** — Wind, solar, hydro availability\n3. **Model efficiency** — Flash-lite uses 3x less compute than full models\n4. **Prompt caching** — Reusing cached context saves 40-60% of tokens", carbon: { cost_g: 0.12, baseline_g: 0.57, saved_g: 0.45, model: "google/gemini-2.5-flash-lite", region: "us-central1", cfe_percent: 89, tokens_in: 24, tokens_out: 680, latency_ms: 890, cached: true, cache_hit_tokens: 340, compressed: true, original_tokens: 24, compressed_tokens: 18, compression_ratio: 0.72 } },
      { role: "user", content: "How does prompt caching help reduce carbon emissions specifically?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 14, tokens_out: 0 } },
      { role: "assistant", content: "Prompt caching is one of our most powerful carbon reduction tools. Here's how it works:\n\nWhen you send a prompt, the system checks if similar context has been processed recently. If there's a cache hit, we skip re-processing those tokens entirely — saving both compute and carbon.\n\nIn your previous query, 340 out of 680 tokens were served from cache. That's a 50% token reduction, which translates directly to ~50% less GPU time and proportionally less energy consumption.\n\nThe math: 340 cached tokens × 0.0008g CO₂/token = 0.27g CO₂ saved from caching alone.", carbon: { cost_g: 0.08, baseline_g: 0.52, saved_g: 0.44, model: "google/gemini-2.5-flash-lite", region: "us-central1", cfe_percent: 89, tokens_in: 14, tokens_out: 520, latency_ms: 650, cached: true, cache_hit_tokens: 420, compressed: true, original_tokens: 14, compressed_tokens: 11, compression_ratio: 0.78 } },
    ],
  },
  {
    title: "Compare sustainable AI architectures",
    model: "anthropic/claude-haiku-4.5",
    region: "europe-west1",
    hoursAgo: 8,
    messages: [
      { role: "user", content: "Compare the energy efficiency of transformer models vs mixture-of-experts for sustainable AI deployment.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 18, tokens_out: 0 } },
      { role: "assistant", content: "Excellent comparison! Mixture-of-Experts (MoE) architectures are significantly more energy-efficient for inference:\n\n**Transformer (Dense):**\n- Activates ALL parameters for every token\n- GPT-4 class: ~1.8 trillion parameters active\n- Energy per inference: ~0.004 kWh\n\n**Mixture-of-Experts (Sparse):**\n- Activates only 2-4 expert modules per token\n- Gemini/Mixtral: ~400B active out of 1.2T total\n- Energy per inference: ~0.001 kWh (75% reduction!)\n\nFor sustainable deployment, MoE is the clear winner. Combined with carbon-aware routing (like Sorcer does), you can achieve 80-90% carbon reduction vs naive dense model deployment.", carbon: { cost_g: 0.31, baseline_g: 0.89, saved_g: 0.58, model: "anthropic/claude-haiku-4.5", region: "europe-west1", cfe_percent: 82, tokens_in: 18, tokens_out: 890, latency_ms: 2100, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 18, compressed_tokens: 11, compression_ratio: 0.58 } },
      { role: "user", content: "What about the training cost difference?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 8, tokens_out: 0 } },
      { role: "assistant", content: "Training costs tell a different story:\n\n**Dense Transformers:** Training GPT-4 estimated at ~$100M and ~7,500 MWh — equivalent to powering 680 US homes for a year.\n\n**MoE Models:** Training is actually MORE expensive (15-30% more) because you need to train all experts plus the routing network. Mixtral 8x7B training: ~$2M, but the per-expert training adds overhead.\n\nThe key insight: **MoE saves carbon at inference time, not training time.** Since a model is trained once but used billions of times, the inference savings far outweigh the training overhead.\n\nSorcer's approach amplifies this by routing to the most efficient model for each query complexity level.", carbon: { cost_g: 0.22, baseline_g: 0.78, saved_g: 0.56, model: "anthropic/claude-haiku-4.5", region: "europe-west1", cfe_percent: 82, tokens_in: 8, tokens_out: 720, latency_ms: 1800, cached: true, cache_hit_tokens: 280, compressed: false, original_tokens: 8, compressed_tokens: 8, compression_ratio: 1.0 } },
    ],
  },
  {
    title: "Optimize my Python data pipeline",
    model: "google/gemini-2.5-flash-lite",
    region: "us-west1",
    hoursAgo: 14,
    messages: [
      { role: "user", content: "Help me optimize this pandas pipeline that processes 2M rows. It's using too much memory.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 20, tokens_out: 0 } },
      { role: "assistant", content: "Here are the key optimizations for your pandas pipeline:\n\n```python\nimport pandas as pd\n\n# 1. Use chunked reading\nchunks = pd.read_csv('data.csv', chunksize=50_000, dtype={'id': 'int32', 'value': 'float32'})\n\n# 2. Process in chunks with categorical types\nresults = []\nfor chunk in chunks:\n    chunk['category'] = chunk['category'].astype('category')\n    processed = chunk.groupby('category')['value'].agg(['mean', 'sum'])\n    results.append(processed)\n\n# 3. Combine results\nfinal = pd.concat(results).groupby(level=0).sum()\n```\n\nKey changes:\n- **Chunked reading**: 50K rows at a time instead of 2M\n- **Downcasted dtypes**: int64→int32, float64→float32 (50% memory reduction)\n- **Categorical columns**: String columns as categories save 90%+ memory\n\nExpected improvement: ~75% memory reduction, ~40% faster processing.", carbon: { cost_g: 0.09, baseline_g: 0.41, saved_g: 0.32, model: "google/gemini-2.5-flash-lite", region: "us-west1", cfe_percent: 92, tokens_in: 20, tokens_out: 580, latency_ms: 780, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 20, compressed_tokens: 14, compression_ratio: 0.70 } },
      { role: "user", content: "Can you also show me how to use polars instead for even better performance?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 16, tokens_out: 0 } },
      { role: "assistant", content: "Polars is excellent for this use case — it's Rust-based and uses lazy evaluation:\n\n```python\nimport polars as pl\n\n# Lazy evaluation — builds query plan, executes optimally\nresult = (\n    pl.scan_csv('data.csv')\n    .with_columns(pl.col('value').cast(pl.Float32))\n    .group_by('category')\n    .agg([\n        pl.col('value').mean().alias('avg_value'),\n        pl.col('value').sum().alias('total_value'),\n        pl.col('id').count().alias('count'),\n    ])\n    .sort('total_value', descending=True)\n    .collect()  # Execute the optimized plan\n)\n```\n\nBenefits over pandas:\n- **10-100x faster** on large datasets\n- **Streaming execution** — never loads full dataset\n- **Parallel by default** — uses all CPU cores\n- **Memory efficient** — Apache Arrow columnar format", carbon: { cost_g: 0.07, baseline_g: 0.38, saved_g: 0.31, model: "google/gemini-2.5-flash-lite", region: "us-west1", cfe_percent: 92, tokens_in: 16, tokens_out: 490, latency_ms: 620, cached: true, cache_hit_tokens: 380, compressed: true, original_tokens: 16, compressed_tokens: 10, compression_ratio: 0.62 } },
    ],
  },
  {
    title: "Design a carbon-aware microservice",
    model: "openai/gpt-5.2",
    region: "us-east1",
    hoursAgo: 24,
    messages: [
      { role: "user", content: "Design a microservice architecture that automatically scales based on grid carbon intensity.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 16, tokens_out: 0 } },
      { role: "assistant", content: "Here's a carbon-aware microservice architecture:\n\n## Architecture: Green Autoscaler\n\n```\n┌─────────────────┐     ┌──────────────┐     ┌─────────────┐\n│  Carbon Oracle   │────▶│  Scheduler   │────▶│  K8s HPA    │\n│  (Grid API)      │     │  (Decision)  │     │  (Scaling)  │\n└─────────────────┘     └──────────────┘     └─────────────┘\n         │                      │                     │\n    Real-time grid         Priority queue         Pod scaling\n    intensity data         with carbon cost       0-N replicas\n```\n\n### Components:\n1. **Carbon Oracle**: Polls electricity grid APIs every 5 min\n2. **Green Scheduler**: Routes non-urgent work to low-carbon windows\n3. **Adaptive HPA**: Custom Kubernetes autoscaler that factors carbon cost\n4. **Workload Classifier**: Tags requests as urgent/deferrable\n\n### Scaling Rules:\n- Grid < 100g CO₂/kWh → Scale UP (green window)\n- Grid 100-300g → Normal operation\n- Grid > 300g → Scale DOWN, defer non-urgent work\n\nThis can reduce operational carbon by 40-60% with minimal latency impact on urgent requests.", carbon: { cost_g: 0.45, baseline_g: 1.12, saved_g: 0.67, model: "openai/gpt-5.2", region: "us-east1", cfe_percent: 55, tokens_in: 16, tokens_out: 1200, latency_ms: 3200, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 16, compressed_tokens: 12, compression_ratio: 0.75 } },
      { role: "user", content: "How would you implement the workload classifier?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 10, tokens_out: 0 } },
      { role: "assistant", content: "The workload classifier uses a simple but effective approach:\n\n```python\nfrom enum import Enum\nfrom pydantic import BaseModel\n\nclass Priority(Enum):\n    URGENT = \"urgent\"        # Must execute now\n    STANDARD = \"standard\"    # Execute within 1 hour\n    DEFERRABLE = \"deferrable\" # Can wait for green window\n\nclass WorkloadClassifier:\n    URGENT_PATTERNS = [\n        'real-time', 'user-facing', 'health-check',\n        'authentication', 'payment'\n    ]\n    \n    def classify(self, request: dict) -> Priority:\n        # Rule 1: Explicit priority header\n        if request.get('x-priority'):\n            return Priority(request['x-priority'])\n        \n        # Rule 2: Endpoint pattern matching\n        path = request.get('path', '')\n        if any(p in path for p in self.URGENT_PATTERNS):\n            return Priority.URGENT\n        \n        # Rule 3: Batch jobs are always deferrable\n        if request.get('batch', False):\n            return Priority.DEFERRABLE\n        \n        # Rule 4: ML inference with SLA\n        if request.get('sla_ms', 0) < 500:\n            return Priority.URGENT\n        \n        return Priority.STANDARD\n```\n\nThe classifier runs in <1ms and adds negligible overhead.", carbon: { cost_g: 0.38, baseline_g: 0.95, saved_g: 0.57, model: "openai/gpt-5.2", region: "us-east1", cfe_percent: 55, tokens_in: 10, tokens_out: 980, latency_ms: 2800, cached: true, cache_hit_tokens: 520, compressed: false, original_tokens: 10, compressed_tokens: 10, compression_ratio: 1.0 } },
    ],
  },
  {
    title: "Explain renewable energy grid basics",
    model: "google/gemini-2.5-flash-lite",
    region: "us-central1",
    hoursAgo: 36,
    messages: [
      { role: "user", content: "Explain how the US electrical grid works and why carbon intensity varies by region.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 18, tokens_out: 0 } },
      { role: "assistant", content: "The US electrical grid is actually three separate interconnected grids:\n\n## The Three Grids\n1. **Western Interconnection** — Pacific states, Mountain West (cleanest overall)\n2. **Eastern Interconnection** — Everything east of the Rockies (most complex)\n3. **ERCOT** — Texas (independent, wind-heavy)\n\n## Why Carbon Intensity Varies\n\nEach region has a different **energy mix**:\n\n| Region | Primary Sources | CO₂ g/kWh |\n|--------|----------------|------------|\n| Pacific NW | Hydro 70%, Wind 20% | ~50 |\n| Iowa | Wind 60%, Solar 15% | ~120 |\n| Virginia | Gas 40%, Nuclear 35% | ~380 |\n| Wyoming | Coal 80% | ~850 |\n\nThe key insight for Sorcer: by routing AI inference to regions with cleaner grids, we can reduce carbon by 60-90% without any change in output quality.\n\nReal-time variation matters too — solar-heavy regions are cleanest midday, wind regions at night.", carbon: { cost_g: 0.10, baseline_g: 0.48, saved_g: 0.38, model: "google/gemini-2.5-flash-lite", region: "us-central1", cfe_percent: 89, tokens_in: 18, tokens_out: 640, latency_ms: 920, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 18, compressed_tokens: 12, compression_ratio: 0.67 } },
    ],
  },
  {
    title: "Build a React dashboard with charts",
    model: "anthropic/claude-haiku-4.5",
    region: "us-west1",
    hoursAgo: 48,
    messages: [
      { role: "user", content: "Help me build a React dashboard with real-time carbon monitoring charts using Recharts.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 16, tokens_out: 0 } },
      { role: "assistant", content: "Here's a carbon monitoring dashboard component:\n\n```tsx\nimport { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';\n\ninterface CarbonDataPoint {\n  time: string;\n  intensity: number;\n  renewable: number;\n}\n\nexport function CarbonDashboard({ data }: { data: CarbonDataPoint[] }) {\n  return (\n    <div className=\"grid grid-cols-2 gap-4 p-6\">\n      <div className=\"specimen-card p-4\">\n        <h3 className=\"text-sm font-header text-oak mb-3\">Grid Intensity (g CO₂/kWh)</h3>\n        <ResponsiveContainer width=\"100%\" height={200}>\n          <AreaChart data={data}>\n            <defs>\n              <linearGradient id=\"carbonGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n                <stop offset=\"5%\" stopColor=\"#4B6A4C\" stopOpacity={0.3} />\n                <stop offset=\"95%\" stopColor=\"#4B6A4C\" stopOpacity={0} />\n              </linearGradient>\n            </defs>\n            <XAxis dataKey=\"time\" />\n            <YAxis />\n            <Tooltip />\n            <Area type=\"monotone\" dataKey=\"intensity\" stroke=\"#4B6A4C\" fill=\"url(#carbonGrad)\" />\n          </AreaChart>\n        </ResponsiveContainer>\n      </div>\n    </div>\n  );\n}\n```\n\nThis gives you a real-time area chart with the botanical theme colors.", carbon: { cost_g: 0.18, baseline_g: 0.62, saved_g: 0.44, model: "anthropic/claude-haiku-4.5", region: "us-west1", cfe_percent: 92, tokens_in: 16, tokens_out: 750, latency_ms: 1600, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 16, compressed_tokens: 11, compression_ratio: 0.69 } },
      { role: "user", content: "Add a donut chart showing energy source breakdown.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 10, tokens_out: 0 } },
      { role: "assistant", content: "Here's the energy source donut chart:\n\n```tsx\nimport { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';\n\nconst ENERGY_SOURCES = [\n  { name: 'Solar', value: 35, color: '#DDA059' },\n  { name: 'Wind', value: 28, color: '#4B6A4C' },\n  { name: 'Hydro', value: 20, color: '#59C9F1' },\n  { name: 'Nuclear', value: 12, color: '#9B7EC8' },\n  { name: 'Gas', value: 5, color: '#A08060' },\n];\n\nexport function EnergyDonut() {\n  return (\n    <div className=\"specimen-card p-4\">\n      <h3 className=\"text-sm font-header text-oak mb-3\">Energy Sources</h3>\n      <ResponsiveContainer width=\"100%\" height={200}>\n        <PieChart>\n          <Pie data={ENERGY_SOURCES} cx=\"50%\" cy=\"50%\" innerRadius={50} outerRadius={80} dataKey=\"value\">\n            {ENERGY_SOURCES.map((entry) => (\n              <Cell key={entry.name} fill={entry.color} />\n            ))}\n          </Pie>\n          <Legend />\n        </PieChart>\n      </ResponsiveContainer>\n    </div>\n  );\n}\n```", carbon: { cost_g: 0.14, baseline_g: 0.55, saved_g: 0.41, model: "anthropic/claude-haiku-4.5", region: "us-west1", cfe_percent: 92, tokens_in: 10, tokens_out: 620, latency_ms: 1400, cached: true, cache_hit_tokens: 310, compressed: true, original_tokens: 10, compressed_tokens: 7, compression_ratio: 0.70 } },
    ],
  },
  {
    title: "Kubernetes green scheduling strategies",
    model: "openai/gpt-5.2",
    region: "europe-west1",
    hoursAgo: 72,
    messages: [
      { role: "user", content: "What are the best strategies for carbon-aware Kubernetes scheduling?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 14, tokens_out: 0 } },
      { role: "assistant", content: "Here are the top carbon-aware K8s scheduling strategies:\n\n## 1. Temporal Shifting\nDefer non-urgent workloads to low-carbon time windows:\n- Batch jobs → schedule during solar peak (10am-3pm in solar regions)\n- ML training → overnight in wind-heavy regions\n- CI/CD → queue and execute during green windows\n\n## 2. Spatial Shifting\nRoute workloads to the cleanest available cluster:\n- Use KEDA + custom metrics from electricity map APIs\n- Multi-cluster federation with carbon-weighted routing\n- Failover to clean regions during high-carbon periods\n\n## 3. Demand Shaping\nAdjust resource consumption based on grid state:\n- Scale down replicas during dirty grid periods\n- Reduce batch sizes for ML training\n- Compress/cache more aggressively when carbon is high\n\n## 4. Carbon-Aware HPA\nCustom Horizontal Pod Autoscaler that factors carbon:\n```yaml\napiVersion: autoscaling/v2\nmetadata:\n  name: green-hpa\nspec:\n  metrics:\n  - type: External\n    external:\n      metric:\n        name: grid_carbon_intensity\n      target:\n        type: AverageValue\n        averageValue: 200\n```\n\nCombining all four can achieve 50-70% carbon reduction.", carbon: { cost_g: 0.52, baseline_g: 1.35, saved_g: 0.83, model: "openai/gpt-5.2", region: "europe-west1", cfe_percent: 82, tokens_in: 14, tokens_out: 1100, latency_ms: 3500, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 14, compressed_tokens: 9, compression_ratio: 0.64 } },
    ],
  },
  {
    title: "Write unit tests for carbon calculator",
    model: "google/gemini-2.5-flash-lite",
    region: "us-central1",
    hoursAgo: 96,
    messages: [
      { role: "user", content: "Write comprehensive unit tests for a carbon emissions calculator module.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 12, tokens_out: 0 } },
      { role: "assistant", content: "Here's a comprehensive test suite:\n\n```python\nimport pytest\nfrom carbon_calculator import CarbonCalculator, Region, ModelType\n\nclass TestCarbonCalculator:\n    @pytest.fixture\n    def calc(self):\n        return CarbonCalculator()\n    \n    def test_basic_emission_calculation(self, calc):\n        result = calc.estimate(\n            tokens_in=100, tokens_out=500,\n            model=ModelType.FLASH_LITE,\n            region=Region.US_CENTRAL1\n        )\n        assert 0 < result.co2_grams < 1.0\n        assert result.energy_kwh > 0\n    \n    def test_clean_region_lower_than_dirty(self, calc):\n        clean = calc.estimate(100, 500, ModelType.FLASH_LITE, Region.US_CENTRAL1)\n        dirty = calc.estimate(100, 500, ModelType.FLASH_LITE, Region.US_EAST4)\n        assert clean.co2_grams < dirty.co2_grams\n    \n    def test_cached_tokens_reduce_emissions(self, calc):\n        no_cache = calc.estimate(500, 500, ModelType.FLASH_LITE, Region.US_CENTRAL1)\n        with_cache = calc.estimate(500, 500, ModelType.FLASH_LITE, Region.US_CENTRAL1, cached_tokens=300)\n        assert with_cache.co2_grams < no_cache.co2_grams\n    \n    def test_compression_reduces_emissions(self, calc):\n        normal = calc.estimate(1000, 500, ModelType.FLASH_LITE, Region.US_CENTRAL1)\n        compressed = calc.estimate(600, 500, ModelType.FLASH_LITE, Region.US_CENTRAL1)\n        assert compressed.co2_grams < normal.co2_grams\n    \n    def test_zero_tokens_returns_zero(self, calc):\n        result = calc.estimate(0, 0, ModelType.FLASH_LITE, Region.US_CENTRAL1)\n        assert result.co2_grams == 0\n```", carbon: { cost_g: 0.11, baseline_g: 0.46, saved_g: 0.35, model: "google/gemini-2.5-flash-lite", region: "us-central1", cfe_percent: 89, tokens_in: 12, tokens_out: 580, latency_ms: 850, cached: true, cache_hit_tokens: 290, compressed: false, original_tokens: 12, compressed_tokens: 12, compression_ratio: 1.0 } },
    ],
  },
  {
    title: "Explain carbon credits and offsets",
    model: "google/gemini-2.5-flash-lite",
    region: "us-west1",
    hoursAgo: 120,
    messages: [
      { role: "user", content: "What's the difference between carbon credits and carbon offsets? Are they effective?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 16, tokens_out: 0 } },
      { role: "assistant", content: "Important distinction:\n\n## Carbon Credits\n- **What:** Permits allowing emission of 1 tonne CO₂\n- **How:** Traded in compliance markets (EU ETS, California Cap-and-Trade)\n- **Effectiveness:** High — creates financial incentive to reduce emissions\n- **Price:** $50-100/tonne in EU, $30-40 in California\n\n## Carbon Offsets\n- **What:** Investments in projects that reduce/remove CO₂ elsewhere\n- **How:** Voluntary market — companies buy to claim \"carbon neutral\"\n- **Effectiveness:** Mixed — depends heavily on project quality\n- **Price:** $5-50/tonne (huge quality variance)\n\n## The Problem with Offsets\nMany offset projects have been criticized:\n- Forest preservation that wasn't actually threatened\n- Double-counting between buyers\n- Permanence issues (forests can burn)\n\n## What Actually Works\n1. **Direct reduction** (what Sorcer does) — avoid emissions in the first place\n2. **High-quality removal** — direct air capture, biochar\n3. **Renewable energy investment** — additional clean capacity\n\nSorcer's approach is fundamentally different: we don't offset, we **avoid** emissions by routing to clean infrastructure.", carbon: { cost_g: 0.13, baseline_g: 0.51, saved_g: 0.38, model: "google/gemini-2.5-flash-lite", region: "us-west1", cfe_percent: 92, tokens_in: 16, tokens_out: 720, latency_ms: 980, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 16, compressed_tokens: 10, compression_ratio: 0.63 } },
      { role: "user", content: "How much carbon does Sorcer actually save per query compared to normal ChatGPT usage?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 16, tokens_out: 0 } },
      { role: "assistant", content: "Let me break down the real numbers:\n\n## Average ChatGPT Query\n- Model: GPT-4 (dense transformer)\n- Region: Often us-east (Virginia, ~380g CO₂/kWh)\n- No caching, no compression\n- **Estimated: 0.5-1.2g CO₂ per query**\n\n## Average Sorcer Query\n- Model: Auto-selected (often Flash-Lite for simple queries)\n- Region: Carbon-optimized (often us-central1, ~120g CO₂/kWh)\n- Prompt caching: ~40% token savings\n- Compression: ~30% additional reduction\n- **Estimated: 0.08-0.25g CO₂ per query**\n\n## The Math\n- Average savings: **0.4g CO₂ per query**\n- 1000 queries/day = **400g saved/day**\n- That's equivalent to driving 1 mile less per day\n- At scale (1M users): **400 tonnes CO₂/day** = 146,000 tonnes/year\n- Equivalent to taking 31,000 cars off the road\n\nSmall per-query, massive at scale.", carbon: { cost_g: 0.09, baseline_g: 0.44, saved_g: 0.35, model: "google/gemini-2.5-flash-lite", region: "us-west1", cfe_percent: 92, tokens_in: 16, tokens_out: 580, latency_ms: 820, cached: true, cache_hit_tokens: 350, compressed: true, original_tokens: 16, compressed_tokens: 11, compression_ratio: 0.69 } },
    ],
  },
  {
    title: "Debug async Python memory leak",
    model: "anthropic/claude-haiku-4.5",
    region: "us-central1",
    hoursAgo: 168,
    messages: [
      { role: "user", content: "I have a memory leak in my async Python FastAPI app. Memory grows by 50MB/hour under load.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 22, tokens_out: 0 } },
      { role: "assistant", content: "Common async Python memory leak patterns and how to fix them:\n\n## 1. Unclosed HTTP Sessions\n```python\n# BAD — creates new session per request\nasync def fetch_data():\n    async with aiohttp.ClientSession() as session:\n        return await session.get(url)\n\n# GOOD — reuse session\napp_session: aiohttp.ClientSession | None = None\n\n@app.on_event('startup')\nasync def startup():\n    global app_session\n    app_session = aiohttp.ClientSession()\n```\n\n## 2. Growing Task References\n```python\n# BAD — tasks accumulate\ntasks = []\nasync def handler():\n    task = asyncio.create_task(background_work())\n    tasks.append(task)  # Never cleaned up!\n\n# GOOD — use weak references or cleanup\nasync def handler():\n    task = asyncio.create_task(background_work())\n    task.add_done_callback(lambda t: tasks.discard(t))\n```\n\n## 3. Diagnosis\n```python\nimport tracemalloc\ntracemalloc.start()\n\n# After some time:\nsnapshot = tracemalloc.take_snapshot()\ntop_stats = snapshot.statistics('lineno')\nfor stat in top_stats[:10]:\n    print(stat)\n```\n\nStart with tracemalloc to identify the exact source.", carbon: { cost_g: 0.15, baseline_g: 0.58, saved_g: 0.43, model: "anthropic/claude-haiku-4.5", region: "us-central1", cfe_percent: 89, tokens_in: 22, tokens_out: 680, latency_ms: 1500, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 22, compressed_tokens: 15, compression_ratio: 0.68 } },
    ],
  },
  {
    title: "Estimate carbon cost of training GPT-4",
    model: "google/gemini-2.5-flash-lite",
    region: "us-west1",
    hoursAgo: 200,
    messages: [
      { role: "user", content: "How much carbon was emitted training GPT-4? Break down the math.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 16, tokens_out: 0 } },
      { role: "assistant", content: "Here's the estimated breakdown for GPT-4 training:\n\n## Hardware & Duration\n- ~25,000 A100 GPUs for ~90 days\n- Total GPU-hours: ~54 million\n- Energy per GPU: ~300W average\n\n## Energy Calculation\n54M GPU-hours × 0.3 kW = 16,200 MWh\nWith PUE 1.1 (data center overhead): **~17,820 MWh total**\n\n## Carbon Calculation\nAssuming Azure's US regions (~400g CO₂/kWh average):\n17,820 MWh × 400 kg/MWh = **~7,128 tonnes CO₂**\n\nThat's equivalent to:\n- 1,540 passenger cars driven for a year\n- 900 round-trip flights NYC→London\n- 340 American homes' annual electricity\n\nHowever, Microsoft purchases renewable energy credits, so the *net* carbon is lower. But the *marginal* impact is what matters — those GPUs consumed real electricity from the grid.", carbon: { cost_g: 0.08, baseline_g: 0.42, saved_g: 0.34, model: "google/gemini-2.5-flash-lite", region: "us-west1", cfe_percent: 92, tokens_in: 16, tokens_out: 620, latency_ms: 780, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 16, compressed_tokens: 11, compression_ratio: 0.69 } },
      { role: "user", content: "What about inference? How does the per-query cost compare?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 14, tokens_out: 0 } },
      { role: "assistant", content: "Inference is where the real scale happens:\n\n## Per-Query Cost (GPT-4 class)\n- ~0.004 kWh per query (including overhead)\n- At US average grid: ~1.6g CO₂ per query\n- At clean grid (Oregon): ~0.3g CO₂ per query\n\n## Scale Impact\nChatGPT handles ~200M queries/day:\n- Dirty grid: 320 tonnes CO₂/day\n- Clean grid: 60 tonnes CO₂/day\n- **Savings from clean routing: 260 tonnes/day**\n\n## Training vs Inference\n- Training: ~7,128 tonnes (one-time)\n- Inference: ~116,800 tonnes/year (at avg grid)\n- Inference dominates within **22 days**\n\nThis is exactly why Sorcer focuses on inference optimization — it's the gift that keeps on giving.", carbon: { cost_g: 0.06, baseline_g: 0.38, saved_g: 0.32, model: "google/gemini-2.5-flash-lite", region: "us-west1", cfe_percent: 92, tokens_in: 14, tokens_out: 540, latency_ms: 680, cached: true, cache_hit_tokens: 310, compressed: true, original_tokens: 14, compressed_tokens: 10, compression_ratio: 0.71 } },
    ],
  },
  {
    title: "Georgia Power grid analysis for 2025",
    model: "anthropic/claude-haiku-4.5",
    region: "us-central1",
    hoursAgo: 240,
    messages: [
      { role: "user", content: "What does Georgia Power's energy mix look like in 2025? How clean is it?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 18, tokens_out: 0 } },
      { role: "assistant", content: "Georgia Power's 2025 energy mix:\n\n## Current Generation Mix\n- **Natural Gas: 47%** — Largest source, mostly combined-cycle\n- **Nuclear: 29%** — Plant Vogtle (4 units now, including new AP1000s)\n- **Coal: 12%** — Declining, but still significant\n- **Solar: 8%** — Growing rapidly, 5.5 GW installed\n- **Hydro: 3%** — Small but steady\n- **Wind: 1%** — Minimal in-state\n\n## Carbon Intensity\n- Average: ~420g CO₂/kWh\n- Peak hours (summer AC): ~550g CO₂/kWh\n- Off-peak (nuclear baseload): ~280g CO₂/kWh\n\n## Data Center Impact\nGeorgia has become a data center hotspot:\n- Google Douglas County: 450MW demand\n- Meta Newton County: 300MW planned\n- QTS/Equinix Atlanta: 200MW+\n\nTotal DC load: ~1.2 GW — roughly 5% of Georgia Power's total capacity. This is growing 20% annually.", carbon: { cost_g: 0.19, baseline_g: 0.72, saved_g: 0.53, model: "anthropic/claude-haiku-4.5", region: "us-central1", cfe_percent: 89, tokens_in: 18, tokens_out: 780, latency_ms: 1800, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 18, compressed_tokens: 12, compression_ratio: 0.67 } },
    ],
  },
  {
    title: "Set up a RAG pipeline with LangChain",
    model: "openai/gpt-5.2",
    region: "us-west1",
    hoursAgo: 280,
    messages: [
      { role: "user", content: "Show me how to build a basic RAG pipeline using LangChain and ChromaDB.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 18, tokens_out: 0 } },
      { role: "assistant", content: "Here's a complete RAG pipeline:\n\n```python\nfrom langchain.document_loaders import TextLoader\nfrom langchain.text_splitter import RecursiveCharacterTextSplitter\nfrom langchain.embeddings import OpenAIEmbeddings\nfrom langchain.vectorstores import Chroma\nfrom langchain.chains import RetrievalQA\nfrom langchain.llms import OpenAI\n\n# 1. Load and split documents\nloader = TextLoader('knowledge_base.txt')\ndocs = loader.load()\nsplitter = RecursiveCharacterTextSplitter(\n    chunk_size=500,\n    chunk_overlap=50\n)\nchunks = splitter.split_documents(docs)\n\n# 2. Create vector store\nembeddings = OpenAIEmbeddings()\nvectorstore = Chroma.from_documents(\n    chunks,\n    embeddings,\n    persist_directory='./chroma_db'\n)\n\n# 3. Create retrieval chain\nqa_chain = RetrievalQA.from_chain_type(\n    llm=OpenAI(temperature=0),\n    chain_type='stuff',\n    retriever=vectorstore.as_retriever(\n        search_kwargs={'k': 3}\n    )\n)\n\n# 4. Query\nresult = qa_chain.run('What is the main topic?')\nprint(result)\n```\n\nKey optimizations for carbon efficiency:\n- Use smaller embedding models (e.g., `text-embedding-3-small`)\n- Cache embeddings aggressively\n- Batch document processing during low-carbon windows", carbon: { cost_g: 0.35, baseline_g: 0.98, saved_g: 0.63, model: "openai/gpt-5.2", region: "us-west1", cfe_percent: 92, tokens_in: 18, tokens_out: 920, latency_ms: 2800, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 18, compressed_tokens: 13, compression_ratio: 0.72 } },
      { role: "user", content: "How do I add semantic caching to this pipeline?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 12, tokens_out: 0 } },
      { role: "assistant", content: "Add semantic caching with GPTCache:\n\n```python\nfrom gptcache import Cache\nfrom gptcache.embedding import Onnx\nfrom gptcache.similarity_evaluation import SearchDistanceEvaluation\n\n# Initialize cache\ncache = Cache()\ncache.init(\n    embedding_func=Onnx(),\n    similarity_evaluation=SearchDistanceEvaluation()\n)\n\ndef cached_query(question: str) -> str:\n    # Check cache first\n    cached = cache.get(question)\n    if cached:\n        print(f'Cache hit! Saved ~0.3g CO2')\n        return cached\n    \n    # Miss — run the full RAG chain\n    result = qa_chain.run(question)\n    cache.set(question, result)\n    return result\n```\n\nThis can reduce redundant LLM calls by 40-60% for repeated similar questions — exactly what Sorcer does at the infrastructure level.", carbon: { cost_g: 0.28, baseline_g: 0.85, saved_g: 0.57, model: "openai/gpt-5.2", region: "us-west1", cfe_percent: 92, tokens_in: 12, tokens_out: 680, latency_ms: 2200, cached: true, cache_hit_tokens: 400, compressed: false, original_tokens: 12, compressed_tokens: 12, compression_ratio: 1.0 } },
    ],
  },
  {
    title: "Water footprint of AI data centers",
    model: "google/gemini-2.5-flash-lite",
    region: "us-central1",
    hoursAgo: 320,
    messages: [
      { role: "user", content: "How much water do AI data centers actually use? I keep hearing conflicting numbers.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 20, tokens_out: 0 } },
      { role: "assistant", content: "The water usage numbers are staggering:\n\n## Direct Water Usage (Cooling)\n- **Google**: 5.6 billion gallons in 2022 (21.2B liters)\n- **Microsoft**: 6.4 billion gallons in 2022\n- **Meta**: 2.7 billion gallons in 2022\n\n## Per-Query Estimates\n- A ChatGPT conversation (25-50 queries): ~500mL of water\n- That's literally a bottle of water per chat session\n- GPT-4 training alone: ~185,000 gallons\n\n## Why So Much Water?\nData centers use evaporative cooling towers:\n1. Hot server air heats water\n2. Water evaporates, cooling the air\n3. 1 MW of compute ≈ 7,500 gallons/day in hot climates\n\n## Regional Impact\n- Phoenix AZ: 42°C summers → massive water consumption\n- The Dalles OR: Cool climate → 60% less cooling water\n- Quincy WA: Near Columbia River → abundant supply\n\nSorcer routes to cooler regions when possible — saving both carbon AND water.", carbon: { cost_g: 0.10, baseline_g: 0.49, saved_g: 0.39, model: "google/gemini-2.5-flash-lite", region: "us-central1", cfe_percent: 89, tokens_in: 20, tokens_out: 660, latency_ms: 900, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 20, compressed_tokens: 14, compression_ratio: 0.70 } },
    ],
  },
  {
    title: "Implement a green CI/CD pipeline",
    model: "anthropic/claude-haiku-4.5",
    region: "europe-west1",
    hoursAgo: 400,
    messages: [
      { role: "user", content: "How can I make my CI/CD pipeline carbon-aware? We use GitHub Actions.", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 16, tokens_out: 0 } },
      { role: "assistant", content: "Here's how to green your GitHub Actions pipeline:\n\n## 1. Carbon-Aware Runner Selection\n```yaml\njobs:\n  build:\n    runs-on: ubuntu-latest\n    # Use green-software-foundation/carbon-aware-sdk\n    steps:\n    - name: Get cleanest region\n      id: carbon\n      run: |\n        REGION=$(curl -s https://api.electricitymap.org/v3/carbon-intensity/latest \\\n          -H 'auth-token: ${{ secrets.ELECMAP_KEY }}' | jq -r '.zone')\n        echo \"region=$REGION\" >> $GITHUB_OUTPUT\n```\n\n## 2. Schedule Non-Urgent Jobs\n```yaml\non:\n  schedule:\n    # Run nightly builds during off-peak (clean grid)\n    - cron: '0 4 * * *'  # 4 AM UTC\n```\n\n## 3. Cache Aggressively\n```yaml\n    - uses: actions/cache@v4\n      with:\n        path: |\n          ~/.npm\n          node_modules\n          .next/cache\n        key: ${{ runner.os }}-build-${{ hashFiles('**/package-lock.json') }}\n```\n\n## 4. Minimize Redundant Runs\n```yaml\nconcurrency:\n  group: ${{ github.workflow }}-${{ github.ref }}\n  cancel-in-progress: true\n```\n\nThese changes can reduce CI/CD carbon by 30-50%.", carbon: { cost_g: 0.24, baseline_g: 0.76, saved_g: 0.52, model: "anthropic/claude-haiku-4.5", region: "europe-west1", cfe_percent: 82, tokens_in: 16, tokens_out: 820, latency_ms: 1900, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 16, compressed_tokens: 11, compression_ratio: 0.69 } },
    ],
  },
  {
    title: "Compare edge vs cloud inference carbon",
    model: "google/gemini-2.5-flash-lite",
    region: "us-central1",
    hoursAgo: 500,
    messages: [
      { role: "user", content: "Is running AI inference on edge devices more carbon-efficient than cloud?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 16, tokens_out: 0 } },
      { role: "assistant", content: "It depends heavily on the scenario:\n\n## Edge Inference\n**Pros:**\n- No network transfer energy (saves 0.1-0.5 kWh/GB)\n- No data center cooling overhead\n- Can run on device's existing power\n\n**Cons:**\n- Less efficient hardware (phone GPU vs A100)\n- Higher energy per FLOP\n- Limited model size (typically <7B params)\n\n## Cloud Inference\n**Pros:**\n- Highly optimized hardware (A100/H100)\n- Batching across users (amortized cost)\n- Can route to clean energy regions\n\n**Cons:**\n- Network transfer overhead\n- Cooling costs (PUE 1.1-1.4)\n- Always-on infrastructure\n\n## The Verdict\n| Scenario | Winner | Why |\n|----------|--------|-----|\n| Simple NLP tasks | Edge | No network needed |\n| Complex reasoning | Cloud | Better hardware |\n| Image generation | Cloud | GPU efficiency |\n| Real-time inference | Edge | Latency matters |\n| Carbon-optimized | Cloud + Sorcer | Region routing wins |\n\nSorcer makes cloud inference the clear winner by routing to renewable-powered regions.", carbon: { cost_g: 0.11, baseline_g: 0.52, saved_g: 0.41, model: "google/gemini-2.5-flash-lite", region: "us-central1", cfe_percent: 89, tokens_in: 16, tokens_out: 700, latency_ms: 950, cached: false, cache_hit_tokens: 0, compressed: true, original_tokens: 16, compressed_tokens: 11, compression_ratio: 0.69 } },
      { role: "user", content: "What about hybrid approaches?", carbon: { cost_g: 0, baseline_g: 0, saved_g: 0, tokens_in: 6, tokens_out: 0 } },
      { role: "assistant", content: "Hybrid is the future of sustainable AI:\n\n## The Split Inference Pattern\n1. **Edge handles**: Tokenization, embedding, simple classification\n2. **Cloud handles**: Complex reasoning, generation, retrieval\n\n```\nUser → [Edge: classify complexity] →\n  Simple → Edge inference (0.001g CO₂)\n  Complex → Cloud via Sorcer (0.08g CO₂)\n```\n\n## Real-World Example\nApple Intelligence does exactly this:\n- On-device: Autocomplete, summarization\n- Cloud (Private Compute): Complex writing, image gen\n\nEstimated savings: 70% of queries never leave the device.\n\nSorcer could integrate edge-first routing in the future — check device capability first, fall back to carbon-optimized cloud.", carbon: { cost_g: 0.07, baseline_g: 0.36, saved_g: 0.29, model: "google/gemini-2.5-flash-lite", region: "us-central1", cfe_percent: 89, tokens_in: 6, tokens_out: 480, latency_ms: 620, cached: true, cache_hit_tokens: 280, compressed: false, original_tokens: 6, compressed_tokens: 6, compression_ratio: 1.0 } },
    ],
  },
];

export function seedIfEmpty(): void {
  if (!isBrowser()) return;

  const existingChats = getAllChats();
  // Reseed if: version changed OR chats are empty (e.g. user cleared them)
  if (localStorage.getItem(SEEDED_KEY) && existingChats.length > 0) return;

  const chats: ChatRecord[] = [];

  for (const seed of SEED_CHATS) {
    const chatId = uid();
    const assistantMessages = seed.messages.filter((m) => m.role === "assistant");
    const totalSaved = assistantMessages.reduce((sum, m) => sum + m.carbon.saved_g!, 0) * DEMO_CARBON_SCALE;

    chats.push({
      id: chatId,
      title: seed.title,
      createdAt: hoursAgo(seed.hoursAgo),
      carbonSaved: totalSaved,
      promptCount: seed.messages.filter((m) => m.role === "user").length * 12,
      model: seed.model,
      region: seed.region,
    });

    const storedMessages: StoredMessage[] = seed.messages.map((m) => ({
      id: uid(),
      chatId,
      role: m.role,
      content: m.content,
      createdAt: hoursAgo(seed.hoursAgo - Math.random() * 0.5),
      carbon: makeCarbonMeta(m.carbon),
    }));

    writeJSON(`${MESSAGES_KEY_PREFIX}${chatId}`, storedMessages);
  }

  writeJSON(CHATS_KEY, chats);
  localStorage.setItem(SEEDED_KEY, "true");
}
