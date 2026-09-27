export type AiProviderName = "openai" | "gemini";

export const AI_PROVIDERS: readonly AiProviderName[] = ["openai", "gemini"] as const;

/** Used when the user hasn't picked a model — cheap, fast, and good enough for every prompt here. */
export const DEFAULT_AI_MODELS: Record<AiProviderName, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
};

/** Shown first in the model picker (and used as the list when the provider's model API is unreachable). */
export const RECOMMENDED_AI_MODELS: Record<AiProviderName, { id: string; label: string; note: string }[]> = {
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o mini", note: "Fast and cheap — recommended" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini", note: "Stronger reasoning, still cheap" },
    { id: "gpt-4o", label: "GPT-4o", note: "Higher quality, costs more" },
    { id: "gpt-4.1", label: "GPT-4.1", note: "Best quality, costs more" },
  ],
  gemini: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Fast and cheap — recommended" },
    { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", note: "Fastest and cheapest" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Best quality, slower and costs more" },
  ],
};

/** Model ids are passed into provider URLs/bodies — keep them to a safe character set. */
export const AI_MODEL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,79}$/;

export const OPENAI_API_BASE = "https://api.openai.com/v1";
export const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
