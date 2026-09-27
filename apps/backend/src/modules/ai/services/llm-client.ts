import {
  GEMINI_API_BASE,
  OPENAI_API_BASE,
  RECOMMENDED_AI_MODELS,
  type AiProviderName,
} from "@/constants/ai";
import type { AiConfig } from "@/modules/ai/types/ai-provider.types";

export interface LlmRequest {
  system: string;
  user: string;
  /** Ask for a single JSON object back. */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

/** One chat-style completion against whichever provider the user picked. Returns the model's text,
 * or null on any failure — callers always have a non-AI fallback. */
export interface LlmClient {
  complete(request: LlmRequest): Promise<string | null>;
}

/** OpenAI reasoning models (o-series, gpt-5) reject custom temperature. */
function isOpenAiReasoningModel(model: string): boolean {
  return /^(o\d|gpt-5)/i.test(model);
}

class OpenAiClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(request: LlmRequest): Promise<string | null> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
    };
    if (request.json) body.response_format = { type: "json_object" };
    if (request.temperature !== undefined && !isOpenAiReasoningModel(this.model)) {
      body.temperature = request.temperature;
    }
    if (request.maxTokens !== undefined && !isOpenAiReasoningModel(this.model)) {
      body.max_completion_tokens = request.maxTokens;
    }

    try {
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }
}

class GeminiClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(request: LlmRequest): Promise<string | null> {
    const generationConfig: Record<string, unknown> = {};
    if (request.json) generationConfig.responseMimeType = "application/json";
    if (request.temperature !== undefined) generationConfig.temperature = request.temperature;
    // No maxOutputTokens: Gemini 2.5 "thinking" spends from the same budget, so a tight cap can
    // leave an empty answer. Prompts here already ask for short output.

    try {
      const response = await fetch(`${GEMINI_API_BASE}/models/${encodeURIComponent(this.model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: "user", parts: [{ text: request.user }] }],
          generationConfig,
        }),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
      };
      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .filter((p) => !p.thought)
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      return text || null;
    } catch {
      return null;
    }
  }
}

export function createLlmClient(config: AiConfig): LlmClient {
  return config.provider === "gemini"
    ? new GeminiClient(config.apiKey, config.model)
    : new OpenAiClient(config.apiKey, config.model);
}

/** Parses a model's JSON answer, tolerating ```json fences some models add anyway. */
export function parseJsonAnswer<T>(text: string | null): T | null {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export interface AiModelOption {
  id: string;
  label: string;
  note?: string;
  recommended: boolean;
}

/** Chat-capable models the key can use, recommended ones first. Falls back to the curated list when
 * the provider's model listing can't be reached (bad key, network). */
export async function listAvailableModels(
  provider: AiProviderName,
  apiKey: string,
): Promise<{ models: AiModelOption[]; live: boolean }> {
  const recommended = RECOMMENDED_AI_MODELS[provider].map((m) => ({ ...m, recommended: true }));

  let liveIds: { id: string; label: string }[] | null = null;
  try {
    if (provider === "openai") {
      const response = await fetch(`${OPENAI_API_BASE}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (response.ok) {
        const data = (await response.json()) as { data?: { id: string }[] };
        liveIds = (data.data ?? [])
          .map((m) => m.id)
          // Chat models only — skip embeddings, audio, image, moderation, realtime, search variants.
          .filter((id) => /^(gpt-|o\d|chatgpt-)/.test(id))
          .filter((id) => !/(audio|realtime|transcribe|tts|image|search|embedding|instruct|codex)/.test(id))
          .map((id) => ({ id, label: id }));
      }
    } else {
      const response = await fetch(`${GEMINI_API_BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": apiKey } });
      if (response.ok) {
        const data = (await response.json()) as {
          models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[];
        };
        liveIds = (data.models ?? [])
          .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m) => ({ id: m.name.replace(/^models\//, ""), label: m.displayName ?? m.name }))
          .filter((m) => /^gemini-/.test(m.id) && !/(embedding|image|tts|audio|live)/.test(m.id));
      }
    }
  } catch {
    liveIds = null;
  }

  if (!liveIds) return { models: recommended, live: false };

  const available = new Set(liveIds.map((m) => m.id));
  const others = liveIds
    .filter((m) => !recommended.some((r) => r.id === m.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => ({ id: m.id, label: m.label, recommended: false }));

  return {
    // Recommended models this key can actually use, then everything else it has access to.
    models: [...recommended.filter((m) => available.has(m.id)), ...others],
    live: true,
  };
}
