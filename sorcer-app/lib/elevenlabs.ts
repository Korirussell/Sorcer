// ElevenLabs Text-to-Speech API Client
// Docs: https://elevenlabs.io/docs/api-reference/text-to-speech

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

// Default voice: "Rachel" — clear, natural female voice
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export async function textToSpeech(options: TTSOptions): Promise<ArrayBuffer | null> {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn("[ElevenLabs] No API key found. Set NEXT_PUBLIC_ELEVENLABS_API_KEY in .env.local");
    return null;
  }

  const {
    text,
    voiceId = DEFAULT_VOICE_ID,
    modelId = "eleven_multilingual_v2",
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    });

    if (!response.ok) {
      console.error("[ElevenLabs] TTS request failed:", response.status, await response.text());
      return null;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error("[ElevenLabs] TTS error:", error);
    return null;
  }
}

export async function playTTS(text: string): Promise<void> {
  const audioData = await textToSpeech({ text });
  if (!audioData) return;

  const blob = new Blob([audioData], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  return new Promise((resolve) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.play().catch(() => resolve());
  });
}

export function isElevenLabsConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
}
