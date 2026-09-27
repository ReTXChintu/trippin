import type { AIProvider } from "@/modules/ai/types/ai-provider.types";
import { OpenAIProvider } from "@/modules/ai/services/openai.provider";

export function getAIProvider(apiKey: string): AIProvider {
  return new OpenAIProvider(apiKey);
}
