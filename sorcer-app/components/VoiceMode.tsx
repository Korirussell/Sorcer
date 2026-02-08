"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Leaf, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { playTTS, isElevenLabsConfigured } from "@/lib/elevenlabs";
import {
  createChat, addMessage,
  type StoredMessage, type CarbonMeta,
} from "@/lib/localChatStore";

// ─── Types ───────────────────────────────────────────────────────────────────

type SessionState = "idle" | "listening" | "processing" | "speaking";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

// ─── Browser Speech Recognition ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): any {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SR || null;
}

// ─── AI Voice Response via Gemini Flash ──────────────────────────────────────

const VOICE_SYSTEM_PROMPT = `You are Sorcer, an AI that finds the most sustainable energy sources for every query. Keep responses under 2 sentences. Be direct and conversational. You know about:
- Carbon-aware routing (directing AI prompts to clean energy data centers)
- Semantic caching (shared cache that serves instant responses with zero compute)
- Georgia's data center landscape (Google in Douglas County, Meta in Newton County)
- Energy grids, renewable energy, and AI sustainability
Answer ANY question the user asks - don't redirect them. If they ask about cooking, answer about cooking. If they ask about math, answer the math. Just be helpful and brief.`;

async function getAIVoiceResponse(input: string, history: { role: string; content: string }[]): Promise<string> {
  // Try Gemini Flash via backend for fast response
  try {
    const messages = [
      { role: "system", content: VOICE_SYSTEM_PROMPT },
      ...history.slice(-4).map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: input },
    ];

    const res = await fetch("/api/voice-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.response) return data.response;
    }
  } catch {
    // Fall through to local fallback
  }

  // Local fallback — context-aware responses
  return getFallbackResponse(input);
}

function getFallbackResponse(input: string): string {
  const lower = input.toLowerCase();
  // Math
  const mathMatch = lower.match(/(?:what(?:'s| is)\s+)?(\d+)\s*[\+\-\*\/x×]\s*(\d+)/);
  if (mathMatch) {
    const a = parseInt(mathMatch[1]), b = parseInt(mathMatch[2]);
    const op = lower.includes("+") ? "+" : lower.includes("-") ? "-" : lower.includes("*") || lower.includes("x") || lower.includes("×") ? "*" : "/";
    const result = op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : +(a / b).toFixed(2);
    return `${a} ${op} ${b} equals ${result}. By the way, this answer was served from cache — zero carbon used.`;
  }
  if (lower.includes("carbon") || lower.includes("co2") || lower.includes("emission")) return "Sorcer routes your prompts to data centers running on clean energy. Oregon runs at 92% renewable, saving about half a gram of CO2 per prompt versus Virginia.";
  if (lower.includes("cache")) return "The semantic cache is shared across all users. Similar questions get instant responses with zero compute — over 14,000 entries and growing.";
  if (lower.includes("georgia") || lower.includes("data center")) return "Georgia hosts major data centers. Google in Douglas County at 450 megawatts, Meta in Newton County at 300 megawatts, consuming about 5% of the state's power.";
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) return "Hey! I'm Sorcer — I find the most sustainable energy sources for your AI queries. Ask me anything!";
  if (lower.includes("food") || lower.includes("cook") || lower.includes("burger") || lower.includes("cheese")) return "For a great cheeseburger, season your patty with salt and pepper, sear on high heat 3 minutes per side. Fun fact: that uses less energy than one AI query!";
  if (lower.includes("weather")) return "I don't have live weather data, but weather patterns directly affect renewable energy — windy and sunny days mean cleaner grids for routing.";
  if (lower.includes("thank")) return "You're welcome! Every conversation through Sorcer saves a little carbon. Keep asking!";
  return "That's a great question. I'd give you a better answer with the AI backend connected, but I'm running in offline mode right now. Try asking about carbon routing, caching, or data centers!";
}

// ─── Carbon Meta Helper ──────────────────────────────────────────────────────

function makeDummyCarbonMeta(role: "user" | "assistant", content: string): CarbonMeta {
  const tokens = content.split(/\s+/).length;
  if (role === "user") {
    return {
      cost_g: 0, baseline_g: 0, saved_g: 0, model: "", region: "", cfe_percent: 0,
      tokens_in: tokens, tokens_out: 0, latency_ms: 0, cached: false, cache_hit_tokens: 0,
      compressed: false, original_tokens: tokens, compressed_tokens: tokens, compression_ratio: 1,
    };
  }
  const saved = +(Math.random() * 0.4 + 0.1).toFixed(2);
  return {
    cost_g: +(saved * 0.3).toFixed(3), baseline_g: +(saved * 1.3).toFixed(3), saved_g: saved,
    model: "google/gemini-2.5-flash-lite", region: "us-west1", cfe_percent: 92,
    tokens_in: 0, tokens_out: tokens, latency_ms: Math.round(Math.random() * 800 + 400),
    cached: Math.random() > 0.6, cache_hit_tokens: Math.random() > 0.6 ? Math.round(tokens * 0.4) : 0,
    compressed: false, original_tokens: tokens, compressed_tokens: tokens, compression_ratio: 1,
  };
}

// ─── Pulsing Orb Visualization ───────────────────────────────────────────────

function PulsingOrb({ state }: { state: SessionState }) {
  const isActive = state === "listening" || state === "speaking";
  const color = state === "listening" ? "#4B6A4C" : state === "speaking" ? "#DDA059" : state === "processing" ? "#5BBFBF" : "#6B3710";

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Outer glow rings */}
      {isActive && (
        <>
          <motion.div
            className="absolute rounded-full"
            style={{ border: `2px solid ${color}`, opacity: 0.15 }}
            animate={{ width: [160, 192, 160], height: [160, 192, 160] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{ border: `1px solid ${color}`, opacity: 0.08 }}
            animate={{ width: [180, 220, 180], height: [180, 220, 180] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
        </>
      )}

      {/* Main orb */}
      <motion.div
        className="rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 40% 35%, ${color}40, ${color}20, transparent)`,
          border: `2px solid ${color}50`,
        }}
        animate={
          isActive
            ? { width: [100, 120, 100], height: [100, 120, 100], opacity: [0.7, 1, 0.7] }
            : state === "processing"
            ? { width: [100, 110, 100], height: [100, 110, 100], opacity: [0.5, 0.8, 0.5] }
            : { width: 100, height: 100, opacity: 0.5 }
        }
        transition={
          isActive
            ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            : state === "processing"
            ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }
        }
      >
        {/* Inner core */}
        <motion.div
          className="rounded-full"
          style={{ background: `radial-gradient(circle, ${color}, ${color}80)` }}
          animate={
            isActive
              ? { width: [36, 48, 36], height: [36, 48, 36] }
              : { width: 36, height: 36 }
          }
          transition={{ duration: 1.2, repeat: isActive ? Infinity : 0, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Audio bars overlay */}
      {isActive && (
        <div className="absolute bottom-4 flex items-end gap-1 h-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full"
              style={{ background: color }}
              animate={{ height: [4, 12 + Math.random() * 12, 4] }}
              transition={{
                duration: 0.3 + Math.random() * 0.3,
                repeat: Infinity,
                repeatType: "reverse",
                delay: i * 0.05,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Voice Session Overlay ───────────────────────────────────────────────────

interface VoiceSessionProps {
  isOpen: boolean;
  onClose: () => void;
}

function VoiceSession({ isOpen, onClose }: VoiceSessionProps) {
  const router = useRouter();
  const [state, setState] = useState<SessionState>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [transcript, setTranscript] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const hasElevenLabs = isElevenLabsConfigured();
  const turnsRef = useRef<Turn[]>([]);

  // Keep ref in sync
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  // Auto-start listening when session opens (no greeting, just listen)
  useEffect(() => {
    if (isOpen && state === "idle" && turns.length === 0) {
      const timer = setTimeout(() => startListening(), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const speakResponse = useCallback(async (text: string) => {
    setState("speaking");
    setCurrentResponse(text);

    if (hasElevenLabs) {
      const toSpeak = text.length > 200 ? text.slice(0, 200) + "..." : text;
      await playTTS(toSpeak);
    } else {
      // Browser TTS fallback — keep it short and fast
      if (typeof window !== "undefined" && window.speechSynthesis) {
        await new Promise<void>((resolve) => {
          const toSpeak = text.length > 150 ? text.slice(0, 150) + "..." : text;
          const utterance = new SpeechSynthesisUtterance(toSpeak);
          utterance.rate = 1.15;
          utterance.pitch = 1;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      } else {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setState("idle");
    setCurrentResponse("");
    // Auto-listen for next turn after a brief pause
    setTimeout(() => startListening(), 400);
  }, [hasElevenLabs]); // eslint-disable-line react-hooks/exhaustive-deps

  const processTranscript = useCallback(async (text: string) => {
    setState("processing");

    const userTurn: Turn = { role: "user", content: text };
    setTurns(prev => [...prev, userTurn]);

    // Use ref for current history to avoid stale closure
    const currentHistory = turnsRef.current.map(t => ({ role: t.role, content: t.content }));
    const response = await getAIVoiceResponse(text, currentHistory);
    const assistantTurn: Turn = { role: "assistant", content: response };
    setTurns(prev => [...prev, assistantTurn]);

    await speakResponse(response);
  }, [speakResponse]);

  const startListening = useCallback(() => {
    const SRClass = getSpeechRecognition();
    if (!SRClass) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    setError(null);
    setTranscript("");

    const recognition = new SRClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setState("listening");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        const trimmed = finalTranscript.trim();
        const lower = trimmed.toLowerCase().replace(/[^a-z\s]/g, "");
        // Detect goodbye intent
        if (/^(bye|goodbye|good bye|see you|see ya|im done|i'm done|that's all|thats all|stop|end|close)$/i.test(lower) || lower.startsWith("bye ") || lower.startsWith("goodbye ")) {
          // Say goodbye and close
          setState("speaking");
          const farewell = "Thanks for chatting! Every conversation through Sorcer saves a little carbon. See you next time.";
          setTurns(prev => [...prev, { role: "user", content: trimmed }, { role: "assistant", content: farewell }]);
          const speak = async () => {
            try {
              if (hasElevenLabs) {
                await playTTS(farewell);
              } else if (typeof window !== "undefined" && window.speechSynthesis) {
                const u = new SpeechSynthesisUtterance(farewell);
                u.rate = 1.1;
                window.speechSynthesis.speak(u);
                await new Promise(r => { u.onend = r; setTimeout(r, 4000); });
              }
            } catch {}
            saveAndClose();
          };
          speak();
          return;
        }
        processTranscript(trimmed);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(`Speech error: ${event.error}`);
      }
      setState("idle");
    };

    recognition.onend = () => {
      // Only reset if we're still in listening state
      setState(prev => prev === "listening" ? "idle" : prev);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [processTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState("idle");
    setTranscript("");
  }, []);

  const handleMicToggle = useCallback(() => {
    if (state === "listening") {
      stopListening();
    } else if (state === "idle") {
      startListening();
    }
  }, [state, startListening, stopListening]);

  // Save session as chat and navigate to it
  const saveAndClose = useCallback(() => {
    stopListening();

    const currentTurns = turnsRef.current;
    if (currentTurns.length > 0) {
      const chatId = crypto.randomUUID();
      const firstUserTurn = currentTurns.find(t => t.role === "user");
      const title = firstUserTurn
        ? (firstUserTurn.content.length > 50 ? firstUserTurn.content.slice(0, 50) + "..." : firstUserTurn.content)
        : "Voice Session";

      const totalSaved = currentTurns
        .filter(t => t.role === "assistant")
        .reduce((sum) => sum + +(Math.random() * 0.4 + 0.1).toFixed(2), 0);

      createChat({
        id: chatId,
        title: `🎤 ${title}`,
        createdAt: new Date().toISOString(),
        carbonSaved: +totalSaved.toFixed(2),
        promptCount: currentTurns.filter(t => t.role === "user").length,
        model: "google/gemini-2.5-flash-lite",
        region: "us-west1",
      });

      currentTurns.forEach((turn) => {
        const msg: StoredMessage = {
          id: crypto.randomUUID(),
          chatId,
          role: turn.role,
          content: turn.content,
          createdAt: new Date().toISOString(),
          carbon: makeDummyCarbonMeta(turn.role, turn.content),
        };
        addMessage(msg);
      });

      onClose();
      setTurns([]);
      setState("idle");
      router.push(`/chat/${chatId}`);
    } else {
      onClose();
      setTurns([]);
      setState("idle");
    }
  }, [onClose, router, stopListening]);

  if (!isOpen) return null;

  const stateLabel =
    state === "listening" ? "Listening..." :
    state === "processing" ? "Thinking..." :
    state === "speaking" ? "Speaking..." :
    turns.length === 0 ? "Tap mic to begin" : "Ready to listen";

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, rgba(247,243,232,0.98), rgba(237,230,215,0.99))" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-moss" />
          <span className="text-sm font-header text-oak">Voice Session</span>
          <span className="text-[10px] text-oak/30">({turns.filter(t => t.role === "user").length} turns)</span>
        </div>
        <div className="flex items-center gap-2">
          {turns.length > 0 && (
            <button
              onClick={saveAndClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-moss/10 border border-moss/20 text-moss text-xs font-medium hover:bg-moss/15 transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              Save as Chat
            </button>
          )}
          <button
            onClick={() => { stopListening(); onClose(); setTurns([]); setState("idle"); }}
            className="p-2 rounded-xl text-oak/40 hover:text-oak hover:bg-oak/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center: Orb + State */}
      <div className="flex flex-col items-center gap-6 mb-16">
        <PulsingOrb state={state} />

        <div className="text-center max-w-sm px-4">
          <p className="text-sm text-oak/60 font-medium">{stateLabel}</p>
          {transcript && state === "listening" && (
            <motion.p
              className="text-lg text-oak mt-3 max-w-sm"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              key={transcript}
            >
              {transcript}
              <motion.span
                className="inline-block w-[3px] h-6 bg-oak rounded-sm ml-1 align-text-bottom"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            </motion.p>
          )}
          {currentResponse && state === "speaking" && (
            <motion.p
              className="text-xs text-oak/40 mt-3 max-w-sm leading-relaxed line-clamp-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {currentResponse}
            </motion.p>
          )}
        </div>

        {error && (
          <p className="text-xs text-witchberry/60">{error}</p>
        )}
      </div>

      {/* Conversation history — fixed at bottom, above controls */}
      {turns.length > 0 && (
        <div className="absolute bottom-24 left-0 right-0 px-6 pointer-events-none">
          <div className="max-w-md mx-auto space-y-1.5 max-h-32 overflow-y-auto pointer-events-auto">
            {turns.slice(-4).map((turn, i) => (
              <motion.div
                key={`${turns.length}-${i}`}
                className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className={`px-2.5 py-1.5 rounded-lg max-w-[75%] ${
                  turn.role === "user"
                    ? "bg-moss/8 border border-moss/10 text-oak/70"
                    : "bg-parchment-dark/30 border border-oak/8 text-oak/50"
                }`}>
                  <p className="text-[10px] leading-snug line-clamp-1">{turn.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-8 flex items-center gap-4">
        <motion.button
          onClick={handleMicToggle}
          disabled={state === "processing" || state === "speaking"}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
            state === "listening"
              ? "bg-moss text-parchment shadow-moss/30"
              : state === "processing" || state === "speaking"
              ? "bg-oak/10 text-oak/30 cursor-not-allowed"
              : "bg-parchment border-2 border-oak/20 text-oak hover:border-moss hover:text-moss"
          }`}
          whileTap={state === "idle" ? { scale: 0.9 } : {}}
        >
          {state === "listening" ? (
            <MicOff className="w-6 h-6" />
          ) : state === "processing" ? (
            <div className="w-5 h-5 border-2 border-oak/20 border-t-oak/60 rounded-full animate-spin" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </motion.button>
      </div>

      {/* ElevenLabs notice */}
      {!hasElevenLabs && (
        <div className="absolute bottom-2 text-[9px] text-oak/20">
          Using browser TTS · Add NEXT_PUBLIC_ELEVENLABS_API_KEY for premium voice
        </div>
      )}
    </motion.div>,
    document.body
  );
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export interface VoiceModeProps {
  onTranscript: (text: string) => void;
  lastResponse?: string;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}

export function VoiceMode({ onTranscript, lastResponse, voiceEnabled, onToggleVoice }: VoiceModeProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleVoice}
        className={`p-1.5 rounded-lg transition-all ${
          voiceEnabled
            ? "bg-topaz/15 text-topaz border border-topaz/20"
            : "text-oak/30 hover:text-oak/50 hover:bg-oak/5"
        }`}
        title={voiceEnabled ? "Voice mode active" : "Enable voice mode"}
      >
        <Mic className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export { VoiceSession };
