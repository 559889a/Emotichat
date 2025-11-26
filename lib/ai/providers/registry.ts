import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';

export type AIProvider = 'openai' | 'google' | 'anthropic';

export interface ModelConfig {
  provider: AIProvider;
  modelId: string;
  apiKey?: string;
  baseURL?: string;
}

export function createModel(config: ModelConfig) {
  if (!config.apiKey) {
    throw new Error(`Missing API key for provider ${config.provider}`);
  }

  switch (config.provider) {
    case 'openai': {
      const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      return openai(config.modelId);
    }

    case 'google': {
      const google = createGoogleGenerativeAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      return google(config.modelId);
    }

    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      return anthropic(config.modelId);
    }

    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

export function getDefaultModelConfig(): ModelConfig {
  return {
    provider: 'google',
    modelId: 'gemini-1.5-flash',
  };
}
