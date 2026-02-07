"use client";

import { useState, useEffect } from "react";

const BACKEND_URL = "http://localhost:8000";

type RegionData = {
  location: string;
  cfe_percent: number;
  tier: string;
  available_models: { id: string; power_level: string; provider: string }[];
};

type RegionMap = Record<string, RegionData>;

export default function TestPage() {
  const [regionMap, setRegionMap] = useState<RegionMap>({});
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Build a flat list of unique model+region combos
  const modelOptions: { model: string; region: string; cfe: number; tier: string; provider: string; label: string }[] = [];
  for (const [regionId, data] of Object.entries(regionMap)) {
    for (const m of data.available_models) {
      modelOptions.push({
        model: m.id,
        region: regionId,
        cfe: data.cfe_percent,
        tier: data.tier,
        provider: m.provider,
        label: `${m.id} → ${regionId} (${data.cfe_percent}% CFE, ${data.tier})`,
      });
    }
  }
  // Sort by provider then CFE descending
  modelOptions.sort((a, b) => {
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    return b.cfe - a.cfe;
  });

  useEffect(() => {
    fetch(`${BACKEND_URL}/test/models`)
      .then((r) => r.json())
      .then((data) => {
        setRegionMap(data);
        // Auto-select first option
        const firstRegion = Object.keys(data)[0];
        if (firstRegion && data[firstRegion].available_models.length > 0) {
          setSelectedModel(data[firstRegion].available_models[0].id);
          setSelectedRegion(firstRegion);
        }
      })
      .catch((e) => setError(`Failed to load models: ${e.message}. Is the backend running on ${BACKEND_URL}?`));
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim() || !selectedModel || !selectedRegion) return;
    setLoading(true);
    setError("");
    setResponse("");
    setLatency(null);

    try {
      const res = await fetch(`${BACKEND_URL}/test/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model_id: selectedModel,
          location: selectedRegion,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResponse(data.response);
      setLatency(data.latency_seconds);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const tierColor = (tier: string) => {
    if (tier === "green") return "text-green-700 bg-green-100";
    if (tier === "mixed") return "text-yellow-700 bg-yellow-100";
    return "text-red-700 bg-red-100";
  };

  return (
    <div className="min-h-screen bg-parchment p-6 font-sans">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-oak">Model Test Console</h1>
        <p className="mb-6 text-oak/60 text-sm">
          Direct prompts to any model + region. No eco routing — raw LLM calls for testing.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Model/Region Selector */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-oak">Model + Region</label>
          <select
            className="w-full rounded-lg border border-oak/20 bg-white px-3 py-2 text-sm text-oak shadow-sm focus:border-oak/40 focus:outline-none"
            value={`${selectedModel}|${selectedRegion}`}
            onChange={(e) => {
              const [model, region] = e.target.value.split("|");
              setSelectedModel(model);
              setSelectedRegion(region);
            }}
          >
            {modelOptions.map((opt, i) => (
              <option key={i} value={`${opt.model}|${opt.region}`}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Selected info badges */}
        {selectedModel && selectedRegion && (
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-oak/10 px-3 py-1 font-mono">{selectedModel}</span>
            <span className="rounded-full bg-oak/10 px-3 py-1">{selectedRegion}</span>
            {regionMap[selectedRegion] && (
              <>
                <span className={`rounded-full px-3 py-1 font-semibold ${tierColor(regionMap[selectedRegion].tier)}`}>
                  {regionMap[selectedRegion].cfe_percent}% CFE
                </span>
                <span className="rounded-full bg-oak/10 px-3 py-1">
                  {regionMap[selectedRegion].location}
                </span>
              </>
            )}
          </div>
        )}

        {/* Prompt Input */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-oak">Prompt</label>
          <textarea
            className="w-full rounded-lg border border-oak/20 bg-white px-3 py-2 text-sm text-oak shadow-sm focus:border-oak/40 focus:outline-none"
            rows={4}
            placeholder="Type your prompt here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
          <p className="mt-1 text-xs text-oak/40">Cmd+Enter to send</p>
        </div>

        {/* Send Button */}
        <button
          className="mb-6 w-full rounded-lg bg-oak px-4 py-2.5 text-sm font-semibold text-parchment shadow-sm transition hover:bg-oak/90 disabled:opacity-50"
          disabled={loading || !prompt.trim()}
          onClick={handleSubmit}
        >
          {loading ? "Sending..." : "Send Prompt"}
        </button>

        {/* Response */}
        {(response || latency !== null) && (
          <div className="rounded-lg border border-oak/20 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-oak">Response</h2>
              {latency !== null && (
                <span className="rounded-full bg-oak/10 px-2 py-0.5 text-xs font-mono text-oak/70">
                  {latency}s
                </span>
              )}
            </div>
            <pre className="whitespace-pre-wrap text-sm text-oak/80 leading-relaxed">{response}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
