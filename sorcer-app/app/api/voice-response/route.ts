import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const userMessage = messages.filter((m: { role: string }) => m.role === "user").pop();
    if (!userMessage) {
      return NextResponse.json({ error: "no user message" }, { status: 400 });
    }

    // Try the backend orchestrator for a real AI response
    try {
      const res = await fetch(`${BACKEND_URL}/orchestrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `[Voice mode - respond in 1-2 short sentences only] ${userMessage.content}`,
          user_id: "sorcer-voice-user",
          project_id: "voice-session",
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          // Trim to 2 sentences max for voice
          const sentences = data.response.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
          return NextResponse.json({ response: sentences });
        }
      }
    } catch {
      // Backend not available, fall through
    }

    // Fallback: return empty so client uses local fallback
    return NextResponse.json({ response: null });
  } catch {
    return NextResponse.json({ response: null });
  }
}
