import type { AIProvider, AiConfig } from "@/modules/ai/types/ai-provider.types";
import { LlmAIProvider } from "@/modules/ai/services/llm.provider";

export function getAIProvider(config: AiConfig): AIProvider {
  return new LlmAIProvider(config);
}
