/**
 * 官方模型提供商配置
 * 包含 OpenAI、Google Gemini、Anthropic Claude 三大官方提供商
 */

import type { ModelProvider, ModelInfo } from './types';

/**
 * OpenAI 官方提供商配置
 */
export const OPENAI_PROVIDER: ModelProvider = {
  id: 'openai',
  name: 'OpenAI',
  type: 'openai',
  isOfficial: true,
  isCustom: false,
  requiresApiKey: true,
  website: 'https://platform.openai.com',
  models: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 2.50,
        output: 10.00,
      },
      description: 'GPT-4o 是 OpenAI 最新的旗舰模型，支持视觉输入和函数调用',
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 0.15,
        output: 0.60,
      },
      description: 'GPT-4o 的轻量版，更快速且更经济',
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 10.00,
        output: 30.00,
      },
      description: 'GPT-4 Turbo 提供更大的上下文窗口',
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      contextWindow: 8192,
      maxOutputTokens: 4096,
      supportsTools: true,
      pricing: {
        input: 30.00,
        output: 60.00,
      },
      description: '经典的 GPT-4 模型',
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      contextWindow: 16385,
      maxOutputTokens: 4096,
      supportsTools: true,
      pricing: {
        input: 0.50,
        output: 1.50,
      },
      description: '快速且经济的 GPT-3.5 模型',
    },
  ],
};

/**
 * Google Gemini 官方提供商配置
 */
export const GOOGLE_PROVIDER: ModelProvider = {
  id: 'google',
  name: 'Google Gemini',
  type: 'google',
  isOfficial: true,
  isCustom: false,
  requiresApiKey: true,
  website: 'https://ai.google.dev',
  models: [
    {
      id: 'gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash (Experimental)',
      provider: 'google',
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 0.00,  // 实验版免费
        output: 0.00,
      },
      description: 'Gemini 2.0 的实验版本，拥有超大上下文窗口（免费）',
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      contextWindow: 2097152,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 1.25,
        output: 5.00,
      },
      description: 'Gemini 1.5 Pro 拥有业界最大的上下文窗口',
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 0.075,
        output: 0.30,
      },
      description: 'Gemini 1.5 Flash 更快速且更经济',
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'google',
      contextWindow: 32760,
      maxOutputTokens: 8192,
      supportsTools: true,
      pricing: {
        input: 0.50,
        output: 1.50,
      },
      description: '经典的 Gemini Pro 模型',
    },
  ],
};

/**
 * Anthropic Claude 官方提供商配置
 */
export const ANTHROPIC_PROVIDER: ModelProvider = {
  id: 'anthropic',
  name: 'Anthropic Claude',
  type: 'anthropic',
  isOfficial: true,
  isCustom: false,
  requiresApiKey: true,
  website: 'https://www.anthropic.com',
  models: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet (New)',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 3.00,
        output: 15.00,
      },
      description: 'Claude 3.5 Sonnet 的最新版本，性能更强',
    },
    {
      id: 'claude-3-5-sonnet-20240620',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 3.00,
        output: 15.00,
      },
      description: 'Claude 3.5 Sonnet 平衡性能和成本',
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 15.00,
        output: 75.00,
      },
      description: 'Claude 3 Opus 是最强大的 Claude 模型',
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 3.00,
        output: 15.00,
      },
      description: 'Claude 3 Sonnet 平衡性能和速度',
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      pricing: {
        input: 0.25,
        output: 1.25,
      },
      description: 'Claude 3 Haiku 是最快速且最经济的 Claude 模型',
    },
  ],
};

/**
 * 所有官方提供商
 */
export const OFFICIAL_PROVIDERS: Record<string, ModelProvider> = {
  openai: OPENAI_PROVIDER,
  google: GOOGLE_PROVIDER,
  anthropic: ANTHROPIC_PROVIDER,
};

/**
 * 获取所有官方模型列表
 */
export function getAllOfficialModels(): ModelProvider[] {
  return Object.values(OFFICIAL_PROVIDERS);
}

/**
 * 根据 provider ID 获取提供商配置
 */
export function getProviderById(providerId: string): ModelProvider | undefined {
  return OFFICIAL_PROVIDERS[providerId];
}

/**
 * 根据 model ID 查找所属的提供商
 */
export function findProviderByModel(modelId: string): ModelProvider | undefined {
  for (const provider of Object.values(OFFICIAL_PROVIDERS)) {
    if (provider.models.some(m => m.id === modelId)) {
      return provider;
    }
  }
  return undefined;
}

/**
 * 获取模型信息
 */
export function getModelInfo(providerId: string, modelId: string): ModelInfo | undefined {
  const provider = getProviderById(providerId);
  if (!provider) return undefined;
  
  return provider.models.find(m => m.id === modelId);
}

/**
 * 获取模型的 Token 限制
 */
export function getModelTokenLimit(providerId: string, modelId: string): number {
  const modelInfo = getModelInfo(providerId, modelId);
  return modelInfo?.contextWindow || 4096; // 默认 4096
}